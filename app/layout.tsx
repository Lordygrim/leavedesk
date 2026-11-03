import type { ReactNode } from "react";
import { DM_Sans } from "next/font/google";
import "./globals.css";
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });
export const metadata = { title: "LeaveDesk" };
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dm.variable} bg-bg font-sans leading-snug text-ink antialiased`}>{children}</body>
    </html>
  );
}
