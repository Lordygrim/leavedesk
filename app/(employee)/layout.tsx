import type { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  const unread = await prisma.notification.count({ where: { userId: u.id, read: false } });
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-8 py-3">
          <b className="text-lg text-ac">LeaveDesk</b>
          <nav className="flex flex-wrap gap-6 [&_a]:text-mut [&_a]:no-underline [&_a:hover]:text-ac">
            <Link href="/home">Home</Link><Link href="/request">Request leave</Link><Link href="/my-leave">My leave</Link><Link href="/calendar">Calendar</Link>
            <Link href="/alerts">Alerts{unread > 0 && <span className="ml-1.5 rounded-full bg-ac px-1.5 py-0.5 text-xs text-act">{unread}</span>}</Link>
            <Link href="/profile">Profile</Link>
            {u.role.isAdmin && <Link href="/admin">HR dashboard</Link>}
          </nav>
          <span className="whitespace-nowrap text-sm text-mut">{u.name} ({u.role.name})</span>
        </div>
      </header>
      <main className="flex w-full flex-1 flex-col gap-6 p-8">{children}</main>
    </div>
  );
}
