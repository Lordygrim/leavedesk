// Data access layer: the real security boundary. Every page, action and route handler calls these.
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "./db";
import { getSessionUserId } from "./session";
export const getUser = cache(async () => {
  const id = await getSessionUserId();
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  return u?.active ? u : null; // deactivated people are signed out immediately
});
export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  return u;
}
export async function requireAdmin() {
  const u = await requireUser(); // the admin flag is read from the database (via the role), not trusted from the token
  if (!u.role.isAdmin) notFound();
  return u;
}
