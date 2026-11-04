import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
export default async function Alerts() {
  const u = await requireUser();
  const items = await prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <>
      <h1 className="text-3xl font-medium">Notifications</h1>
      {items.length === 0 && <p className="text-sm text-mut">You're all caught up.</p>}
      <div className="grid items-start gap-4 lg:grid-cols-2">{items.map((n) => (
        <div className="rounded-2xl border border-line bg-card p-5" key={n.id}><b style={{ fontWeight: 500 }}>{n.title}</b><div className="text-sm text-mut">{n.body}</div><div className="text-sm text-mut">{n.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })}</div></div>
      ))}</div>
    </>
  );
}
