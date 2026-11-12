import { prisma } from "@/lib/db";
import { balance, offFor, periodUsage } from "@/lib/leave";
import { PERIODS, allowanceOf, periodIndex } from "@/lib/allowance";
import { fmtDay, fmtMd, todayNairobi } from "@/lib/dates";
import { Ring } from "./ui";

export async function BalancesPanel({ userId, orgId }: { userId: string; orgId: string }) {
  const types = await prisma.leaveType.findMany({ where: { orgId, name: { in: ["Annual", "Sick", "Compassionate"] } }, orderBy: { daysPerYear: "desc" } });
  const rows = await Promise.all(types.map(async (t) => ({ t, b: await balance(userId, t.id) })));
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 text-base font-medium">Your balances</h2>
      <ul className="flex flex-col gap-4">
        {rows.map(({ t, b }) => (
          <li key={t.id} className="flex items-center gap-4">
            <Ring left={b.left} total={b.total} size={56} />
            <div><div className="font-medium">{t.name}</div><div className="text-sm text-mut">{b.left} of {b.total} days left</div></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// How annual leave is given in this organization, and what is left in each period.
export async function AllowancePanel({ userId, orgId }: { userId: string; orgId: string }) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, include: { closures: true } });
  const al = allowanceOf(org);
  const annual = await prisma.leaveType.findFirst({ where: { orgId, quarterly: true } });
  const used = annual ? await periodUsage(userId, annual.id, await offFor(orgId), al.period) : {};
  const year = todayNairobi().slice(0, 4);
  const usedIn = (i: number) => used[`${year}-${i}`] ?? 0;
  const cum = al.rule === "CUMULATIVE";
  const now = periodIndex(al.period, todayNairobi());
  const earned = al.days.slice(0, now + 1).reduce((a, d) => a + d, 0);
  const usedAll = al.days.reduce((a, _, i) => a + usedIn(i), 0);
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-1 text-base font-medium">Your annual leave allowance</h2>
      <p className="mb-4 text-sm text-mut">{PERIODS[al.period].label.split(":")[0]}, {cum ? "building up through the year" : al.period === "YEARLY" ? "available all year" : "taken in the period it is given"}</p>
      {cum && <p className="mb-3 rounded-xl bg-olb px-3 py-2 text-sm text-olt">Available to take now: {Math.max(earned - usedAll, 0)} days</p>}
      <ul className="flex flex-col gap-3">
        {al.days.map((d, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span>{PERIODS[al.period].names[i].split(" (")[0]} {PERIODS[al.period].names[i].includes("(") && <span className="text-sm text-mut">({PERIODS[al.period].names[i].split(" (")[1]}</span>}</span>
            <span className="text-sm text-mut">{cum ? `+${d} days${usedIn(i) ? `, ${usedIn(i)} taken` : ""}` : d === 0 ? "No leave days" : `${Math.max(d - usedIn(i), 0)} of ${d} left`}</span>
          </li>
        ))}
      </ul>
      {org.closures.map((c) => <p key={c.id} className="mt-4 rounded-xl bg-odb px-3 py-2 text-sm text-odt">{c.name}: {fmtMd(c.startMd)} to {fmtMd(c.endMd)}, every year</p>)}
    </section>
  );
}

export async function HolidaysPanel({ orgId }: { orgId: string }) {
  const hs = await prisma.holiday.findMany({ where: { orgId, date: { gte: todayNairobi() } }, orderBy: { date: "asc" }, take: 4 });
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 text-base font-medium">Upcoming public holidays</h2>
      {hs.length === 0 && <p className="text-sm text-mut">None listed. An admin can add them under Policies.</p>}
      <ul className="flex flex-col gap-3">
        {hs.map((h) => <li key={h.id} className="flex items-center justify-between gap-3"><span>{h.name}</span><span className="text-sm text-mut">{fmtDay(h.date)}</span></li>)}
      </ul>
    </section>
  );
}
