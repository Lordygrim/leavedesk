import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { DM_Sans } from "next/font/google";
import "./globals.css";
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });
export const metadata = { title: "LeaveDesk" };
export default async function Root({ children }: { children: ReactNode }) {
  // The theme choice lives in a cookie, so it survives signing out and in, and the server renders the right theme with no flash.
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="en" data-theme={theme}>
      <body className={`${dm.variable} bg-bg font-sans leading-snug text-ink antialiased`}>{children}</body>
    </html>
  );
}
