import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { balance } from "@/lib/leave";
import { fmt, fmtDay } from "@/lib/dates";
import { Chip, Ring } from "@/components/ui";
export default async function Home({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const annual = await prisma.leaveType.findUniqueOrThrow({ where: { name: "Annual" } });
  const b = await balance(u.id, annual.id);
  const reqs = await prisma.leaveRequest.findMany({ where: { userId: u.id }, include: { type: true }, orderBy: { startDate: "desc" }, take: 3 });
  const pending = (await prisma.leaveRequest.aggregate({ _sum: { workingDays: true }, where: { userId: u.id, status: "PENDING" } }))._sum.workingDays ?? 0;
  return (
    <>
      <h1 className="text-3xl font-medium">Hello, {u.name.split(" ")[0]}</h1>
      {sp.sent && <div className="rounded-xl bg-olb px-4 py-3 text-olt">{sp.sent === "auto" ? "Your leave is recorded and approved." : "Request sent. You will get an alert when it is decided."}</div>}
      <div className="rounded-2xl border border-line bg-card p-5 flex items-center justify-between gap-4" style={{ justifyContent: "flex-start", gap: 24 }}>
        <Ring left={b.left} total={b.total} />
        <div><div className="text-sm text-mut">Annual leave remaining</div><div style={{ fontSize: 20, fontWeight: 500 }}>{b.left} of {b.total} days</div><div className="text-sm text-mut">{pending} days awaiting approval</div></div>
      </div>
      <div className="flex items-center justify-between gap-4"><h2 className="text-base font-medium">Your leave</h2><Link className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-9 px-3.5 text-sm bg-ac text-act" href="/request">Request leave</Link></div>
      {reqs.length === 0 && <p className="text-sm text-mut">No leave yet. Request your first days off.</p>}
      {reqs.map((r) => (
        <div className="rounded-2xl border border-line bg-card p-5 flex items-center justify-between gap-4" key={r.id}>
          <div><b style={{ fontWeight: 500 }}>{fmt(r.startDate)} to {fmt(r.endDate)}</b><div className="text-sm text-mut">{r.type.name} · back {fmtDay(r.reportBackDate)}</div></div>
          <Chip s={r.status} />
        </div>
      ))}
    </>
  );
}
