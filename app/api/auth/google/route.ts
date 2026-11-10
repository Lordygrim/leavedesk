// Step 1: send the person to Google. intent is "signin", "signup" or "link" (connect Google to a signed-in account).
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { appUrl, googleConfigured } from "@/lib/google";
export async function GET(req: Request) {
  const i = new URL(req.url).searchParams.get("intent");
  const intent = i === "signup" || i === "link" ? i : "signin";
  if (!googleConfigured()) return NextResponse.redirect(`${appUrl(req)}${intent === "signup" ? "/sign-up" : intent === "link" ? "/profile" : "/sign-in"}?error=googlesetup`);
  const state = randomBytes(16).toString("hex"), nonce = randomBytes(16).toString("hex");
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string, redirect_uri: `${appUrl(req)}/api/auth/google/callback`, response_type: "code",
    scope: "openid email profile", state, nonce, prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(u.toString());
  res.cookies.set("g_oauth", `${state}.${nonce}.${intent}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return res;
}
