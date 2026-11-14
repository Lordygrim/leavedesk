// Step 2: Google sends the person back here with a code. We check it, then sign in, link, or start sign-up.
// Every failure is logged to the terminal with its exact reason, and shown on the page in development.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/dal";
import { SESSION_COOKIE, getSessionUserId, sessionCookieOptions, sessionToken } from "@/lib/session";
import { appUrl } from "@/lib/google";
import { pendingCookieOptions, pendingToken } from "@/lib/signup";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function GET(req: Request) {
  const url = new URL(req.url), base = appUrl(req);
  const saved = (await cookies()).get("g_oauth")?.value;
  const [s, nonce, intent] = (saved ?? "").split(".");
  const page = intent === "signup" ? "/sign-up" : intent === "link" ? "/profile" : "/sign-in";
  const respond = (path: string) => { const r = NextResponse.redirect(`${base}${path}`); r.cookies.delete("g_oauth"); return r; };
  const fail = (why: string, code = "google") => { console.error(`[google ${intent ?? "?"}] ${why}`); return respond(`${page}?error=${code}&why=${encodeURIComponent(why)}`); };

  const clientId = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  const gErr = url.searchParams.get("error");
  if (gErr) return fail(`Google returned: ${gErr} (for example, access was cancelled or denied)`);
  if (!clientId || !secret) return fail("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env (restart the server after editing it)");
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  if (!code || !state) return fail("the address has no code or state");
  if (!saved) return fail("the sign-in cookie is missing. Open the app at localhost:3000 for the whole flow and allow cookies");
  if (s !== state) return fail("state mismatch (the sign-in was started in a different tab or browser)");

  let tokenRes: Response;
  try {
    tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: secret, redirect_uri: `${base}/api/auth/google/callback`, grant_type: "authorization_code" }),
    });
  } catch (e) { return fail(`could not reach Google from the server: ${(e as Error).message}`); }
  if (!tokenRes.ok) return fail(`Google refused the code (${tokenRes.status}): ${(await tokenRes.text()).replace(/\s+/g, " ").slice(0, 300)}`);
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail("Google sent no ID token");
  let p;
  try { p = (await jwtVerify(id_token, JWKS, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: clientId })).payload; }
  catch (e) { return fail(`the ID token check failed: ${(e as Error).message}`); }
  if (p.nonce !== nonce) return fail("nonce mismatch");
  if (p.email_verified !== true) return fail("Google says this email is not verified");
  if (typeof p.email !== "string" || !p.sub) return fail("Google did not send an email address");
  const email = p.email.toLowerCase(), sub = p.sub, name = typeof p.name === "string" ? p.name : email;

  if (intent === "link") { // connect Google to the account that is signed in now
    const me = await getSessionUserId();
    if (!me) return fail("you are not signed in");
    if (await prisma.user.findFirst({ where: { googleId: sub, id: { not: me } } })) return respond("/profile?error=googletaken");
    await prisma.user.update({ where: { id: me }, data: { googleId: sub } });
    return respond("/profile?linked=1");
  }

  let user = await prisma.user.findUnique({ where: { googleId: sub }, include: { role: true } });
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (byEmail && byEmail.googleId && byEmail.googleId !== sub) return fail("that email is linked to a different Google account");
    if (byEmail) { await prisma.user.update({ where: { id: byEmail.id }, data: { googleId: sub } }); user = byEmail; }
  }
  if (user) {
    if (!user.active) return fail(user.joinPending ? "this account is waiting for an admin to approve it" : "this account has been deactivated", user.joinPending ? "pending" : "google");
    const admin = isAdminUser(user);
    const r = respond(admin ? "/admin" : "/home");
    r.cookies.set(SESSION_COOKIE, await sessionToken(user.id, admin), sessionCookieOptions);
    return r;
  }
  if (intent === "signup") { // a new person: Google has confirmed the email, so go on to create the organization
    await prisma.pendingAccount.deleteMany({ where: { email } });
    const acc = await prisma.pendingAccount.create({ data: { email, name, googleId: sub, confirmedAt: new Date() } });
    const r = respond("/sign-up/organization");
    r.cookies.set("signup_pending", await pendingToken(acc.id), pendingCookieOptions);
    return r;
  }
  return fail(`no account uses ${email}`, "nogoogle");
}
