import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { card, ghostSm, h1, tbl } from "@/components/styles";
export default async function Reports() {
  const admin = await requireAdmin();
  const log = await prisma.auditLog.findMany({ where: { orgId: admin.orgId }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <>
      <div className="flex items-center justify-between gap-4"><h1 className={h1}>Reports and audit trail</h1><a className={ghostSm} href="/admin/reports/export">Export requests (CSV)</a></div>
      <div className={card}><table className={tbl}>
        <thead><tr><th>Time</th><th>Who</th><th>What happened</th></tr></thead>
        <tbody>{log.map((l) => <tr key={l.id}><td>{l.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })}</td><td>{l.actor}</td><td>{l.action}{l.detail ? `: ${l.detail}` : ""}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}
