// The link in the confirmation email lands here: confirm the account, then continue to creating the organization.
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/google";
import { pendingCookieOptions, pendingToken } from "@/lib/signup";
export async function GET(req: Request) {
  const base = appUrl(req), token = new URL(req.url).searchParams.get("token") ?? "";
  const acc = token ? await prisma.pendingAccount.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } }) : null;
  if (!acc || Date.now() - acc.createdAt.getTime() > 24 * 3600 * 1000) return NextResponse.redirect(`${base}/sign-up?error=badlink`);
  if (await prisma.user.findUnique({ where: { email: acc.email } })) return NextResponse.redirect(`${base}/sign-in?error=exists`);
  await prisma.pendingAccount.update({ where: { id: acc.id }, data: { confirmedAt: new Date(), tokenHash: null } });
  const res = NextResponse.redirect(`${base}/sign-up/organization`);
  res.cookies.set("signup_pending", await pendingToken(acc.id), pendingCookieOptions);
  return res;
}
