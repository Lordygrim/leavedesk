"use server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { adminWhere, isAdminUser, requireAdmin, requireUser } from "./dal";
import { createSession, destroySession } from "./session";
import { audit, balance, notify, offFor, quarterAllowance, quarterUsage } from "./leave";
import { isHrRole } from "./defaults";
import { createOrganization } from "./org";
import { getPendingGoogle } from "./google";
import { baseUrl } from "./url";
import { sendEmail } from "./mail";
import { fmt, fmtDay, quarterDays, reportBack, todayNairobi, workingDays } from "./dates";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const days0to260 = (n: number) => Number.isInteger(n) && n >= 0 && n <= 260;

// ---------- sign in, sign up, sign out ----------
export async function signIn(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const u = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!u || !u.active || !(await bcrypt.compare(String(fd.get("password") ?? ""), u.passwordHash))) return redirect("/sign-in?error=1");
  const admin = isAdminUser(u);
  await createSession(u.id, admin);
  return redirect(admin ? "/admin" : "/home");
}
export async function signOut() { await destroySession(); redirect("/sign-in"); }

export async function signUp(fd: FormData) {
  const orgName = str(fd, "org"), name = str(fd, "name"), title = str(fd, "title"), email = str(fd, "email").toLowerCase(), pw = String(fd.get("password") ?? "");
  const q = [1, 2, 3, 4].map((i) => Math.round(Number(fd.get(`q${i}`))));
  const E = (c: string) => `/sign-up?error=${c}`;
  if (!orgName || !name || !title || !email.includes("@")) return redirect(E("invalid"));
  if (pw.length < 8) return redirect(E("short"));
  if (!q.every(days0to260)) return redirect(E("days"));
  if (await prisma.user.findUnique({ where: { email } })) return redirect(E("exists"));
  const owner = await createOrganization({ orgName, name, title, email, passwordHash: await bcrypt.hash(pw, 10), hasPassword: true, googleId: null, q });
  await createSession(owner.id, true);
  return redirect("/admin/policies?welcome=1");
}

// Second step of "Sign up with Google": the Google email is already verified, so only the organization details are asked.
export async function signUpWithGoogle(fd: FormData) {
  const g = await getPendingGoogle();
  if (!g) return redirect("/sign-up?error=expired");
  const orgName = str(fd, "org"), name = str(fd, "name"), title = str(fd, "title");
  const q = [1, 2, 3, 4].map((i) => Math.round(Number(fd.get(`q${i}`))));
  const E = (c: string) => `/sign-up?google=1&error=${c}`;
  if (!orgName || !name || !title) return redirect(E("invalid"));
  if (!q.every(days0to260)) return redirect(E("days"));
  if (await prisma.user.findUnique({ where: { email: g.email } })) return redirect("/sign-in?error=exists");
  const owner = await createOrganization({ orgName, name, title, email: g.email, passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10), hasPassword: false, googleId: g.sub, q });
  (await cookies()).delete("g_pending");
  await createSession(owner.id, true);
  return redirect("/admin/policies?welcome=1");
}

