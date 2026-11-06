import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { balance } from "@/lib/leave";
import { decideRequest } from "@/lib/actions";
import { fmt, fmtDay } from "@/lib/dates";
import { Chip } from "@/components/ui";
const ERR: Record<string, string> = { self: "You can't decide your own request. Ask another HR admin.", reason: "Add a reason to decline.", balance: "The employee doesn't have enough days left.", invalid: "Something went wrong. Please try again." };
export default async function Review({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const r = await prisma.leaveRequest.findUnique({ where: { id }, include: { user: { include: { role: true } }, type: true } });
  if (!r) notFound();
  const b = await balance(r.userId, r.typeId);
  return (
    <>
      <Link className="text-ac" href="/admin/requests">← Requests</Link>
      <h1 className="text-3xl font-medium">Review request</h1>
      {sp.error && <div className="rounded-xl bg-rjb px-4 py-3 text-rjt">{ERR[sp.error]}</div>}
      <div className="rounded-2xl border border-line bg-card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4"><div><b>{r.user.name}</b><div className="text-sm text-mut">{r.user.role.name} · {r.user.department}</div></div><Chip s={r.status} /></div>
        <div>{r.type.name} leave, {fmt(r.startDate)} to {fmt(r.endDate)}</div>
        <div className="text-sm text-mut">{r.workingDays} working days · back at work {fmtDay(r.reportBackDate)} · {b.left} days left now, {b.left - r.workingDays} after approval</div>
        {r.note && <div className="text-sm text-mut">Note: {r.note}</div>}
      </div>
      {r.status === "PENDING" && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <form action={decideRequest} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5">
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="decision" value="APPROVED" />
            <h2 className="text-base font-medium">Approve</h2>
            <p className="text-sm text-mut">The employee is notified straight away, with their back-at-work date.</p>
            <button className="inline-flex h-12 cursor-pointer items-center justify-center self-start rounded-xl bg-ac px-8 text-base font-medium text-act">Approve request</button>
          </form>
          <form action={decideRequest} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5">
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="decision" value="DECLINED" />
            <h2 className="text-base font-medium">Decline</h2>
            <label className="flex flex-col gap-1.5 text-sm text-mut">Reason for declining<input className="rounded-xl border border-fld bg-card text-ink h-12 w-full px-3.5 text-base" name="reason" required /></label>
            <button className="inline-flex h-12 cursor-pointer items-center justify-center self-start rounded-xl border border-ac bg-transparent px-8 text-base font-medium text-ac">Decline request</button>
          </form>
        </div>
      )}
    </>
  );
}
