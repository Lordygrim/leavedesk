"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireAdmin, requireUser } from "./dal";
import { createSession, destroySession } from "./session";
import { audit, balance, holidays, notify } from "./leave";
import { fmt, fmtDay, reportBack, todayNairobi, workingDays } from "./dates";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function signIn(fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const u = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!u || !u.active || !(await bcrypt.compare(String(fd.get("password") ?? ""), u.passwordHash))) return redirect("/sign-in?error=1");
  await createSession(u.id, u.role.isAdmin);
  return redirect(u.role.isAdmin ? "/admin" : "/home");
}
export async function signOut() { await destroySession(); redirect("/sign-in"); }

export async function submitRequest(fd: FormData) {
  const u = await requireUser();
  const typeId = String(fd.get("typeId")), start = String(fd.get("start")), end = String(fd.get("end"));
  const note = String(fd.get("note") ?? "").trim();
  const E = (c: string) => `/request?error=${c}`;
  if (!note) return redirect(E("note"));
  if (!ISO.test(start) || !ISO.test(end) || end < start) return redirect(E("dates"));
  if (start < todayNairobi()) return redirect(E("past"));
  const type = await prisma.leaveType.findUnique({ where: { id: typeId } });
  if (!type) return redirect(E("dates"));
  const h = await holidays();
  const days = workingDays(start, end, h);
  if (days < 1) return redirect(E("nodays"));
  if (days > (await balance(u.id, typeId)).left) return redirect(E("balance"));
  const clash = await prisma.leaveRequest.findFirst({ where: { userId: u.id, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: end }, endDate: { gte: start } } });
  if (clash) return redirect(E("overlap"));
  const auto = u.role.selfApprove; // the owner does not need anyone else's approval
  await prisma.leaveRequest.create({ data: { userId: u.id, typeId, startDate: start, endDate: end, workingDays: days, reportBackDate: reportBack(end, h), note,
    status: auto ? "APPROVED" : "PENDING", decidedBy: auto ? u.name : null, decidedAt: auto ? new Date() : null } });
  if (!auto)
    for (const a of await prisma.user.findMany({ where: { role: { isAdmin: true } } }))
      await notify(a.id, "New leave request", `${u.name} (${u.role.name}) requested ${type.name} leave, ${fmt(start)} to ${fmt(end)} (${days} working days).`);
  await audit(u.name, auto ? "Recorded leave (auto-approved)" : "Submitted request", `${type.name}, ${start} to ${end}`);
  return redirect(auto ? "/home?sent=auto" : "/home?sent=1");
}

export async function decideRequest(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id")), decision = String(fd.get("decision")), reason = String(fd.get("reason") ?? "").trim();
  if (decision !== "APPROVED" && decision !== "DECLINED") return;
  const r = await prisma.leaveRequest.findUnique({ where: { id }, include: { user: true, type: true } });
  if (!r || r.status !== "PENDING") return redirect("/admin/requests");
  const back = `/admin/requests/${id}?error=`;
  if (r.userId === admin.id) return redirect(back + "self");
  if (decision === "DECLINED" && !reason) return redirect(back + "reason");
  if (decision === "APPROVED" && r.workingDays > (await balance(r.userId, r.typeId)).left) return redirect(back + "balance");
  await prisma.leaveRequest.update({ where: { id }, data: { status: decision, decisionReason: reason || null, decidedBy: admin.name, decidedAt: new Date() } });
  const ok = decision === "APPROVED";
  await notify(r.userId, ok ? "Leave approved" : "Leave declined", ok
    ? `Your ${r.type.name} leave, ${fmt(r.startDate)} to ${fmt(r.endDate)}, was approved. Back at work ${fmtDay(r.reportBackDate)}.`
    : `Your request for ${fmt(r.startDate)} to ${fmt(r.endDate)} was declined: ${reason}`);
  await audit(admin.name, ok ? "Approved request" : "Declined request", `${r.user.name}, ${r.startDate} to ${r.endDate}`);
  revalidatePath("/admin");
  return redirect("/admin/requests");
}

export async function recordReturn(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id")), date = String(fd.get("date"));
  if (!ISO.test(date)) return;
  const r = await prisma.leaveRequest.update({ where: { id }, data: { actualReturnDate: date }, include: { user: true } });
  await audit(admin.name, "Recorded return", `${r.user.name} reported back ${date}`);
  revalidatePath("/admin");
}

