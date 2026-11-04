import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { markAllRead } from "@/lib/actions";
import { card, ghostSm, h1, muted } from "@/components/styles";
export default async function Alerts() {
  const u = await requireUser();
  const items = await prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const unread = items.filter((n) => !n.read).length;
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className={h1}>Notifications</h1>
        {unread > 0 && <form action={markAllRead}><button className={ghostSm}>Mark all as read ({unread})</button></form>}
      </div>
      {items.length === 0 && <p className={muted}>You are all caught up.</p>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {items.map((n) => (
          <div className={`${card} flex flex-col gap-1 p-5 ${n.read ? "" : "border-ac"}`} key={n.id}>
            <b className="font-medium">{!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-ac" />}{n.title}</b>
            <div className={muted}>{n.body}</div>
            <div className={muted}>{n.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })}</div>
          </div>
        ))}
      </div>
    </>
  );
}
