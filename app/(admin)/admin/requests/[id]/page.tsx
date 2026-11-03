import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { balance } from "@/lib/leave";
import { decideRequest } from "@/lib/actions";
import { fmt, fmtDay } from "@/lib/dates";
import { Chip } from "@/components/ui";
const ERR: Record<string, string> = { self: "You can't decide your own request. Ask another HR admin.", reason: "Add a reason to decline.", balance: "The employee doesn't have enough days left." };
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
        <form action={decideRequest} className="rounded-2xl border border-line bg-card p-5 flex flex-col gap-4">
          <input type="hidden" name="id" value={r.id} />
          <label className="flex flex-col gap-1.5 text-sm text-mut">Reason (required to decline)<input className="rounded-xl border border-fld bg-card text-ink h-12 w-full px-3.5 text-base" name="reason" /></label>
          <div className="flex gap-2"><button className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-12 px-5 text-base bg-ac text-act" name="decision" value="APPROVED">Approve</button><button className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-12 px-5 text-base border border-ac bg-transparent text-ac" name="decision" value="DECLINED">Decline</button></div>
          <span className="text-sm text-mut">The employee is notified in the app.</span>
        </form>
      )}
    </>
  );
}
