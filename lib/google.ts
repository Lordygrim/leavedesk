// Helpers for "Sign in with Google" (OAuth 2.0 authorization code flow, no extra libraries).
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const appUrl = (req: Request) => process.env.APP_URL ?? new URL(req.url).origin;
export type GoogleProfile = { email: string; name: string; sub: string };
// A verified Google profile waiting for the person to finish creating their organization (valid for 15 minutes).
export const pendingGoogleToken = (g: GoogleProfile) => new SignJWT({ email: g.email, name: g.name }).setSubject(g.sub).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(key());
export async function getPendingGoogle(): Promise<GoogleProfile | null> {
  const t = (await cookies()).get("g_pending")?.value;
  if (!t) return null;
  try { const { payload } = await jwtVerify(t, key()); return { email: String(payload.email), name: String(payload.name ?? ""), sub: String(payload.sub) }; } catch { return null; }
}
