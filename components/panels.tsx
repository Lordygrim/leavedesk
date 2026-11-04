import { prisma } from "@/lib/db";
import { balance } from "@/lib/leave";
import { fmtDay, todayNairobi } from "@/lib/dates";
import { Ring } from "./ui";

export async function BalancesPanel({ userId }: { userId: string }) {
  const types = await prisma.leaveType.findMany({ where: { name: { in: ["Annual", "Sick", "Compassionate"] } }, orderBy: { daysPerYear: "desc" } });
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

export async function HolidaysPanel() {
  const hs = await prisma.holiday.findMany({ where: { date: { gte: todayNairobi() } }, orderBy: { date: "asc" }, take: 4 });
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 text-base font-medium">Upcoming public holidays</h2>
      {hs.length === 0 && <p className="text-sm text-mut">None listed. HR can add them.</p>}
      <ul className="flex flex-col gap-3">
        {hs.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3"><span>{h.name}</span><span className="text-sm text-mut">{fmtDay(h.date)}</span></li>
        ))}
      </ul>
    </section>
  );
}
