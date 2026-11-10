import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { recordReturn } from "@/lib/actions";
import { fmt, fmtDay, todayNairobi } from "@/lib/dates";
import { Chip } from "@/components/ui";
import { card, fieldSm, ghostSm, h1, h2, muted, tbl } from "@/components/styles";
export default async function Admin() {
  const admin = await requireAdmin();
  const today = todayNairobi();
  const mine = { user: { orgId: admin.orgId } };
  const out = await prisma.leaveRequest.findMany({ where: { ...mine, status: "APPROVED", actualReturnDate: null, startDate: { lte: today } }, include: { user: { include: { role: true } } }, orderBy: { reportBackDate: "asc" } });
  const next = await prisma.leaveRequest.findMany({ where: { ...mine, status: "APPROVED", startDate: { gt: today } }, include: { user: { include: { role: true } } }, orderBy: { startDate: "asc" }, take: 5 });
  const pending = await prisma.leaveRequest.count({ where: { ...mine, status: "PENDING" } });
  const status = (back: string) => (back > today ? "ON_LEAVE" : back === today ? "DUE" : "OVERDUE");
  return (
    <>
      <h1 className={h1}>Who&apos;s on leave</h1>
      <p className={muted}>{out.length} out or due back · {pending} requests waiting for a decision</p>
      <div className={card}><table className={tbl}>
        <thead><tr><th>Employee</th><th>Dates</th><th>Back at work</th><th>Status</th><th>Actual return</th></tr></thead>
        <tbody>
          {out.length === 0 && <tr><td colSpan={5} className={muted}>Nobody is out today.</td></tr>}
          {out.map((r) => (
            <tr key={r.id}>
              <td>{r.user.name}<div className={muted}>{r.user.role.name}</div></td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td>{fmtDay(r.reportBackDate)}</td><td><Chip s={status(r.reportBackDate)} /></td>
              <td><form action={recordReturn} className="flex gap-2"><input type="hidden" name="id" value={r.id} /><input className={fieldSm} type="date" name="date" defaultValue={today} /><button className={ghostSm}>Record return</button></form></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <h2 className={h2}>Starting soon</h2>
      <div className={card}><table className={tbl}><tbody>
        {next.length === 0 && <tr><td className={muted}>No approved leave coming up.</td></tr>}
        {next.map((r) => <tr key={r.id}><td>{r.user.name}<div className={muted}>{r.user.role.name}</div></td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td><Chip s="APPROVED" /></td></tr>)}
      </tbody></table></div>
    </>
  );
}
