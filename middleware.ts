// Quick first check only. Real authorization happens in lib/dal.ts.
// On Next.js 16+, rename this file to proxy.ts and the function to proxy.
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
export async function middleware(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  let signedIn = false, admin = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      signedIn = true;
      admin = payload.admin === true;
    } catch {}
  }
  if (!signedIn) return NextResponse.redirect(new URL("/sign-in", req.url));
  if (req.nextUrl.pathname.startsWith("/admin") && !admin) return NextResponse.redirect(new URL("/home", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|favicon.ico|sign-in|api/cron).*)"] };
