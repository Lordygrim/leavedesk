import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export async function createSession(userId: string, admin: boolean) {
  const token = await new SignJWT({ admin }).setSubject(userId).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key());
  (await cookies()).set("session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function getSessionUserId() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, key())).payload.sub ?? null; } catch { return null; }
}
export async function destroySession() { (await cookies()).delete("session"); }
