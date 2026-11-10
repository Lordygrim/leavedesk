// Step 2: Google sends the person back here with a code. We check it, then sign in, link, or start sign-up.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/dal";
import { SESSION_COOKIE, getSessionUserId, sessionCookieOptions, sessionToken } from "@/lib/session";
import { appUrl, pendingGoogleToken } from "@/lib/google";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function GET(req: Request) {
  const url = new URL(req.url), base = appUrl(req);
  const respond = (path: string) => { const r = NextResponse.redirect(`${base}${path}`); r.cookies.delete("g_oauth"); return r; };
  const fail = (c = "google") => respond(`/sign-in?error=${c}`);
  const clientId = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  const saved = (await cookies()).get("g_oauth")?.value;
  if (!clientId || !secret || !code || !state || !saved) return fail();
  const [s, nonce, intent] = saved.split(".");
  if (s !== state) return fail();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: secret, redirect_uri: `${base}/api/auth/google/callback`, grant_type: "authorization_code" }),
  });
  if (!tokenRes.ok) return fail();
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail();
  let p;
  try { p = (await jwtVerify(id_token, JWKS, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: clientId })).payload; } catch { return fail(); }
  if (p.nonce !== nonce || p.email_verified !== true || typeof p.email !== "string" || !p.sub) return fail();
  const email = p.email.toLowerCase(), sub = p.sub, name = typeof p.name === "string" ? p.name : email;

  if (intent === "link") { // connect Google to the account that is signed in now
    const me = await getSessionUserId();
    if (!me) return fail();
    if (await prisma.user.findFirst({ where: { googleId: sub, id: { not: me } } })) return respond("/profile?error=googletaken");
    await prisma.user.update({ where: { id: me }, data: { googleId: sub } });
    return respond("/profile?linked=1");
  }

  let user = await prisma.user.findUnique({ where: { googleId: sub }, include: { role: true } });
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (byEmail && byEmail.googleId && byEmail.googleId !== sub) return fail(); // that email is linked to a different Google account
    if (byEmail) { await prisma.user.update({ where: { id: byEmail.id }, data: { googleId: sub } }); user = byEmail; }
  }
  if (user) {
    if (!user.active) return fail();
    const admin = isAdminUser(user);
    const r = respond(admin ? "/admin" : "/home");
    r.cookies.set(SESSION_COOKIE, await sessionToken(user.id, admin), sessionCookieOptions);
    return r;
  }
  if (intent === "signup") { // new person: finish by creating an organization
    const r = respond("/sign-up?google=1");
    r.cookies.set("g_pending", await pendingGoogleToken({ email, name, sub }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 900 });
    return r;
  }
  return fail("nogoogle");
}
