import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { offFor } from "@/lib/leave";
import { fmt, inMd, isWorkday, todayNairobi } from "@/lib/dates";
import { monthGrid, monthLabel, shiftMonth } from "@/lib/calendar";
import { card, ghostSm, h1, h2, muted } from "@/components/styles";
export default async function Calendar({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const today = todayNairobi();
  const ym = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? (sp.m as string) : today.slice(0, 7);
  const grid = monthGrid(ym);
  const from = grid[0], to = grid[grid.length - 1];
  const holMap = new Map<string, string>((await prisma.holiday.findMany({ where: { orgId: u.orgId, date: { gte: from, lte: to } } })).map((h) => [h.date, h.name]));
  const closures = await prisma.closure.findMany({ where: { orgId: u.orgId } });
  const off = await offFor(u.orgId);
  const reqs = await prisma.leaveRequest.findMany({
    where: { user: { orgId: u.orgId }, status: { in: ["APPROVED", "PENDING"] }, startDate: { lte: to }, endDate: { gte: from } },
    include: { user: { include: { role: true } } }, orderBy: { startDate: "asc" },
  });
  const visible = reqs.filter((r) => r.status === "APPROVED" || r.userId === u.id); // colleagues' pending requests stay private
  const team = visible.filter((r) => r.userId !== u.id && r.status === "APPROVED" && r.startDate.slice(0, 7) <= ym && r.endDate.slice(0, 7) >= ym);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={h1}>Calendar</h1>
        <div className="flex items-center gap-3">
          <Link className={ghostSm} href={`/calendar?m=${shiftMonth(ym, -1)}`}>Previous</Link>
          <b className="min-w-36 text-center font-medium">{monthLabel(ym)}</b>
          <Link className={ghostSm} href={`/calendar?m=${shiftMonth(ym, 1)}`}>Next</Link>
          <Link className={ghostSm} href="/calendar">Today</Link>
        </div>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className={`${muted} px-1`}>{d}</div>)}
            {grid.map((d) => {
              const inMonth = d.startsWith(ym);
              const mine = visible.find((r) => r.userId === u.id && r.startDate <= d && r.endDate >= d);
              const out = isWorkday(d, off) ? visible.filter((r) => r.userId !== u.id && r.status === "APPROVED" && r.startDate <= d && r.endDate >= d).length : 0;
              const hol = holMap.get(d) ?? closures.find((c) => inMd(d.slice(5), c.startMd, c.endMd))?.name;
              return (
                <div key={d} className={`min-h-24 rounded-xl border p-2 text-sm ${inMonth ? "border-line" : "border-transparent opacity-50"} ${mine ? (mine.status === "APPROVED" ? "bg-olb text-olt" : "bg-peb text-pet") : "bg-card"} ${d === today ? "ring-2 ring-ac" : ""}`}>
                  <div className="font-medium">{Number(d.slice(8))}</div>
                  {hol && <div className="mt-1 rounded bg-odb px-1 text-xs text-odt">{hol}</div>}
                  {mine && <div className="mt-1 text-xs">My leave{mine.status === "PENDING" ? " (pending)" : ""}</div>}
                  {out > 0 && <div className="mt-1 text-xs opacity-80">{out} out</div>}
                </div>
              );
            })}
          </div>
        </div>
        <section className={`${card} flex flex-col gap-3 p-5`}>
          <h2 className={h2}>Who is out in {monthLabel(ym)}</h2>
          {team.length === 0 && <p className={muted}>Nobody else is on approved leave.</p>}
          {team.map((r) => <div key={r.id}><div className="font-medium">{r.user.name} ({r.user.role.name})</div><div className={muted}>{fmt(r.startDate)} to {fmt(r.endDate)}</div></div>)}
        </section>
      </div>
    </>
  );
}
