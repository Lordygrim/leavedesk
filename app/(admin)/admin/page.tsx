import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { recordReturn } from "@/lib/actions";
import { fmt, fmtDay, todayNairobi } from "@/lib/dates";
import { Chip } from "@/components/ui";
export default async function Admin() {
  await requireAdmin();
  const today = todayNairobi();
  const out = await prisma.leaveRequest.findMany({ where: { status: "APPROVED", actualReturnDate: null, startDate: { lte: today } }, include: { user: { include: { role: true } } }, orderBy: { reportBackDate: "asc" } });
  const next = await prisma.leaveRequest.findMany({ where: { status: "APPROVED", startDate: { gt: today } }, include: { user: { include: { role: true } } }, orderBy: { startDate: "asc" }, take: 5 });
  const pending = await prisma.leaveRequest.count({ where: { status: "PENDING" } });
  const status = (back: string) => (back > today ? "ON_LEAVE" : back === today ? "DUE" : "OVERDUE");
  return (
    <>
      <h1 className="text-3xl font-medium">Who's on leave</h1>
      <p className="text-sm text-mut">{out.length} out or due back · {pending} requests waiting for a decision</p>
      <div className="rounded-2xl border border-line bg-card"><table className="w-full border-collapse text-sm max-[700px]:block max-[700px]:overflow-x-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-mut [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle">
        <thead><tr><th>Employee</th><th>Dates</th><th>Back at work</th><th>Status</th><th>Actual return</th></tr></thead>
        <tbody>
          {out.length === 0 && <tr><td colSpan={5} className="text-sm text-mut">Nobody is out today.</td></tr>}
          {out.map((r) => (
            <tr key={r.id}>
              <td>{r.user.name}<div className="text-sm text-mut">{r.user.role.name}</div></td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td>{fmtDay(r.reportBackDate)}</td><td><Chip s={status(r.reportBackDate)} /></td>
              <td><form action={recordReturn} className="flex gap-2"><input type="hidden" name="id" value={r.id} /><input className="rounded-xl border border-fld bg-card text-ink h-9 px-3 text-sm" type="date" name="date" defaultValue={today} /><button className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-9 px-3.5 text-sm border border-ac bg-transparent text-ac">Record return</button></form></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <h2 className="text-base font-medium">Starting soon</h2>
      <div className="rounded-2xl border border-line bg-card"><table className="w-full border-collapse text-sm max-[700px]:block max-[700px]:overflow-x-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-mut [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle"><tbody>
        {next.length === 0 && <tr><td className="text-sm text-mut">No approved leave coming up.</td></tr>}
        {next.map((r) => <tr key={r.id}><td>{r.user.name}<div className="text-sm text-mut">{r.user.role.name}</div></td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td><Chip s="APPROVED" /></td></tr>)}
      </tbody></table></div>
    </>
  );
}
