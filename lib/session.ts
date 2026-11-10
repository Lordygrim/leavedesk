import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export const SESSION_COOKIE = "session";
export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
export const sessionToken = (userId: string, admin: boolean) => new SignJWT({ admin }).setSubject(userId).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key());
export async function createSession(userId: string, admin: boolean) {
  (await cookies()).set(SESSION_COOKIE, await sessionToken(userId, admin), sessionCookieOptions);
}
export async function getSessionUserId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, key())).payload.sub ?? null; } catch { return null; }
}
export async function destroySession() { (await cookies()).delete(SESSION_COOKIE); }