// ---------- employee actions ----------
export async function submitRequest(fd: FormData) {
  const u = await requireUser();
  const typeId = str(fd, "typeId"), start = str(fd, "start"), end = str(fd, "end"), note = str(fd, "note");
  const E = (c: string) => `/request?error=${c}`;
  if (!note) return redirect(E("note"));
  if (!ISO.test(start) || !ISO.test(end) || end < start) return redirect(E("dates"));
  if (start < todayNairobi()) return redirect(E("past"));
  const type = await prisma.leaveType.findFirst({ where: { id: typeId, orgId: u.orgId }, include: { org: true } });
  if (!type) return redirect(E("dates"));
  const off = await offFor(u.orgId);
  const days = workingDays(start, end, off);
  if (days < 1) return redirect(E("nodays"));
  if (days > (await balance(u.id, typeId)).left) return redirect(E("balance"));
  if (type.quarterly) {
    const used = await quarterUsage(u.id, type.id, off);
    for (const [k, v] of Object.entries(quarterDays(start, end, off)))
      if ((used[k] ?? 0) + v > quarterAllowance(type.org, Number(k.slice(-1)))) return redirect(`${E("quarter")}&q=${k}`);
  }
  const clash = await prisma.leaveRequest.findFirst({ where: { userId: u.id, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: end }, endDate: { gte: start } } });
  if (clash) return redirect(E("overlap"));
  const auto = u.isOwner; // the owner does not need anyone else's approval
  await prisma.leaveRequest.create({ data: { userId: u.id, typeId, startDate: start, endDate: end, workingDays: days, reportBackDate: reportBack(end, off), note,
    status: auto ? "APPROVED" : "PENDING", decidedBy: auto ? u.name : null, decidedAt: auto ? new Date() : null } });
  if (!auto) { // the person's supervisor (if set) and the admins decide
    const ids = new Set<string>(u.managerId ? [u.managerId] : []);
    for (const a of await prisma.user.findMany({ where: { orgId: u.orgId, active: true, ...adminWhere } })) ids.add(a.id);
    ids.delete(u.id);
    for (const id of ids) await notify(id, "New leave request", `${u.name} (${u.role.name}) requested ${type.name} leave, ${fmt(start)} to ${fmt(end)} (${days} working days).`);
  }
  await audit(u.orgId, u.name, auto ? "Recorded leave (auto-approved)" : "Submitted request", `${type.name}, ${start} to ${end}`);
  return redirect(auto ? "/home?sent=auto" : "/home?sent=1");
}
export async function cancelRequest(fd: FormData) {
  const u = await requireUser();
  const id = str(fd, "id");
  const r = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!r || r.userId !== u.id || r.status !== "PENDING") return;
  await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit(u.orgId, u.name, "Cancelled request", `${r.startDate} to ${r.endDate}`);
  revalidatePath("/my-leave");
}
export async function markAllRead() {
  const u = await requireUser();
  await prisma.notification.updateMany({ where: { userId: u.id, read: false }, data: { read: true } });
  revalidatePath("/alerts");
}
export async function changePassword(fd: FormData) {
  const u = await requireUser();
  const cur = String(fd.get("current") ?? ""), next = String(fd.get("next") ?? ""), again = String(fd.get("again") ?? "");
  if (u.hasPassword && !(await bcrypt.compare(cur, u.passwordHash))) return redirect("/profile?error=wrong");
  if (next.length < 8) return redirect("/profile?error=short");
  if (next !== again) return redirect("/profile?error=mismatch");
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(next, 10), hasPassword: true } });
  await audit(u.orgId, u.name, "Changed password", "");
  return redirect("/profile?saved=1");
}

export async function changeEmail(fd: FormData) {
  const u = await requireUser();
  const email = str(fd, "email").toLowerCase(), pw = String(fd.get("password") ?? "");
  if (!email.includes("@") || email.length > 200) return redirect("/profile?error=email");
  if (u.hasPassword && !(await bcrypt.compare(pw, u.passwordHash))) return redirect("/profile?error=wrongemailpw");
  if (email !== u.email) {
    if (await prisma.user.findUnique({ where: { email } })) return redirect("/profile?error=emailtaken");
    await prisma.user.update({ where: { id: u.id }, data: { email } });
    await audit(u.orgId, u.name, "Changed work email", `${u.email} to ${email}`);
  }
  return redirect("/profile?emailsaved=1");
}

// ---------- forgot password ----------
export async function requestPasswordReset(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const u = await prisma.user.findUnique({ where: { email } });
  if (u && u.active) {
    const recent = await prisma.passwordReset.findFirst({ where: { userId: u.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
    if (!recent) { // at most one email a minute per person
      const token = randomBytes(32).toString("hex");
      await prisma.passwordReset.create({ data: { userId: u.id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
      await sendEmail(u.email, "Reset your LeaveDesk password", `Hello ${u.name},\n\nUse this link to choose a new password. It works once and expires in one hour:\n${await baseUrl()}/reset-password?token=${token}\n\nIf you did not ask for this, you can ignore this email.`);
      await audit(u.orgId, u.name, "Requested a password reset", "");
    }
  }
  return redirect("/forgot-password?sent=1"); // same answer whether or not the email exists
}
export async function resetPassword(fd: FormData) {
  const token = str(fd, "token"), next = String(fd.get("next") ?? ""), again = String(fd.get("again") ?? "");
  const back = (c: string) => `/reset-password?token=${encodeURIComponent(token)}&error=${c}`;
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: sha(token) }, include: { user: true } });
  if (!row || row.expiresAt < new Date() || !row.user.active) return redirect("/reset-password?error=invalid");
  if (next.length < 8) return redirect(back("short"));
  if (next !== again) return redirect(back("mismatch"));
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(next, 10), hasPassword: true } }),
    prisma.passwordReset.deleteMany({ where: { userId: row.userId } }),
  ]);
  await audit(row.user.orgId, row.user.name, "Reset password", "");
  return redirect("/sign-in?reset=1");
}

