import { prisma } from "./db";
import { sendEmail } from "./mail";
import { inMd, quarterDays, todayNairobi, type Off } from "./dates";

// Non-working days for one organization: its public holidays plus its mandatory leave periods (weekends are handled separately).
export async function offFor(orgId: string): Promise<Off> {
  const [hs, cs] = await Promise.all([prisma.holiday.findMany({ where: { orgId } }), prisma.closure.findMany({ where: { orgId } })]);
  const set = new Set(hs.map((h) => h.date));
  return (d) => set.has(d) || cs.some((c) => inMd(d.slice(5), c.startMd, c.endMd));
}
export const quarterAllowance = (org: { q1Days: number; q2Days: number; q3Days: number; q4Days: number }, q: number) => [org.q1Days, org.q2Days, org.q3Days, org.q4Days][q - 1];

export async function balance(userId: string, typeId: string) {
  const t = await prisma.leaveType.findUniqueOrThrow({ where: { id: typeId }, include: { org: true } });
  const total = t.quarterly ? t.org.q1Days + t.org.q2Days + t.org.q3Days + t.org.q4Days : t.daysPerYear;
  const year = todayNairobi().slice(0, 4);
  const r = await prisma.leaveRequest.aggregate({ _sum: { workingDays: true }, where: { userId, typeId, status: "APPROVED", startDate: { startsWith: year } } });
  const used = r._sum.workingDays ?? 0;
  return { total, used, left: total - used };
}
// Pending and approved days per "YYYY-Qn", for leave types that follow quarterly allowances.
export async function quarterUsage(userId: string, typeId: string, off: Off) {
  const reqs = await prisma.leaveRequest.findMany({ where: { userId, typeId, status: { in: ["PENDING", "APPROVED"] } } });
  const out: Record<string, number> = {};
  for (const r of reqs) for (const [k, v] of Object.entries(quarterDays(r.startDate, r.endDate, off))) out[k] = (out[k] ?? 0) + v;
  return out;
}
export async function notify(userId: string, title: string, body: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.notification.create({ data: { userId, title, body } });
  if (u) await sendEmail(u.email, title, body);
}
export async function notifyOnce(userId: string, title: string, body: string) {
  if (await prisma.notification.findFirst({ where: { userId, title, body } })) return false;
  await notify(userId, title, body);
  return true;
}
export const audit = (orgId: string, actor: string, action: string, detail: string) => prisma.auditLog.create({ data: { orgId, actor, action, detail } });