// ---------- employee actions ----------
export async function cancelRequest(fd: FormData) {
  const u = await requireUser();
  const id = String(fd.get("id"));
  const r = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!r || r.userId !== u.id || r.status !== "PENDING") return;
  await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit(u.name, "Cancelled request", `${r.startDate} to ${r.endDate}`);
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
  if (!(await bcrypt.compare(cur, u.passwordHash))) return redirect("/profile?error=wrong");
  if (next.length < 8) return redirect("/profile?error=short");
  if (next !== again) return redirect("/profile?error=mismatch");
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  await audit(u.name, "Changed password", "");
  return redirect("/profile?saved=1");
}

// ---------- admin actions ----------
export async function addEmployee(fd: FormData) {
  const admin = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim(), email = String(fd.get("email") ?? "").trim().toLowerCase();
  const roleId = String(fd.get("roleId")), department = String(fd.get("department") ?? "").trim(), pw = String(fd.get("password") ?? "");
  const E = (c: string) => `/admin/employees?error=${c}`;
  if (!name || !email.includes("@") || !department) return redirect(E("invalid"));
  if (pw.length < 8) return redirect(E("short"));
  if (!(await prisma.role.findUnique({ where: { id: roleId } }))) return redirect(E("invalid"));
  if (await prisma.user.findUnique({ where: { email } })) return redirect(E("exists"));
  await prisma.user.create({ data: { name, email, roleId, department, passwordHash: await bcrypt.hash(pw, 10) } });
  await audit(admin.name, "Added employee", `${name} (${email})`);
  return redirect("/admin/employees");
}
export async function updateEmployee(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id")), roleId = String(fd.get("roleId")), department = String(fd.get("department") ?? "").trim();
  const active = fd.get("active") === "on", pw = String(fd.get("password") ?? "");
  const back = `/admin/employees/${id}?error=`;
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!role || !target || !department) return redirect(back + "invalid");
  if (pw && pw.length < 8) return redirect(back + "short");
  if (id === admin.id && (!active || !role.isAdmin)) return redirect(back + "self");
  const others = await prisma.user.count({ where: { id: { not: id }, active: true, role: { isAdmin: true } } });
  if (others + (active && role.isAdmin ? 1 : 0) < 1) return redirect(back + "lastadmin");
  await prisma.user.update({ where: { id }, data: { roleId, department, active, ...(pw ? { passwordHash: await bcrypt.hash(pw, 10) } : {}) } });
  await audit(admin.name, "Updated employee", `${target.name}: ${role.name}, ${department}, ${active ? "active" : "deactivated"}${pw ? ", password reset" : ""}`);
  return redirect("/admin/employees");
}
export async function updateLeaveType(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id")), days = Math.round(Number(fd.get("days")));
  if (!(days >= 0 && days <= 365)) return;
  const t = await prisma.leaveType.update({ where: { id }, data: { daysPerYear: days } });
  await audit(admin.name, "Changed leave type", `${t.name}: ${days} days a year`);
  revalidatePath("/admin/policies");
}
export async function addLeaveType(fd: FormData) {
  const admin = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim(), days = Math.round(Number(fd.get("days")));
  if (!name || !(days >= 0 && days <= 365)) return redirect("/admin/policies?error=type");
  if (await prisma.leaveType.findUnique({ where: { name } })) return redirect("/admin/policies?error=typeexists");
  await prisma.leaveType.create({ data: { name, daysPerYear: days } });
  await audit(admin.name, "Added leave type", `${name}: ${days} days a year`);
  return redirect("/admin/policies");
}
export async function addHoliday(fd: FormData) {
  const admin = await requireAdmin();
  const date = String(fd.get("date")), name = String(fd.get("name") ?? "").trim();
  if (!ISO.test(date) || !name) return redirect("/admin/policies?error=holiday");
  await prisma.holiday.upsert({ where: { date }, update: { name }, create: { date, name } });
  await audit(admin.name, "Added holiday", `${name}, ${date}`);
  return redirect("/admin/policies");
}
export async function deleteHoliday(fd: FormData) {
  const admin = await requireAdmin();
  const h = await prisma.holiday.delete({ where: { id: String(fd.get("id")) } });
  await audit(admin.name, "Removed holiday", `${h.name}, ${h.date}`);
  revalidatePath("/admin/policies");
}
