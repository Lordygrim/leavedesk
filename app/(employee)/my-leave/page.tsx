import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { cancelRequest } from "@/lib/actions";
import { fmt, fmtDay } from "@/lib/dates";
import { Chip } from "@/components/ui";
import { card, ghostSm, h1, muted } from "@/components/styles";
export default async function MyLeave() {
  const u = await requireUser();
  const reqs = await prisma.leaveRequest.findMany({ where: { userId: u.id }, include: { type: true }, orderBy: { startDate: "desc" } });
  return (
    <>
      <h1 className={h1}>My leave</h1>
      {reqs.length === 0 && <p className={muted}>No requests yet.</p>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {reqs.map((r) => (
          <div className={`${card} flex items-center justify-between gap-4 p-5`} key={r.id}>
            <div className="flex flex-col gap-1">
              <b className="font-medium">{fmt(r.startDate)} to {fmt(r.endDate)}</b>
              <div className={muted}>{r.type.name} · {r.workingDays} working days · back {fmtDay(r.reportBackDate)}</div>
              {r.decisionReason && <div className={muted}>Reason: {r.decisionReason}</div>}
              {r.actualReturnDate && <div className={muted}>Returned {fmtDay(r.actualReturnDate)}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Chip s={r.status} />
              {r.status === "PENDING" && <form action={cancelRequest}><input type="hidden" name="id" value={r.id} /><button className={ghostSm}>Cancel request</button></form>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
