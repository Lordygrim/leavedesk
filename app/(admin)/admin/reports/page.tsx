import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
export default async function Reports() {
  await requireAdmin();
  const log = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <>
      <div className="flex items-center justify-between gap-4"><h1 className="text-3xl font-medium">Reports and audit trail</h1><a className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-9 px-3.5 text-sm border border-ac bg-transparent text-ac" href="/admin/reports/export">Export requests (CSV)</a></div>
      <div className="rounded-2xl border border-line bg-card"><table className="w-full border-collapse text-sm max-[700px]:block max-[700px]:overflow-x-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-mut [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle">
        <thead><tr><th>Time</th><th>Who</th><th>What happened</th></tr></thead>
        <tbody>{log.map((l) => <tr key={l.id}><td>{l.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })}</td><td>{l.actor}</td><td>{l.action}: {l.detail}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}
