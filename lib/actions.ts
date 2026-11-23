"use server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { adminWhere, isAdminUser, requireAdmin, requireUser } from "./dal";
import { createSession, destroySession } from "./session";
import { audit, balance, notify, offFor, periodUsage } from "./leave";
import { PERIODS, allowanceOf, daysByPeriod, isPeriod, isRule, totalDays, violation, type Allowance } from "./allowance";
import { isHrRole } from "./defaults";
import { cleanName, createOrganization, findRole, orgNameTaken } from "./org";
import { getPendingAccount, pendingCookieOptions, pendingToken } from "./signup";
import { baseUrl } from "./url";
import { sendEmail } from "./mail";
import { fmt, fmtDay, reportBack, todayNairobi, workingDays } from "./dates";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const days0to260 = (n: number) => Number.isInteger(n) && n >= 0 && n <= 260;
// Reads the leave allowance fields of a form: how often, when it can be taken, and the days for each period (d0, d1, ...).
function parseAllowance(fd: FormData): Allowance | null {
  const period = str(fd, "period"), rule = str(fd, "rule");
  if (!isPeriod(period)) return null;
  const days = Array.from({ length: PERIODS[period].count }, (_, i) => Math.round(Number(fd.get(`d${i}`))));
  if (!days.every(days0to260)) return null;
  return { period, rule: period === "YEARLY" || !isRule(rule) ? "WINDOW" : rule, days };
}

// ---------- sign in, sign up, sign out ----------
export async function signIn(fd: FormData) {
  const email = str(fd, "email").toLowerCase(), pw = String(fd.get("password") ?? "");
  const u = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!u) {
    // Not a member of an organization yet? They may have signed up and not finished: let them carry on instead of signing up again.
    const pend = await prisma.pendingAccount.findUnique({ where: { email } });
    if (pend?.passwordHash && (await bcrypt.compare(pw, pend.passwordHash))) {
      if (!pend.confirmedAt) return redirect("/sign-in?error=unconfirmed");
      (await cookies()).set("signup_pending", await pendingToken(pend.id), pendingCookieOptions);
      return redirect("/sign-up/organization");
    }
    return redirect("/sign-in?error=1");
  }
  if (!(await bcrypt.compare(pw, u.passwordHash))) return redirect("/sign-in?error=1");
  if (!u.active) return redirect(u.joinPending ? "/sign-in?error=pending" : "/sign-in?error=1");
  const admin = isAdminUser(u);
  await createSession(u.id, admin);
  return redirect(admin ? "/admin" : "/home");
}
export async function signOut() { await destroySession(); redirect("/sign-in"); }

// Sign-up, step 1 (email): record the email and password, then email a link to confirm the address.
export async function startSignUp(fd: FormData) {
  const email = str(fd, "email").toLowerCase(), pw = String(fd.get("password") ?? ""), again = String(fd.get("again") ?? "");
  const E = (c: string) => `/sign-up?error=${c}`;
  if (!email.includes("@") || email.length > 200) return redirect(E("invalid"));
  if (pw.length < 8) return redirect(E("short"));
  if (pw !== again) return redirect(E("mismatch"));
  if (await prisma.user.findUnique({ where: { email } })) return redirect(E("exists"));
  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) return redirect(E("noemail")); // never create unconfirmed accounts without a way to confirm
  await prisma.pendingAccount.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 24 * 3600 * 1000) } } });
  const existing = await prisma.pendingAccount.findUnique({ where: { email } });
  if (existing?.confirmedAt) return redirect(E("resume")); // already signed up: sign in to carry on
  let dev = "";
  if (!existing || Date.now() - existing.createdAt.getTime() > 60_000) { // at most one email a minute per address
    const token = randomBytes(32).toString("hex"), link = `${await baseUrl()}/sign-up/confirm?token=${token}`;
    const data = { passwordHash: await bcrypt.hash(pw, 10), googleId: null, tokenHash: sha(token), confirmedAt: null, createdAt: new Date() };
    await prisma.pendingAccount.upsert({ where: { email }, update: data, create: { email, ...data } });
    await sendEmail(email, "Confirm your email for LeaveDesk", `Welcome to LeaveDesk!\n\nConfirm your email to continue creating your organization:\n${link}\n\nThe link works for 24 hours. If you did not sign up, you can ignore this email.`);
    if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production") dev = `&devlink=${encodeURIComponent(link)}`; // development only: no email service is set up
  }
  return redirect(`/sign-up?sent=1${dev}`);
}

