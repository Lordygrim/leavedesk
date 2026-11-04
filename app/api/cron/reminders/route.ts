// Daily job: reminds people the day before they are due back, and alerts admins about overdue returns.
// Protected by CRON_SECRET. On Vercel, set CRON_SECRET in the project settings and it sends the header for you.
import { prisma } from "@/lib/db";
import { notifyOnce } from "@/lib/leave";
import { add, fmtDay, todayNairobi } from "@/lib/dates";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const today = todayNairobi();
  let reminders = 0, overdue = 0;
  const soon = await prisma.leaveRequest.findMany({ where: { status: "APPROVED", actualReturnDate: null, reportBackDate: add(today, 1) } });
  for (const r of soon)
    if (await notifyOnce(r.userId, "Return reminder", `You are due back at work tomorrow, ${fmtDay(r.reportBackDate)}.`)) reminders++;
  const late = await prisma.leaveRequest.findMany({ where: { status: "APPROVED", actualReturnDate: null, reportBackDate: { lt: today } }, include: { user: true } });
  const admins = await prisma.user.findMany({ where: { active: true, role: { isAdmin: true } } });
  for (const r of late)
    for (const a of admins)
      if (await notifyOnce(a.id, "Overdue return", `${r.user.name} was due back ${fmtDay(r.reportBackDate)} and is not recorded as returned.`)) overdue++;
  return Response.json({ reminders, overdue });
}
