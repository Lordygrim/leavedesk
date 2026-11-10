// Data access layer: the real security boundary. Every page, action and route handler calls these,
// and every query is then limited to the signed-in person's organization (orgId).
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getSessionUserId } from "./session";

// Who counts as an admin: the owner, anyone granted admin access, or anyone whose role is HR.
export const adminWhere: Prisma.UserWhereInput = { OR: [{ isOwner: true }, { isAdmin: true }, { role: { grantsAdmin: true } }] };
export const isAdminUser = (u: { isOwner: boolean; isAdmin: boolean; role: { grantsAdmin: boolean } }) => u.isOwner || u.isAdmin || u.role.grantsAdmin;

export const getUser = cache(async () => {
  const id = await getSessionUserId();
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id }, include: { role: true, org: true, manager: true } });
  return u?.active ? u : null; // deactivated people are signed out immediately
});
export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  return u;
}
export async function requireAdmin() {
  const u = await requireUser(); // admin status is read from the database, never trusted from the token
  if (!isAdminUser(u)) notFound();
  return u;
}
