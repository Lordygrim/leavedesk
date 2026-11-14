import { prisma } from "./db";
import { sendEmail } from "./mail";
import { inClosure, todayNairobi, type Off } from "./dates";
import { allowanceOf, daysByPeriod, totalDays, type Period } from "./allowance";

// Older versions stored mandatory leave as "the same days every year". Turn those into one period with exact dates
// (the current or next occurrence), so they can be changed year by year like any other period.
export async function upgradeClosures(orgId: string) {
  const old = await prisma.closure.findMany({ where: { orgId, repeats: true } });
  if (!old.length) return;
  const today = todayNairobi(), y = Number(today.slice(0, 4));
  for (const c of old) {
    const wrap = c.startMd > c.endMd; // runs over the new year, e.g. 22 Dec to 11 Jan
    const pick = (sy: number) => ({ s: `${sy}-${c.startMd}`, e: `${wrap ? sy + 1 : sy}-${c.endMd}` });
    let p = pick(wrap ? y - 1 : y);
    if (today > p.e) p = pick(wrap ? y : y + 1);
    await prisma.closure.update({ where: { id: c.id }, data: { repeats: false, startDate: p.s, endDate: p.e, startMd: p.s.slice(5), endMd: p.e.slice(5) } });
  }
}

// Non-working days for one organization: its public holidays plus its mandatory leave periods (weekends are handled separately).
export async function offFor(orgId: string): Promise<Off> {
  await upgradeClosures(orgId);
  const [hs, cs] = await Promise.all([prisma.holiday.findMany({ where: { orgId } }), prisma.closure.findMany({ where: { orgId } })]);
  const set = new Set(hs.map((h) => h.date));
  return (d) => set.has(d) || cs.some((c) => inClosure(c, d));
}

export async function balance(userId: string, typeId: string) {
  const t = await prisma.leaveType.findUniqueOrThrow({ where: { id: typeId }, include: { org: true } });
  const total = t.quarterly ? totalDays(allowanceOf(t.org)) : t.daysPerYear;
  const year = todayNairobi().slice(0, 4);
  const r = await prisma.leaveRequest.aggregate({ _sum: { workingDays: true }, where: { userId, typeId, status: "APPROVED", startDate: { startsWith: year } } });
  const used = r._sum.workingDays ?? 0;
  return { total, used, left: total - used };
}
// Pending and approved days per period ("2027-1"), for the leave type that follows the organization's allowance.
export async function periodUsage(userId: string, typeId: string, off: Off, period: Period) {
  const reqs = await prisma.leaveRequest.findMany({ where: { userId, typeId, status: { in: ["PENDING", "APPROVED"] } } });
  const out: Record<string, number> = {};
  for (const r of reqs) for (const [k, v] of Object.entries(daysByPeriod(r.startDate, r.endDate, off, period))) out[k] = (out[k] ?? 0) + v;
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
