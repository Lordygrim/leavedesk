import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { signOut } from "@/lib/actions";
import ThemeToggle from "@/components/ThemeToggle";
export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-8 py-3">
          <b className="text-lg text-ac">LeaveDesk</b>
          <nav className="flex flex-wrap gap-6 [&_a]:text-mut [&_a]:no-underline [&_a:hover]:text-ac">
            <Link href="/home">Home</Link><Link href="/request">Request leave</Link><Link href="/my-leave">My leave</Link><Link href="/alerts">Alerts</Link>
            {u.role.isAdmin && <Link href="/admin">HR dashboard</Link>}
          </nav>
          <div className="flex items-center gap-3 text-right">
            <span className="whitespace-nowrap text-sm text-mut">{u.name} ({u.role.name})</span><ThemeToggle />
            <form action={signOut}><button className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-ac bg-transparent px-3.5 text-sm font-medium text-ac">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="flex w-full flex-1 flex-col gap-6 p-8">{children}</main>
    </div>
  );
}
