import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { balance } from "@/lib/leave";
import { fmt, fmtDay } from "@/lib/dates";
import { Chip, Ring } from "@/components/ui";
import { BalancesPanel, HolidaysPanel } from "@/components/panels";
export default async function Home({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const annual = await prisma.leaveType.findUniqueOrThrow({ where: { name: "Annual" } });
  const b = await balance(u.id, annual.id);
  const reqs = await prisma.leaveRequest.findMany({ where: { userId: u.id }, include: { type: true }, orderBy: { startDate: "desc" }, take: 4 });
  const pending = (await prisma.leaveRequest.aggregate({ _sum: { workingDays: true }, where: { userId: u.id, status: "PENDING" } }))._sum.workingDays ?? 0;
  return (
    <>
      <h1 className="text-3xl font-medium">Hello, {u.name.split(" ")[0]}</h1>
      {sp.sent && <div className="rounded-xl bg-olb px-4 py-3 text-olt">{sp.sent === "auto" ? "Your leave is recorded and approved." : "Request sent. You will get an alert when it is decided."}</div>}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex items-center gap-8 rounded-2xl border border-line bg-card p-6">
            <Ring left={b.left} total={b.total} size={160} />
            <div>
              <div className="text-sm text-mut">Annual leave remaining</div>
              <div className="text-2xl font-medium">{b.left} of {b.total} days</div>
              <div className="text-sm text-mut">{pending} days awaiting approval</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-medium">Your leave</h2>
            <Link className="inline-flex h-9 items-center justify-center rounded-xl bg-ac px-3.5 text-sm font-medium text-act no-underline" href="/request">Request leave</Link>
          </div>
          {reqs.length === 0 && <p className="text-sm text-mut">No leave yet. Request your first days off.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {reqs.map((r) => (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5" key={r.id}>
                <div><b className="font-medium">{fmt(r.startDate)} to {fmt(r.endDate)}</b><div className="text-sm text-mut">{r.type.name} · back {fmtDay(r.reportBackDate)}</div></div>
                <Chip s={r.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6"><BalancesPanel userId={u.id} /><HolidaysPanel /></div>
      </div>
    </>
  );
}
