import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { signOut } from "@/lib/actions";
import ThemeToggle from "@/components/ThemeToggle";
export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  return (
    <div className="mx-auto max-w-[720px] p-4">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5 pt-3">
        <b style={{ color: "var(--ac)", fontSize: 18 }}>LeaveDesk</b>
        <nav className="flex flex-wrap gap-4 [&_a]:text-mut [&_a]:no-underline [&_a:hover]:text-ac">
          <Link href="/home">Home</Link><Link href="/request">Request leave</Link><Link href="/my-leave">My leave</Link><Link href="/alerts">Alerts</Link>
          {u.role.isAdmin && <Link href="/admin">HR dashboard</Link>}
        </nav>
        <div className="flex items-center gap-2.5 text-right">
          <span className="text-sm text-mut">{u.name}<br />{u.role.name}</span><ThemeToggle />
          <form action={signOut}><button className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-9 px-3.5 text-sm border border-ac bg-transparent text-ac">Sign out</button></form>
        </div>
      </header>
      <main className="flex flex-col gap-4">{children}</main>
    </div>
  );
}
