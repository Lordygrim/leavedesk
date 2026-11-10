import type { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdminUser, requireUser } from "@/lib/dal";
export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  const unread = await prisma.notification.count({ where: { userId: u.id, read: false } });
  const team = await prisma.user.count({ where: { managerId: u.id } }); // people who report to this person
  const waiting = team ? await prisma.leaveRequest.count({ where: { status: "PENDING", user: { managerId: u.id } } }) : 0;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-8 py-3">
          <div className="flex items-baseline gap-3"><b className="text-lg text-ac">LeaveDesk</b><span className="text-sm text-mut">{u.org.name}</span></div>
          <nav className="flex flex-wrap gap-6 [&_a]:text-mut [&_a]:no-underline [&_a:hover]:text-ac">
            <Link href="/home">Home</Link><Link href="/request">Request leave</Link><Link href="/my-leave">My leave</Link><Link href="/calendar">Calendar</Link>
            {team > 0 && <Link href="/approvals">Approvals{waiting > 0 && <span className="ml-1.5 rounded-full bg-ac px-1.5 py-0.5 text-xs text-act">{waiting}</span>}</Link>}
            <Link href="/alerts">Alerts{unread > 0 && <span className="ml-1.5 rounded-full bg-ac px-1.5 py-0.5 text-xs text-act">{unread}</span>}</Link>
            <Link href="/profile">Profile</Link>
            {isAdminUser(u) && <Link href="/admin">HR dashboard</Link>}
          </nav>
          <span className="whitespace-nowrap text-sm text-mut">{u.name} ({u.role.name})</span>
        </div>
      </header>
      <main className="flex w-full flex-1 flex-col gap-6 p-8">{children}</main>
    </div>
  );
}
