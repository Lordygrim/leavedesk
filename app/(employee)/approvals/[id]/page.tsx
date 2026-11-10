import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { balance } from "@/lib/leave";
import { decideRequest } from "@/lib/actions";
import { fmt, fmtDay } from "@/lib/dates";
import { Chip } from "@/components/ui";
import { card, err, field, h1, h2, lbl, muted } from "@/components/styles";
const ERR: Record<string, string> = { self: "You can't decide your own request.", reason: "Add a reason to decline.", balance: "The employee doesn't have enough days left.", invalid: "Something went wrong. Please try again." };
export default async function ReviewTeamRequest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const r = await prisma.leaveRequest.findFirst({ where: { id, user: { managerId: u.id, orgId: u.orgId } }, include: { user: { include: { role: true } }, type: true } });
  if (!r) notFound();
  const b = await balance(r.userId, r.typeId);
  const box = `${card} flex flex-col gap-4 p-5`;
  return (
    <>
      <Link className="text-ac" href="/approvals">← Approvals</Link>
      <h1 className={h1}>Review request</h1>
      {sp.error && <div className={err}>{ERR[sp.error]}</div>}
      <div className={box}>
        <div className="flex items-center justify-between gap-4"><div><b>{r.user.name}</b><div className={muted}>{r.user.role.name} · {r.user.department}</div></div><Chip s={r.status} /></div>
        <div>{r.type.name} leave, {fmt(r.startDate)} to {fmt(r.endDate)}</div>
        <div className={muted}>{r.workingDays} working days · back at work {fmtDay(r.reportBackDate)} · {b.left} days left now, {b.left - r.workingDays} after approval</div>
        {r.note && <div className={muted}>Note: {r.note}</div>}
      </div>
      {r.status === "PENDING" && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <form action={decideRequest} className={box}>
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="APPROVED" /><input type="hidden" name="from" value="approvals" />
            <h2 className={h2}>Approve</h2>
            <p className={muted}>The employee is notified straight away, with their back-at-work date.</p>
            <button className="inline-flex h-12 cursor-pointer items-center justify-center self-start rounded-xl bg-ac px-8 text-base font-medium text-act">Approve request</button>
          </form>
          <form action={decideRequest} className={box}>
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="DECLINED" /><input type="hidden" name="from" value="approvals" />
            <h2 className={h2}>Decline</h2>
            <label className={lbl}>Reason for declining<input className={field} name="reason" required /></label>
            <button className="inline-flex h-12 cursor-pointer items-center justify-center self-start rounded-xl border border-ac bg-transparent px-8 text-base font-medium text-ac">Decline request</button>
          </form>
        </div>
      )}
    </>
  );
}
