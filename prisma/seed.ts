import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { inMd, reportBack, workingDays } from "../lib/dates";
import { DEFAULT_HOLIDAYS, OTHER_TYPES, isHrRole } from "../lib/defaults";
const p = new PrismaClient();
async function main() {
  for (const m of [p.passwordReset, p.notification, p.auditLog, p.leaveRequest, p.user, p.role, p.leaveType, p.holiday, p.closure, p.organization] as any[]) await m.deleteMany();
  const hash = await bcrypt.hash("Password123!", 10);
  // H Gichuki & Company Advocates: 0 leave days in Q1, 5 in Q2, 5 in Q3, 0 in Q4 (mandatory leave 22 Dec to 11 Jan instead).
  const org = await p.organization.create({ data: { name: "H Gichuki & Company Advocates", q1Days: 0, q2Days: 5, q3Days: 5, q4Days: 0 } });
  const roleNames = ["Partner", "Associate", "Litigation Clerk", "Conveyancing Clerk", "Conveyancing & Dispatch", "Dispatch & Office Admin", "Receptionist"];
  const roles: Record<string, string> = {};
  for (const name of roleNames) roles[name] = (await p.role.create({ data: { orgId: org.id, name, grantsAdmin: isHrRole(name) } })).id;
  await p.closure.create({ data: { orgId: org.id, name: "Mandatory leave", startMd: "12-22", endMd: "01-11" } });
  const types: Record<string, string> = {};
  types.Annual = (await p.leaveType.create({ data: { orgId: org.id, name: "Annual", daysPerYear: 10, quarterly: true } })).id;
  for (const [name, daysPerYear] of OTHER_TYPES) types[name] = (await p.leaveType.create({ data: { orgId: org.id, name, daysPerYear } })).id;
  for (const [date, name] of DEFAULT_HOLIDAYS) await p.holiday.create({ data: { orgId: org.id, date, name } });
  const hset = new Set(DEFAULT_HOLIDAYS.map((h) => h[0]));
  const off = (d: string) => hset.has(d) || inMd(d.slice(5), "12-22", "01-11");
  // name, role, department, email, owner, admin. Emails are placeholders: change them under Employees.
  const people: [string, string, string, string, boolean, boolean][] = [
    ["H. Gichuki", "Partner", "Management", "h.gichuki@company.co.ke", true, true],
    ["Loise Mwai", "Associate", "Legal", "loise.mwai@company.co.ke", false, true],
    ["Grace Mincha", "Associate", "Legal", "grace.mincha@company.co.ke", false, false],
    ["Caesar Kiune", "Litigation Clerk", "Litigation", "caesar.kiune@company.co.ke", false, false],
    ["Brian Mulama", "Conveyancing Clerk", "Conveyancing", "brian.mulama@company.co.ke", false, false],
    ["Esther Njoki", "Conveyancing & Dispatch", "Conveyancing and Dispatch", "esther.njoki@company.co.ke", false, false],
    ["Karen Wachira", "Dispatch & Office Admin", "Administration", "karen.wachira@company.co.ke", false, false],
    ["Sylvia Maina", "Receptionist", "Front office", "sylvia.maina@company.co.ke", false, false],
  ];
  const users: Record<string, string> = {};
  for (const [name, role, department, email, isOwner, isAdmin] of people)
    users[name] = (await p.user.create({ data: { orgId: org.id, name, roleId: roles[role], department, email, isOwner, isAdmin, passwordHash: hash } })).id;
  // Who approves whose leave (placeholders: change them under Employees > Edit). Admins can approve anyone's.
  const reportsTo: Record<string, string> = { "Loise Mwai": "H. Gichuki", "Grace Mincha": "H. Gichuki", "Caesar Kiune": "Grace Mincha", "Brian Mulama": "Loise Mwai", "Esther Njoki": "Loise Mwai", "Karen Wachira": "Loise Mwai", "Sylvia Maina": "Loise Mwai" };
  for (const [n, m] of Object.entries(reportsTo)) await p.user.update({ where: { id: users[n] }, data: { managerId: users[m] } });
  const reqs: [string, string, string, string][] = [
    ["Grace Mincha", "2026-07-13", "2026-07-17", "APPROVED"], ["Caesar Kiune", "2026-05-18", "2026-05-20", "APPROVED"],
    ["Esther Njoki", "2027-04-12", "2027-04-16", "PENDING"], ["Sylvia Maina", "2027-07-05", "2027-07-09", "PENDING"],
  ];
  for (const [n, s, e, status] of reqs)
    await p.leaveRequest.create({ data: { userId: users[n], typeId: types.Annual, startDate: s, endDate: e, workingDays: workingDays(s, e, off), reportBackDate: reportBack(e, off),
      status, note: "Family time", decidedBy: status === "APPROVED" ? "H. Gichuki" : null, actualReturnDate: status === "APPROVED" ? reportBack(e, off) : null } });
  await p.auditLog.create({ data: { orgId: org.id, actor: "System", action: "Seeded demo data", detail: "H Gichuki & Company Advocates and its staff" } });
}
main().finally(() => p.$disconnect());