// ---------- approvals ----------
export async function decideRequest(fd: FormData) {
  const me = await requireUser();
  const id = str(fd, "id"), decision = str(fd, "decision"), reason = str(fd, "reason");
  const base = str(fd, "from") === "approvals" ? "/approvals" : "/admin/requests";
  if (decision !== "APPROVED" && decision !== "DECLINED") return redirect(`${base}/${id}?error=invalid`);
  const r = await prisma.leaveRequest.findFirst({ where: { id, user: { orgId: me.orgId } }, include: { user: true, type: true } });
  // Admins can decide anyone's request. A supervisor can decide the requests of the people who report to them.
  if (!r || !(isAdminUser(me) || r.user.managerId === me.id)) return redirect("/home");
  if (r.status !== "PENDING") return redirect(base);
  const back = `${base}/${id}?error=`;
  if (r.userId === me.id) return redirect(back + "self");
  if (decision === "DECLINED" && !reason) return redirect(back + "reason");
  if (decision === "APPROVED" && r.workingDays > (await balance(r.userId, r.typeId)).left) return redirect(back + "balance");
  await prisma.leaveRequest.update({ where: { id }, data: { status: decision, decisionReason: reason || null, decidedBy: me.name, decidedAt: new Date() } });
  const ok = decision === "APPROVED";
  try {
    await notify(r.userId, ok ? "Leave approved" : "Leave declined", ok
      ? `Your ${r.type.name} leave, ${fmt(r.startDate)} to ${fmt(r.endDate)}, was approved. Back at work ${fmtDay(r.reportBackDate)}.`
      : `Your request for ${fmt(r.startDate)} to ${fmt(r.endDate)} was declined: ${reason}`);
    await audit(me.orgId, me.name, ok ? "Approved request" : "Declined request", `${r.user.name}, ${r.startDate} to ${r.endDate}`);
  } catch (e) { console.error("The decision was saved, but notifying the employee failed:", e); }
  revalidatePath("/admin");
  revalidatePath("/approvals");
  return redirect(`${base}?done=${ok ? "approved" : "declined"}`);
}
export async function recordReturn(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id"), date = str(fd, "date");
  if (!ISO.test(date)) return;
  const r = await prisma.leaveRequest.findFirst({ where: { id, user: { orgId: admin.orgId } }, include: { user: true } });
  if (!r) return;
  await prisma.leaveRequest.update({ where: { id }, data: { actualReturnDate: date } });
  await audit(admin.orgId, admin.name, "Recorded return", `${r.user.name} reported back ${date}`);
  revalidatePath("/admin");
}

