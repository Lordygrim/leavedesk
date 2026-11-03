import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { fmt } from "@/lib/dates";
import { Chip } from "@/components/ui";
export default async function Requests() {
  await requireAdmin();
  const pending = await prisma.leaveRequest.findMany({ where: { status: "PENDING" }, include: { user: { include: { role: true } }, type: true }, orderBy: { createdAt: "asc" } });
  const done = await prisma.leaveRequest.findMany({ where: { status: { not: "PENDING" } }, include: { user: { include: { role: true } }, type: true }, orderBy: { startDate: "desc" }, take: 10 });
  return (
    <>
      <h1 className="text-3xl font-medium">Leave requests</h1>
      <div className="rounded-2xl border border-line bg-card"><table className="w-full border-collapse text-sm max-[700px]:block max-[700px]:overflow-x-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-mut [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle">
        <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th></th></tr></thead>
        <tbody>
          {pending.length === 0 && <tr><td colSpan={5} className="text-sm text-mut">No requests waiting.</td></tr>}
          {pending.map((r) => <tr key={r.id}><td>{r.user.name}<div className="text-sm text-mut">{r.user.role.name}</div></td><td>{r.type.name}</td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td>{r.workingDays}</td><td><Link className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-9 px-3.5 text-sm bg-ac text-act" href={`/admin/requests/${r.id}`}>Review</Link></td></tr>)}
        </tbody>
      </table></div>
      <h2 className="text-base font-medium">Recently decided</h2>
      <div className="rounded-2xl border border-line bg-card"><table className="w-full border-collapse text-sm max-[700px]:block max-[700px]:overflow-x-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-mut [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle"><tbody>
        {done.map((r) => <tr key={r.id}><td>{r.user.name}<div className="text-sm text-mut">{r.user.role.name}</div></td><td>{r.type.name}</td><td>{fmt(r.startDate)} to {fmt(r.endDate)}</td><td><Chip s={r.status} /></td></tr>)}
      </tbody></table></div>
    </>
  );
}
