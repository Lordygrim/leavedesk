import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { offFor } from "@/lib/leave";
import { add, todayNairobi } from "@/lib/dates";
import { isWeekday, mondayOf } from "@/lib/calendar";
import { card, ghostSm, h1, muted } from "@/components/styles";
export default async function TeamCalendar({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const today = todayNairobi();
  const start = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? (sp.from as string) : today);
  const end = add(start, 27);
  const days: string[] = [];
  for (let i = 0; i < 28; i++) if (isWeekday(add(start, i))) days.push(add(start, i));
  const off = await offFor(admin.orgId);
  const users = await prisma.user.findMany({ where: { orgId: admin.orgId, active: true }, include: { role: true }, orderBy: { name: "asc" } });
  const reqs = await prisma.leaveRequest.findMany({
    where: { user: { orgId: admin.orgId }, status: { in: ["APPROVED", "PENDING"] }, startDate: { lte: end }, OR: [{ endDate: { gte: start } }, { status: "APPROVED", actualReturnDate: null }] },
  });
  const state = (userId: string, d: string) => {
    for (const r of reqs) {
      if (r.userId !== userId) continue;
      if (r.startDate <= d && d <= r.endDate) return r.status === "APPROVED" ? "ol" : "pe";
      if (r.status === "APPROVED" && !r.actualReturnDate && d >= r.reportBackDate && d <= today) return "od";
    }
    return "";
  };
  const cls: Record<string, string> = { ol: "bg-ac", pe: "bg-peb ring-1 ring-fld", od: "bg-odt" };
  const label: Record<string, string> = { ol: "On leave", pe: "Pending", od: "Overdue return" };
  const cols = { gridTemplateColumns: `200px repeat(${days.length}, minmax(26px, 1fr))` };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={h1}>Team calendar</h1>
        <div className="flex gap-3">
          <Link className={ghostSm} href={`/admin/team-calendar?from=${add(start, -28)}`}>Previous 4 weeks</Link>
          <Link className={ghostSm} href="/admin/team-calendar">Today</Link>
          <Link className={ghostSm} href={`/admin/team-calendar?from=${add(start, 28)}`}>Next 4 weeks</Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        {Object.keys(cls).map((k) => <span key={k} className="flex items-center gap-2"><span className={`h-3.5 w-3.5 rounded ${cls[k]}`} />{label[k]}</span>)}
        <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded bg-odb" />Public holiday or mandatory leave</span>
      </div>
      <div className={`${card} overflow-x-auto p-4`}>
        <div className="grid items-end gap-1 pb-2 text-center text-xs text-mut" style={cols}>
          <span className="text-left">Employee</span>
          {days.map((d) => <span key={d} className={d === today ? "font-bold text-ac" : ""}>{["S", "M", "T", "W", "T", "F", "S"][new Date(d + "T00:00:00Z").getUTCDay()]}<br />{Number(d.slice(8))}</span>)}
        </div>
        {users.map((u) => (
          <div key={u.id} className="grid items-center gap-1 border-t border-line py-1.5" style={cols}>
            <div className="truncate text-sm">{u.name}<div className={`${muted} truncate`}>{u.role.name}</div></div>
            {days.map((d) => { const s = state(u.id, d);
              return <div key={d} title={s ? label[s] : off(d) ? "Public holiday or mandatory leave" : ""} className={`h-7 rounded-md ${s ? cls[s] : off(d) ? "bg-odb" : ""}`} />; })}
          </div>
        ))}
      </div>
    </>
  );
}