// ---------- people and admin access ----------
export async function addEmployee(fd: FormData) {
  const admin = await requireAdmin();
  const name = str(fd, "name"), email = str(fd, "email").toLowerCase(), roleId = str(fd, "roleId"), department = str(fd, "department"), pw = String(fd.get("password") ?? "");
  const E = (c: string) => `/admin/employees?error=${c}`;
  if (!name || !email.includes("@") || !department) return redirect(E("invalid"));
  if (pw.length < 8) return redirect(E("short"));
  if (!(await prisma.role.findFirst({ where: { id: roleId, orgId: admin.orgId } }))) return redirect(E("invalid"));
  if (await prisma.user.findUnique({ where: { email } })) return redirect(E("exists"));
  await prisma.user.create({ data: { orgId: admin.orgId, name, email, roleId, department, passwordHash: await bcrypt.hash(pw, 10) } });
  await audit(admin.orgId, admin.name, "Added employee", `${name} (${email})`);
  return redirect("/admin/employees");
}
export async function updateEmployee(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id"), roleId = str(fd, "roleId"), department = str(fd, "department"), email = str(fd, "email").toLowerCase(), managerId = str(fd, "managerId"), active = fd.get("active") === "on", pw = String(fd.get("password") ?? "");
  const back = `/admin/employees/${id}?error=`;
  const target = await prisma.user.findFirst({ where: { id, orgId: admin.orgId } });
  const role = await prisma.role.findFirst({ where: { id: roleId, orgId: admin.orgId } });
  if (!role || !target || !department || !email.includes("@")) return redirect(back + "invalid");
  if (await prisma.user.findFirst({ where: { email, id: { not: id } } })) return redirect(back + "emailtaken");
  if (managerId && !(await prisma.user.findFirst({ where: { id: managerId, orgId: admin.orgId, active: true, NOT: { id } } }))) return redirect(back + "invalid");
  if (pw && pw.length < 8) return redirect(back + "short");
  if (id === admin.id && !active) return redirect(back + "self");
  const stillAdmin = target.isOwner || target.isAdmin || role.grantsAdmin;
  const others = await prisma.user.count({ where: { orgId: admin.orgId, id: { not: id }, active: true, ...adminWhere } });
  if (others + (active && stillAdmin ? 1 : 0) < 1) return redirect(back + "lastadmin");
  await prisma.user.update({ where: { id }, data: { roleId, department, email, managerId: managerId || null, active, ...(pw ? { passwordHash: await bcrypt.hash(pw, 10) } : {}) } });
  await audit(admin.orgId, admin.name, "Updated employee", `${target.name}: ${role.name}, ${department}, ${email}, ${active ? "active" : "deactivated"}${pw ? ", password reset" : ""}`);
  return redirect("/admin/employees");
}
// The owner or any other admin can give or take away admin access. HR roles carry it automatically; the owner always has it.
export async function setAdminAccess(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id"), grant = fd.get("grant") === "1";
  const back = `/admin/employees/${id}?error=`;
  const t = await prisma.user.findFirst({ where: { id, orgId: admin.orgId }, include: { role: true } });
  if (!t) return redirect("/admin/employees");
  if (t.isOwner) return redirect(back + "owner");
  if (!grant) {
    if (t.role.grantsAdmin) return redirect(back + "hrrole");
    const others = await prisma.user.count({ where: { orgId: admin.orgId, id: { not: id }, active: true, ...adminWhere } });
    if (others < 1) return redirect(back + "lastadmin");
  }
  await prisma.user.update({ where: { id }, data: { isAdmin: grant } });
  await audit(admin.orgId, admin.name, grant ? "Granted admin access" : "Rescinded admin access", t.name);
  await notify(id, grant ? "You now have admin access" : "Your admin access was removed", `${admin.name} ${grant ? "gave you access to" : "removed your access to"} the HR dashboard.`);
  return redirect(`/admin/employees/${id}?done=${grant ? "granted" : "rescinded"}`);
}
export async function deleteEmployee(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id"), confirm = str(fd, "confirm").toLowerCase();
  const back = `/admin/employees/${id}?error=`;
  const target = await prisma.user.findFirst({ where: { id, orgId: admin.orgId }, include: { role: true } });
  if (!target) return redirect("/admin/employees");
  if (id === admin.id) return redirect(back + "selfdelete");
  if (target.isOwner) return redirect(back + "ownerdelete");
  if (confirm !== target.name.toLowerCase()) return redirect(back + "confirm");
  const others = await prisma.user.count({ where: { orgId: admin.orgId, id: { not: id }, active: true, ...adminWhere } });
  if (target.active && (target.isAdmin || target.role.grantsAdmin) && others < 1) return redirect(back + "lastadmin");
  const removed = await prisma.leaveRequest.count({ where: { userId: id } });
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.leaveRequest.deleteMany({ where: { userId: id } }),
    prisma.passwordReset.deleteMany({ where: { userId: id } }),
    prisma.user.updateMany({ where: { managerId: id }, data: { managerId: null } }),
    prisma.user.delete({ where: { id } }),
  ]);
  await audit(admin.orgId, admin.name, "Deleted employee", `${target.name} (${target.email}), ${target.role.name}; ${removed} leave requests removed`);
  return redirect("/admin/employees?deleted=1");
}

