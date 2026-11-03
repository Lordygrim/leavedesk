import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { reportBack, workingDays } from "../lib/dates";
const p = new PrismaClient();
async function main() {
  for (const m of [p.notification, p.auditLog, p.leaveRequest, p.user, p.role, p.leaveType, p.holiday] as any[]) await m.deleteMany();
  const hash = await bcrypt.hash("Password123!", 10);
  // Law firm roles. isAdmin = can open the HR dashboard. selfApprove = own leave is auto-approved (the owner).
  const roleDefs = [
    { name: "Managing Partner", isAdmin: true, selfApprove: true }, { name: "HR Manager", isAdmin: true },
    { name: "Partner" }, { name: "Senior Associate" }, { name: "Associate" }, { name: "Pupil" }, { name: "Paralegal" },
    { name: "Legal Secretary" }, { name: "Law Clerk" }, { name: "Receptionist" }, { name: "Accountant" }, { name: "Office Administrator" },
  ];
  const roles: Record<string, string> = {};
  for (const r of roleDefs) roles[r.name] = (await p.role.create({ data: r })).id;
  const people = [
    ["Michael Sila", "Managing Partner", "Management", "michaelsila@company.co.ke"], ["Susan Wambui", "HR Manager", "Human Resources", "susan.wambui@company.co.ke"],
    ["Michael Muoki", "Associate", "Litigation", "michaelmuoki@company.co.ke"], ["Daniel Mutua", "Partner", "Conveyancing", ""],
    ["Faith Chebet", "Senior Associate", "Corporate and Commercial", ""], ["Kevin Kamau", "Paralegal", "Litigation", ""],
    ["Joy Achieng", "Legal Secretary", "Administration", ""], ["Peter Mwangi", "Law Clerk", "Conveyancing", ""], ["Brian Otieno", "Accountant", "Finance", ""],
  ];
  const users: Record<string, string> = {};
  for (const [name, role, department, mail] of people) {
    const u = await p.user.create({ data: { name, roleId: roles[role], department, passwordHash: hash, email: mail || name.toLowerCase().replace(" ", ".") + "@company.co.ke" } });
    users[name] = u.id;
  }
  const types: Record<string, string> = {};
  for (const [name, daysPerYear] of [["Annual", 25], ["Sick", 14], ["Compassionate", 5], ["Paternity", 14], ["Maternity", 90]] as const)
    types[name] = (await p.leaveType.create({ data: { name, daysPerYear } })).id;
  // Fixed-date 2026 holidays only. Add moveable ones (e.g. Eid) in the database and check the official gazette.
  const hol = [["2026-01-01", "New Year's Day"], ["2026-04-03", "Good Friday"], ["2026-04-06", "Easter Monday"], ["2026-05-01", "Labour Day"], ["2026-06-01", "Madaraka Day"], ["2026-10-10", "Utamaduni Day"], ["2026-10-20", "Mashujaa Day"], ["2026-12-12", "Jamhuri Day"], ["2026-12-25", "Christmas Day"], ["2026-12-26", "Boxing Day"]];
  for (const [date, name] of hol) await p.holiday.create({ data: { date, name } });
  const h = new Set(hol.map((x) => x[0]));
  const reqs = [
    ["Michael Muoki", "2026-11-02", "2026-11-06", "PENDING"], ["Brian Otieno", "2026-11-09", "2026-11-13", "PENDING"],
    ["Peter Mwangi", "2026-11-09", "2026-11-13", "APPROVED"], ["Kevin Kamau", "2026-10-26", "2026-10-30", "APPROVED"],
    ["Joy Achieng", "2026-10-19", "2026-10-23", "APPROVED"], ["Faith Chebet", "2026-10-27", "2026-10-28", "APPROVED"],
    ["Michael Muoki", "2026-08-12", "2026-08-14", "APPROVED"],
  ];
  for (const [n, s, e, status] of reqs)
    await p.leaveRequest.create({ data: { userId: users[n], typeId: types.Annual, startDate: s, endDate: e, workingDays: workingDays(s, e, h), reportBackDate: reportBack(e, h), status, decidedBy: status === "APPROVED" ? "Susan Wambui" : null, actualReturnDate: s < "2026-10-01" ? reportBack(e, h) : null } });
  await p.auditLog.create({ data: { actor: "System", action: "Seeded demo data", detail: "Sample law firm staff and requests" } });
}
main().finally(() => p.$disconnect());
