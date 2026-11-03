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
  if (!u || !(await bcrypt.compare(String(fd.get("password") ?? ""), u.passwordHash))) return redirect("/sign-in?error=1");
  await createSession(u.id, u.role.isAdmin);
  return redirect(u.role.isAdmin ? "/admin" : "/home");
}
export async function signOut() { await destroySession(); redirect("/sign-in"); }

export async function submitRequest(fd: FormData) {
  const u = await requireUser();
  const typeId = String(fd.get("typeId")), start = String(fd.get("start")), end = String(fd.get("end"));
  const note = String(fd.get("note") ?? "").trim() || null;
  const E = (c: string) => `/request?error=${c}`;
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
