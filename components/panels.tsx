import { prisma } from "@/lib/db";
import { balance, offFor, quarterAllowance, quarterUsage } from "@/lib/leave";
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

// When annual leave may be taken: the organization's days per quarter, and its mandatory leave periods.
export async function QuartersPanel({ userId, orgId }: { userId: string; orgId: string }) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, include: { closures: true } });
  const annual = await prisma.leaveType.findFirst({ where: { orgId, quarterly: true } });
  const used = annual ? await quarterUsage(userId, annual.id, await offFor(orgId)) : {};
  const year = todayNairobi().slice(0, 4);
  const names = ["Jan to Mar", "Apr to Jun", "Jul to Sep", "Oct to Dec"];
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 text-base font-medium">When you can take annual leave</h2>
      <ul className="flex flex-col gap-3">
        {names.map((n, i) => {
          const allow = quarterAllowance(org, i + 1), u = used[`${year}-Q${i + 1}`] ?? 0;
          return (
            <li key={n} className="flex items-center justify-between gap-3">
              <span>Q{i + 1} <span className="text-sm text-mut">({n})</span></span>
              <span className="text-sm text-mut">{allow === 0 ? "No leave days" : `${Math.max(allow - u, 0)} of ${allow} left`}</span>
            </li>
          );
        })}
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
