import { prisma } from "./db";
import { totalDays, type Allowance } from "./allowance";
import { DEFAULT_HOLIDAYS, OTHER_TYPES, isHrRole } from "./defaults";
// Organization names are unique (ignoring capitals) because people join an organization by typing its name.
export const orgNameTaken = async (name: string, exceptId?: string) =>
  !!(await prisma.organization.findFirst({ where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) } }));

// Creates an organization with its starter roles, leave types and holidays, and its owner. Used by both sign-up paths.
export async function createOrganization(a: { orgName: string; name: string; title: string; email: string; passwordHash: string; hasPassword: boolean; googleId: string | null; allowance: Allowance }) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: a.orgName, leavePeriod: a.allowance.period, leaveRule: a.allowance.rule, periodDays: a.allowance.days.join(",") } });
    const roleNames = [a.title, "HR Manager", "Manager", "Staff"].filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
    const roleIds: Record<string, string> = {};
    for (const n of roleNames) roleIds[n] = (await tx.role.create({ data: { orgId: org.id, name: n, grantsAdmin: isHrRole(n) } })).id;
    await tx.leaveType.create({ data: { orgId: org.id, name: "Annual", daysPerYear: totalDays(a.allowance), quarterly: true } });
    for (const [n, d] of OTHER_TYPES) await tx.leaveType.create({ data: { orgId: org.id, name: n, daysPerYear: d } });
    for (const [date, n] of DEFAULT_HOLIDAYS) await tx.holiday.create({ data: { orgId: org.id, date, name: n } });
    const u = await tx.user.create({ data: { orgId: org.id, name: a.name, email: a.email, passwordHash: a.passwordHash, hasPassword: a.hasPassword, googleId: a.googleId, roleId: roleIds[a.title], department: "Management", isOwner: true } });
    await tx.auditLog.create({ data: { orgId: org.id, actor: a.name, action: "Created organization", detail: a.orgName } });
    return u;
  });
}
