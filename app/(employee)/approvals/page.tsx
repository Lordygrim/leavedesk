import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { fmt } from "@/lib/dates";
import { Chip } from "@/components/ui";
import { btnSm, card, h1, h2, muted, note, tbl } from "@/components/styles";
export default async function Approvals({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  if ((await prisma.user.count({ where: { managerId: u.id } })) === 0) notFound(); // only for people who supervise someone
  const inc = { user: { include: { role: true } }, type: true };
  const pending = await prisma.leaveRequest.findMany({ where: { status: "PENDING", user: { managerId: u.id } }, include: inc, orderBy: { createdAt: "asc" } });
  const done = await prisma.leaveRequest.findMany({ where: { status: { in: ["APPROVED", "DECLINED"] }, user: { managerId: u.id } }, include: inc, orderBy: { startDate: "desc" }, take: 8 });
  return (
    <>
      <h1 className={h1}>Approvals</h1>
      <p className={muted}>Leave requests from the people who report to you. Admins can also decide these requests. Whoever decides first settles it.</p>
      {sp.done && <div className={note}>{sp.done === "approved" ? "Request approved. The employee has been notified." : "Request declined. The employee has been notified."}</div>}
      <div className={card}><table className={tbl}>
        <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th></th></tr></thead>
        <tbody>
          {pending.length === 0 && <tr><td colSpan={5} className={muted}>Nothing is waiting for your decision.</td></tr>}
          {pending.map((r) => <tr key={r.id}><td>{r.user.name}<div className={muted}>{r.user.role.name}</div></td><td>{r.type.name}</td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td>{r.workingDays}</td><td><Link className={btnSm} href={`/approvals/${r.id}`}>Review</Link></td></tr>)}
        </tbody>
      </table></div>
      <h2 className={h2}>Recently decided</h2>
      <div className={card}><table className={tbl}><tbody>
        {done.length === 0 && <tr><td className={muted}>Nothing yet.</td></tr>}
        {done.map((r) => <tr key={r.id}><td>{r.user.name}<div className={muted}>{r.user.role.name}</div></td><td>{r.type.name}</td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td><Chip s={r.status} /></td></tr>)}
      </tbody></table></div>
    </>
  );
}
