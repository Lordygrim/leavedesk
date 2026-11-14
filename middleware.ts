// Quick first check only: is there a valid login? Who is an admin is decided in lib/dal.ts from the database,
// so giving or removing admin access takes effect straight away, without signing out and in.
// On Next.js 16+, rename this file to proxy.ts and the function to proxy.
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
export async function middleware(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  let signedIn = false;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      signedIn = true;
    } catch {}
  }
  if (!signedIn) return NextResponse.redirect(new URL("/sign-in", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|favicon.ico|sign-in|sign-up|forgot-password|reset-password|api/cron|api/auth).*)"] };
