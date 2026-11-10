import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { fmt } from "@/lib/dates";
import { Chip } from "@/components/ui";
import { btnSm, card, h1, h2, muted, note, tbl } from "@/components/styles";
export default async function Requests({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const inc = { user: { include: { role: true } }, type: true };
  const mine = { user: { orgId: admin.orgId } };
  const pending = await prisma.leaveRequest.findMany({ where: { ...mine, status: "PENDING" }, include: inc, orderBy: { createdAt: "asc" } });
  const done = await prisma.leaveRequest.findMany({ where: { ...mine, status: { in: ["APPROVED", "DECLINED"] } }, include: inc, orderBy: { startDate: "desc" }, take: 10 });
  return (
    <>
      <h1 className={h1}>Leave requests</h1>
      {sp.done && <div className={note}>{sp.done === "approved" ? "Request approved. The employee has been notified." : "Request declined. The employee has been notified."}</div>}
      <div className={card}><table className={tbl}>
        <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th></th></tr></thead>
        <tbody>
          {pending.length === 0 && <tr><td colSpan={5} className={muted}>No requests waiting.</td></tr>}
          {pending.map((r) => <tr key={r.id}><td>{r.user.name}<div className={muted}>{r.user.role.name}</div></td><td>{r.type.name}</td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td>{r.workingDays}</td><td><Link className={btnSm} href={`/admin/requests/${r.id}`}>Review</Link></td></tr>)}
        </tbody>
      </table></div>
      <h2 className={h2}>Recently decided</h2>
      <div className={card}><table className={tbl}><tbody>
        {done.map((r) => <tr key={r.id}><td>{r.user.name}<div className={muted}>{r.user.role.name}</div></td><td>{r.type.name}</td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td><Chip s={r.status} /></td></tr>)}
      </tbody></table></div>
    </>
  );
}
