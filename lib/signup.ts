import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
// Remembers, for one hour, which confirmed sign-up is being finished in this browser.
export const pendingToken = (id: string) => new SignJWT({}).setSubject(id).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(key());
export const pendingCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 3600 };
export async function getPendingAccount() {
  const t = (await cookies()).get("signup_pending")?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    const acc = payload.sub ? await prisma.pendingAccount.findUnique({ where: { id: payload.sub } }) : null;
    return acc?.confirmedAt ? acc : null; // only confirmed accounts may create an organization
  } catch { return null; }
}
