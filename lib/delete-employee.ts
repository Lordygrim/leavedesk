"use server";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { requireAdmin } from "./dal";
import { audit } from "./leave";

// Permanently removes someone who has left the firm, together with their leave requests and notifications.
export async function deleteEmployee(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id")), confirm = String(fd.get("confirm") ?? "").trim().toLowerCase();
  const back = `/admin/employees/${id}?error=`;
  const target = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!target) return redirect("/admin/employees");
  if (id === admin.id) return redirect(back + "selfdelete");
  if (confirm !== target.name.toLowerCase()) return redirect(back + "confirm");
  const others = await prisma.user.count({ where: { id: { not: id }, active: true, role: { isAdmin: true } } });
  if (target.active && target.role.isAdmin && others < 1) return redirect(back + "lastadmin");
  const removed = await prisma.leaveRequest.count({ where: { userId: id } });
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.leaveRequest.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);
  await audit(admin.name, "Deleted employee", `${target.name} (${target.email}), ${target.role.name}; ${removed} leave requests removed`);
  return redirect("/admin/employees?deleted=1");
}
