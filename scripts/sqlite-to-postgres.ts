// One-time copy of your data from the old SQLite file into PostgreSQL. It only READS the SQLite file.
// Run it after PostgreSQL is running, DATABASE_URL points at it, and `npx prisma migrate dev` has created the tables:
//   npm run db:import-sqlite
// It needs the SQLite file at prisma/dev.db (override with SQLITE_URL="file:./something.db", relative to the prisma folder).
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

async function main() {
  // Build a SQLite twin of the schema and generate a second client for it into /generated/sqlite.
  const twin = readFileSync("prisma/schema.prisma", "utf8")
    .replace('provider = "postgresql"', 'provider = "sqlite"')
    .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output   = "../generated/sqlite"')
    .replace('url      = env("DATABASE_URL")', 'url      = env("SQLITE_URL")');
  writeFileSync("prisma/sqlite.schema.prisma", twin);
  process.env.SQLITE_URL = process.env.SQLITE_URL ?? "file:./dev.db";
  execSync("npx prisma generate --schema prisma/sqlite.schema.prisma", { stdio: "inherit" });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: Lite } = require("../generated/sqlite");
  const from = new Lite(), to = new PrismaClient();
  if ((await to.organization.count()) > 0) throw new Error("PostgreSQL already has data. Start from an empty database (npx prisma migrate reset) and run this again.");

  const copy = async (name: string, rows: any[], strip: string[] = []) => {
    const data = rows.map((r) => { const c = { ...r }; for (const k of strip) delete c[k]; return c; });
    if (data.length) await (to as any)[name].createMany({ data });
    console.log(`${name}: ${rows.length}`);
  };
  await copy("organization", await from.organization.findMany());
  await copy("role", await from.role.findMany());
  const users = await from.user.findMany();
  await copy("user", users, ["managerId"]); // supervisors are linked in the next step, once everyone exists
  for (const u of users) if (u.managerId) await to.user.update({ where: { id: u.id }, data: { managerId: u.managerId } });
  await copy("leaveType", await from.leaveType.findMany());
  await copy("leaveRequest", await from.leaveRequest.findMany());
  await copy("holiday", await from.holiday.findMany());
  await copy("closure", await from.closure.findMany());
  await copy("notification", await from.notification.findMany());
  await copy("auditLog", await from.auditLog.findMany());
  await copy("passwordReset", await from.passwordReset.findMany());
  await copy("pendingAccount", await from.pendingAccount.findMany());
  console.log("Done. Check the counts above against what you expect, then open the app.");
}
main().catch((e) => { console.error(e); process.exit(1); });
