import { prisma } from "./db";
export async function holidays() { return new Set((await prisma.holiday.findMany()).map((h) => h.date)); }
export async function balance(userId: string, typeId: string) {
  const t = await prisma.leaveType.findUniqueOrThrow({ where: { id: typeId } });
  const year = new Date().getFullYear().toString();
  const r = await prisma.leaveRequest.aggregate({ _sum: { workingDays: true }, where: { userId, typeId, status: "APPROVED", startDate: { startsWith: year } } });
  const used = r._sum.workingDays ?? 0;
  return { total: t.daysPerYear, used, left: t.daysPerYear - used };
}
export const notify = (userId: string, title: string, body: string) => prisma.notification.create({ data: { userId, title, body } });
export const audit = (actor: string, action: string, detail: string) => prisma.auditLog.create({ data: { actor, action, detail } });