// ---------- policies: off days, leave types, holidays, roles ----------
export async function updateOrganization(fd: FormData) {
  const admin = await requireAdmin();
  const name = str(fd, "name"), q = [1, 2, 3, 4].map((i) => Math.round(Number(fd.get(`q${i}`))));
  if (!name || !q.every(days0to260)) return redirect("/admin/policies?error=org");
  await prisma.organization.update({ where: { id: admin.orgId }, data: { name, q1Days: q[0], q2Days: q[1], q3Days: q[2], q4Days: q[3] } });
  await prisma.leaveType.updateMany({ where: { orgId: admin.orgId, quarterly: true }, data: { daysPerYear: q.reduce((a, b) => a + b, 0) } });
  await audit(admin.orgId, admin.name, "Changed leave days per quarter", `Q1 ${q[0]}, Q2 ${q[1]}, Q3 ${q[2]}, Q4 ${q[3]}`);
  return redirect("/admin/policies?saved=1");
}
export async function addClosure(fd: FormData) {
  const admin = await requireAdmin();
  const name = str(fd, "name"), from = str(fd, "from"), to = str(fd, "to");
  if (!name || !ISO.test(from) || !ISO.test(to)) return redirect("/admin/policies?error=closure");
  await prisma.closure.create({ data: { orgId: admin.orgId, name, startMd: from.slice(5), endMd: to.slice(5) } });
  await audit(admin.orgId, admin.name, "Added mandatory leave period", `${name}: ${from.slice(5)} to ${to.slice(5)} every year`);
  return redirect("/admin/policies");
}
export async function deleteClosure(fd: FormData) {
  const admin = await requireAdmin();
  const c = await prisma.closure.findFirst({ where: { id: str(fd, "id"), orgId: admin.orgId } });
  if (!c) return;
  await prisma.closure.delete({ where: { id: c.id } });
  await audit(admin.orgId, admin.name, "Removed mandatory leave period", c.name);
  revalidatePath("/admin/policies");
}
export async function updateLeaveType(fd: FormData) {
  const admin = await requireAdmin();
  const days = Math.round(Number(fd.get("days")));
  if (!days0to260(days)) return;
  const r = await prisma.leaveType.updateMany({ where: { id: str(fd, "id"), orgId: admin.orgId, quarterly: false }, data: { daysPerYear: days } });
  if (r.count) await audit(admin.orgId, admin.name, "Changed leave type", `${days} days a year`);
  revalidatePath("/admin/policies");
}
export async function addLeaveType(fd: FormData) {
  const admin = await requireAdmin();
  const name = str(fd, "name"), days = Math.round(Number(fd.get("days")));
  if (!name || !days0to260(days)) return redirect("/admin/policies?error=type");
  if (await prisma.leaveType.findFirst({ where: { orgId: admin.orgId, name } })) return redirect("/admin/policies?error=typeexists");
  await prisma.leaveType.create({ data: { orgId: admin.orgId, name, daysPerYear: days } });
  await audit(admin.orgId, admin.name, "Added leave type", `${name}: ${days} days a year`);
  return redirect("/admin/policies");
}
export async function addHoliday(fd: FormData) {
  const admin = await requireAdmin();
  const date = str(fd, "date"), name = str(fd, "name");
  if (!ISO.test(date) || !name) return redirect("/admin/policies?error=holiday");
  await prisma.holiday.upsert({ where: { orgId_date: { orgId: admin.orgId, date } }, update: { name }, create: { orgId: admin.orgId, date, name } });
  await audit(admin.orgId, admin.name, "Added holiday", `${name}, ${date}`);
  return redirect("/admin/policies");
}
export async function deleteHoliday(fd: FormData) {
  const admin = await requireAdmin();
  const h = await prisma.holiday.findFirst({ where: { id: str(fd, "id"), orgId: admin.orgId } });
  if (!h) return;
  await prisma.holiday.delete({ where: { id: h.id } });
  await audit(admin.orgId, admin.name, "Removed holiday", `${h.name}, ${h.date}`);
  revalidatePath("/admin/policies");
}
export async function addRole(fd: FormData) {
  const admin = await requireAdmin();
  const name = str(fd, "name");
  if (!name) return redirect("/admin/policies?error=role");
  if (await prisma.role.findFirst({ where: { orgId: admin.orgId, name } })) return redirect("/admin/policies?error=roleexists");
  await prisma.role.create({ data: { orgId: admin.orgId, name, grantsAdmin: isHrRole(name) } });
  await audit(admin.orgId, admin.name, "Added role", name + (isHrRole(name) ? " (HR: admin access)" : ""));
  return redirect("/admin/policies");
}
export async function deleteRole(fd: FormData) {
  const admin = await requireAdmin();
  const r = await prisma.role.findFirst({ where: { id: str(fd, "id"), orgId: admin.orgId }, include: { _count: { select: { users: true } } } });
  if (!r) return;
  if (r._count.users > 0) return redirect("/admin/policies?error=roleinuse");
  await prisma.role.delete({ where: { id: r.id } });
  await audit(admin.orgId, admin.name, "Removed role", r.name);
  revalidatePath("/admin/policies");
}
