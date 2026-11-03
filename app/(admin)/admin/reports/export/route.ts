import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
export async function GET() {
  await requireAdmin();
  const rows = await prisma.leaveRequest.findMany({ include: { user: { include: { role: true } }, type: true }, orderBy: { createdAt: "desc" } });
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["Employee,Position,Type,Start,End,Working days,Back at work,Status,Actual return",
    ...rows.map((r) => [r.user.name, r.user.role.name, r.type.name, r.startDate, r.endDate, r.workingDays, r.reportBackDate, r.status, r.actualReturnDate].map(q).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="leave-report.csv"' } });
}