// Sign-up, step 2: the account is confirmed (by email link or Google), so create the organization and sign the owner in as admin.
export async function completeSignUp(fd: FormData) {
  const acc = await getPendingAccount();
  if (!acc) return redirect("/sign-up?error=expired");
  const orgName = str(fd, "org"), name = str(fd, "name"), title = str(fd, "title");
  const allowance = parseAllowance(fd);
  const E = (c: string) => `/sign-up/organization/create?error=${c}`;
  if (!orgName || !name || !title) return redirect(E("invalid"));
  if (!allowance) return redirect(E("days"));
  if (await orgNameTaken(orgName)) return redirect(E("nametaken"));
  if (await prisma.user.findUnique({ where: { email: acc.email } })) return redirect("/sign-in?error=exists");
  const owner = await createOrganization({
    orgName, name, title, email: acc.email, allowance, googleId: acc.googleId, hasPassword: !!acc.passwordHash,
    passwordHash: acc.passwordHash ?? (await bcrypt.hash(randomBytes(24).toString("hex"), 10)),
  });
  await prisma.pendingAccount.delete({ where: { id: acc.id } });
  (await cookies()).delete("signup_pending");
  await createSession(owner.id, true);
  return redirect("/admin?welcome=1");
}

// Sign-up, step 2 (join): find an existing organization by its name.
export async function findOrganization(fd: FormData) {
  if (!(await getPendingAccount())) return redirect("/sign-up?error=expired");
  const name = str(fd, "org");
  const org = name ? await prisma.organization.findFirst({ where: { name: { equals: name, mode: "insensitive" } } }) : null;
  if (!org) return redirect("/sign-up/organization/join?error=notfound");
  return redirect(`/sign-up/organization/join/details?org=${org.id}`);
}
// Sign-up, step 3 (join): name, role and department. Admin roles cannot be picked here. By default an admin must approve the person first.
export async function completeJoin(fd: FormData) {
  const acc = await getPendingAccount();
  if (!acc) return redirect("/sign-up?error=expired");
  const orgId = str(fd, "org"), name = cleanName(str(fd, "name")), roleName = cleanName(str(fd, "role")), department = cleanName(str(fd, "department"));
  const E = (c: string) => `/sign-up/organization/join/details?org=${encodeURIComponent(orgId)}&error=${c}`;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return redirect("/sign-up/organization/join?error=notfound");
  if (!name || !department || department.length > 60 || !roleName || roleName.length > 60) return redirect(E("invalid"));
  // People type their own role, but nobody can join into a role that carries admin access.
  const existingRole = await findRole(orgId, roleName);
  if (isHrRole(roleName) || existingRole?.grantsAdmin) return redirect(E("adminrole"));
  const role = existingRole ?? (await prisma.role.create({ data: { orgId, name: roleName, grantsAdmin: false } }));
  if (await prisma.user.findUnique({ where: { email: acc.email } })) return redirect("/sign-in?error=exists");
  const wait = org.requireApproval;
  const user = await prisma.user.create({ data: {
    orgId, name, email: acc.email, roleId: role.id, department, googleId: acc.googleId, hasPassword: !!acc.passwordHash,
    passwordHash: acc.passwordHash ?? (await bcrypt.hash(randomBytes(24).toString("hex"), 10)), active: !wait, joinPending: wait,
  } });
  await prisma.pendingAccount.delete({ where: { id: acc.id } });
  (await cookies()).delete("signup_pending");
  await audit(orgId, name, wait ? "Asked to join" : "Joined", `${role.name}, ${department}`);
  if (wait) {
    for (const a of await prisma.user.findMany({ where: { orgId, active: true, ...adminWhere } }))
      await notify(a.id, "Request to join", `${name} (${role.name}, ${department}) asked to join ${org.name}. Review it under Employees.`);
    return redirect("/sign-in?joined=1");
  }
  await createSession(user.id, false);
  return redirect("/home");
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
  if (type.quarterly) { // annual leave follows the organization's allowance
    const al = allowanceOf(type.org);
    const bad = violation(al, await periodUsage(u.id, type.id, off, al.period), daysByPeriod(start, end, off, al.period));
    if (bad) return redirect(`${E("quarter")}&q=${bad}`);
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
  const name = cleanName(str(fd, "name")), email = str(fd, "email").toLowerCase(), roleName = cleanName(str(fd, "role")), department = cleanName(str(fd, "department")), pw = String(fd.get("password") ?? "");
  const E = (c: string) => `/admin/employees?error=${c}`;
  if (!name || !email.includes("@") || !roleName || roleName.length > 60 || !department || department.length > 60) return redirect(E("invalid"));
  if (pw.length < 8) return redirect(E("short"));
  if (await prisma.user.findUnique({ where: { email } })) return redirect(E("exists"));
  // The role is typed in. If it does not exist yet it is created (a role named HR carries admin access).
  const role = (await findRole(admin.orgId, roleName)) ?? (await prisma.role.create({ data: { orgId: admin.orgId, name: roleName, grantsAdmin: isHrRole(roleName) } }));
  await prisma.user.create({ data: { orgId: admin.orgId, name, email, roleId: role.id, department, passwordHash: await bcrypt.hash(pw, 10) } });
  await audit(admin.orgId, admin.name, "Added employee", `${name} (${email}), ${role.name}`);
  return redirect("/admin/employees");
}
export async function updateEmployee(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id"), roleName = cleanName(str(fd, "role")), department = cleanName(str(fd, "department")), email = str(fd, "email").toLowerCase(), managerId = str(fd, "managerId"), active = fd.get("active") === "on", pw = String(fd.get("password") ?? "");
  const back = `/admin/employees/${id}?error=`;
  const target = await prisma.user.findFirst({ where: { id, orgId: admin.orgId } });
  if (!roleName || roleName.length > 60 || !target || !department || department.length > 60 || !email.includes("@")) return redirect(back + "invalid");
  if (await prisma.user.findFirst({ where: { email, id: { not: id } } })) return redirect(back + "emailtaken");
  if (managerId && !(await prisma.user.findFirst({ where: { id: managerId, orgId: admin.orgId, active: true, NOT: { id } } }))) return redirect(back + "invalid");
  if (pw && pw.length < 8) return redirect(back + "short");
  if (id === admin.id && !active) return redirect(back + "self");
  const existingRole = await findRole(admin.orgId, roleName);
  const stillAdmin = target.isOwner || target.isAdmin || (existingRole ? existingRole.grantsAdmin : isHrRole(roleName));
  const others = await prisma.user.count({ where: { orgId: admin.orgId, id: { not: id }, active: true, ...adminWhere } });
  if (others + (active && stillAdmin ? 1 : 0) < 1) return redirect(back + "lastadmin");
  const role = existingRole ?? (await prisma.role.create({ data: { orgId: admin.orgId, name: roleName, grantsAdmin: isHrRole(roleName) } }));
  await prisma.user.update({ where: { id }, data: { roleId: role.id, department, email, managerId: managerId || null, active, ...(pw ? { passwordHash: await bcrypt.hash(pw, 10) } : {}) } });
  await audit(admin.orgId, admin.name, "Updated employee", `${target.name}: ${role.name}, ${department}, ${email}, ${active ? "active" : "deactivated"}${pw ? ", password reset" : ""}`);
  return redirect("/admin/employees");
}
// The owner or any other admin can give or take away admin access. HR roles carry it automatically; the owner always has it.
export async function setAdminAccess(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id"), grant = fd.get("grant") === "1";
  const fromPolicies = str(fd, "from") === "policies";
  const back = fromPolicies ? "/admin/policies?error=" : `/admin/employees/${id}?error=`;
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
  return redirect(fromPolicies ? "/admin/policies?saved=1" : `/admin/employees/${id}?done=${grant ? "granted" : "rescinded"}`);
}
// Only the owner can decide which roles carry admin access. (Roles named HR always do.)
export async function setRoleAdmin(fd: FormData) {
  const admin = await requireAdmin();
  const roleId = str(fd, "id"), grant = fd.get("grant") === "1";
  const back = "/admin/policies?error=";
  if (!admin.isOwner) return redirect(back + "ownersonly");
  const role = await prisma.role.findFirst({ where: { id: roleId, orgId: admin.orgId } });
  if (!role) return redirect("/admin/policies");
  if (isHrRole(role.name)) return redirect(back + "hrlocked");
  if (!grant) {
    const left = await prisma.user.count({ where: { orgId: admin.orgId, active: true, OR: [{ isOwner: true }, { isAdmin: true }, { role: { grantsAdmin: true, NOT: { id: roleId } } }] } });
    if (left < 1) return redirect(back + "lastadmin");
  }
  await prisma.role.update({ where: { id: roleId }, data: { grantsAdmin: grant } });
  await audit(admin.orgId, admin.name, grant ? "Gave a role admin access" : "Removed a role's admin access", role.name);
  for (const u of await prisma.user.findMany({ where: { orgId: admin.orgId, roleId, active: true, NOT: { id: admin.id } } }))
    await notify(u.id, grant ? "You now have admin access" : "Your admin access was removed", `${admin.name} ${grant ? "gave" : "removed"} HR dashboard access ${grant ? "to" : "from"} the ${role.name} role.`);
  return redirect("/admin/policies?saved=1");
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

export async function approveJoin(fd: FormData) {
  const admin = await requireAdmin();
  const u = await prisma.user.findFirst({ where: { id: str(fd, "id"), orgId: admin.orgId, joinPending: true } });
  if (!u) return;
  await prisma.user.update({ where: { id: u.id }, data: { active: true, joinPending: false } });
  await audit(admin.orgId, admin.name, "Approved join request", u.name);
  await notify(u.id, "Welcome to LeaveDesk", `${admin.name} approved your request to join ${admin.org.name}. You can sign in now.`);
  revalidatePath("/admin/employees");
}
export async function declineJoin(fd: FormData) {
  const admin = await requireAdmin();
  const u = await prisma.user.findFirst({ where: { id: str(fd, "id"), orgId: admin.orgId, joinPending: true } });
  if (!u) return;
  await prisma.$transaction([prisma.notification.deleteMany({ where: { userId: u.id } }), prisma.passwordReset.deleteMany({ where: { userId: u.id } }), prisma.user.delete({ where: { id: u.id } })]);
  await audit(admin.orgId, admin.name, "Declined join request", `${u.name} (${u.email})`);
  revalidatePath("/admin/employees");
}

// ---------- policies: off days, leave types, holidays, roles ----------
export async function renameOrganization(fd: FormData) {
  const admin = await requireAdmin();
  const name = cleanName(str(fd, "name"));
  if (!name || name.length > 120) return redirect("/admin/policies?error=orgname");
  if (await orgNameTaken(name, admin.orgId)) return redirect("/admin/policies?error=nametaken");
  await prisma.organization.update({ where: { id: admin.orgId }, data: { name } });
  await audit(admin.orgId, admin.name, "Renamed the organization", `${admin.org.name} to ${name}`);
  return redirect("/admin/policies?saved=1");
}
export async function updateOrganization(fd: FormData) {
  const admin = await requireAdmin();
  const al = parseAllowance(fd);
  if (!al) return redirect("/admin/policies?error=org");
  await prisma.organization.update({ where: { id: admin.orgId }, data: { requireApproval: fd.get("approval") === "on", leavePeriod: al.period, leaveRule: al.rule, periodDays: al.days.join(",") } });
  await prisma.leaveType.updateMany({ where: { orgId: admin.orgId, quarterly: true }, data: { daysPerYear: totalDays(al) } });
  await audit(admin.orgId, admin.name, "Changed annual leave allowance", `${al.period}, ${al.rule}: ${al.days.join(", ")} (${totalDays(al)} days a year)`);
  return redirect("/admin/policies?saved=1");
}
// Permanently deletes the whole organization: people, leave, settings and history. Any admin can do it, so it asks for the exact name.
export async function deleteOrganization(fd: FormData) {
  const admin = await requireAdmin();
  const back = "/admin/policies?error=";
  if (cleanName(str(fd, "confirm")).toLowerCase() !== admin.org.name.toLowerCase() || fd.get("understand") !== "on") return redirect(back + "delconfirm");
  if (admin.hasPassword && !(await bcrypt.compare(String(fd.get("password") ?? ""), admin.passwordHash))) return redirect(back + "delpassword");
  const orgId = admin.orgId, orgName = admin.org.name;
  const admins = await prisma.user.findMany({ where: { orgId, active: true, ...adminWhere } });
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { user: { orgId } } }),
    prisma.passwordReset.deleteMany({ where: { user: { orgId } } }),
    prisma.leaveRequest.deleteMany({ where: { user: { orgId } } }),
    prisma.user.updateMany({ where: { orgId }, data: { managerId: null } }),
    prisma.user.deleteMany({ where: { orgId } }),
    prisma.role.deleteMany({ where: { orgId } }),
    prisma.leaveType.deleteMany({ where: { orgId } }),
    prisma.holiday.deleteMany({ where: { orgId } }),
    prisma.closure.deleteMany({ where: { orgId } }),
    prisma.auditLog.deleteMany({ where: { orgId } }),
    prisma.organization.delete({ where: { id: orgId } }),
  ]);
  console.log(`[organization deleted] ${orgName} by ${admin.name} (${admin.email})`);
  for (const a of admins) await sendEmail(a.email, `${orgName} was deleted from LeaveDesk`, `${admin.name} deleted the organization ${orgName} and all its people, leave records and settings. This cannot be undone. If this was not expected, contact them.`);
  await destroySession();
  return redirect("/sign-in?deleted=1");
}
export async function addClosure(fd: FormData) {
  const admin = await requireAdmin();
  const name = str(fd, "name"), from = str(fd, "from"), to = str(fd, "to"), repeats = fd.get("repeats") === "on";
  if (!name || !ISO.test(from) || !ISO.test(to) || (!repeats && to < from)) return redirect("/admin/policies?error=closure");
  await prisma.closure.create({ data: { orgId: admin.orgId, name, repeats, startMd: from.slice(5), endMd: to.slice(5), startDate: repeats ? "" : from, endDate: repeats ? "" : to } });
  await audit(admin.orgId, admin.name, "Added mandatory leave period", repeats ? `${name}: ${from.slice(5)} to ${to.slice(5)} every year` : `${name}: ${from} to ${to}`);
  return redirect("/admin/policies");
}
// Change the dates of a mandatory leave period (also turns an old "every year" period into one with exact dates).
export async function updateClosure(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id"), from = str(fd, "from"), to = str(fd, "to");
  if (!ISO.test(from) || !ISO.test(to) || to < from) return redirect("/admin/policies?error=closure");
  const c = await prisma.closure.findFirst({ where: { id, orgId: admin.orgId } });
  if (!c) return redirect("/admin/policies");
  await prisma.closure.update({ where: { id }, data: { repeats: false, startDate: from, endDate: to, startMd: from.slice(5), endMd: to.slice(5) } });
  await audit(admin.orgId, admin.name, "Changed mandatory leave dates", `${c.name}: ${from} to ${to}`);
  return redirect("/admin/policies?saved=1");
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
