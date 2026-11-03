import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { fmt, fmtDay } from "@/lib/dates";
import { Chip } from "@/components/ui";
export default async function MyLeave() {
  const u = await requireUser();
  const reqs = await prisma.leaveRequest.findMany({ where: { userId: u.id }, include: { type: true }, orderBy: { startDate: "desc" } });
  return (
    <>
      <h1 className="text-3xl font-medium">My leave</h1>
      {reqs.length === 0 && <p className="text-sm text-mut">No requests yet.</p>}
      {reqs.map((r) => (
        <div className="rounded-2xl border border-line bg-card p-5 flex items-center justify-between gap-4" key={r.id}>
          <div>
            <b style={{ fontWeight: 500 }}>{fmt(r.startDate)} to {fmt(r.endDate)}</b>
            <div className="text-sm text-mut">{r.type.name} · {r.workingDays} working days · back {fmtDay(r.reportBackDate)}</div>
            {r.decisionReason && <div className="text-sm text-mut">Reason: {r.decisionReason}</div>}
            {r.actualReturnDate && <div className="text-sm text-mut">Returned {fmtDay(r.actualReturnDate)}</div>}
          </div>
          <Chip s={r.status} />
        </div>
      ))}
    </>
  );
}
