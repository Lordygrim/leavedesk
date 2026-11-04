import { prisma } from "./db";
import { sendEmail } from "./mail";
export async function holidays() { return new Set((await prisma.holiday.findMany()).map((h) => h.date)); }
export async function balance(userId: string, typeId: string) {
  const t = await prisma.leaveType.findUniqueOrThrow({ where: { id: typeId } });
  const year = new Date().getFullYear().toString();
  const r = await prisma.leaveRequest.aggregate({ _sum: { workingDays: true }, where: { userId, typeId, status: "APPROVED", startDate: { startsWith: year } } });
  const used = r._sum.workingDays ?? 0;
  return { total: t.daysPerYear, used, left: t.daysPerYear - used };
}
export async function notify(userId: string, title: string, body: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.notification.create({ data: { userId, title, body } });
  if (u) await sendEmail(u.email, title, body);
}
export async function notifyOnce(userId: string, title: string, body: string) {
  if (await prisma.notification.findFirst({ where: { userId, title, body } })) return false;
  await notify(userId, title, body);
  return true;
}
export const audit = (actor: string, action: string, detail: string) => prisma.auditLog.create({ data: { actor, action, detail } });
