import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { signOut } from "@/lib/actions";
import ThemeToggle from "@/components/ThemeToggle";
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const u = await requireAdmin();
  return (
    <div className="flex min-h-screen max-[700px]:flex-col">
      <aside className="flex w-[210px] flex-col gap-3.5 border-r border-line bg-sbg px-5 py-6 [&_a]:text-mut [&_a]:no-underline [&_a:hover]:text-ac max-[700px]:w-auto max-[700px]:flex-row max-[700px]:flex-wrap max-[700px]:border-b max-[700px]:border-r-0">
        <b style={{ fontSize: 18 }}>LeaveDesk HR</b>
        <Link href="/admin">Who's on leave</Link><Link href="/admin/requests">Requests</Link><Link href="/admin/employees">Employees</Link><Link href="/admin/reports">Reports</Link>
        <Link href="/home">My leave</Link>
        <div className="flex flex-col gap-4" style={{ marginTop: "auto" }}>
          <span className="text-sm text-mut">{u.name}<br />{u.role.name}</span><ThemeToggle />
          <form action={signOut}><button className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-9 px-3.5 text-sm border border-ac bg-transparent text-ac">Sign out</button></form>
        </div>
      </aside>
      <main className="max-w-[1000px] flex-1 p-7 max-[700px]:p-4 flex flex-col gap-4">{children}</main>
    </div>
  );
}
