import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { signOut } from "@/lib/actions";
import ThemeToggle from "@/components/ThemeToggle";
import { ghostSm } from "@/components/styles";
const links: [string, string][] = [
  ["/admin", "Who's on leave"], ["/admin/requests", "Requests"], ["/admin/team-calendar", "Team calendar"],
  ["/admin/employees", "Employees"], ["/admin/policies", "Policies"], ["/admin/reports", "Reports"], ["/home", "My leave"],
];
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const u = await requireAdmin();
  return (
    <div className="flex min-h-screen max-[700px]:flex-col">
      <aside className="flex w-[210px] shrink-0 flex-col gap-1 border-r border-line bg-sbg px-3 py-6 max-[700px]:w-auto max-[700px]:flex-row max-[700px]:flex-wrap max-[700px]:border-b max-[700px]:border-r-0">
        <b className="px-3 text-lg text-ac">LeaveDesk HR</b>
        <span className="mb-3 px-3 text-sm text-mut">{u.org.name}</span>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-2 text-ink no-underline transition-colors hover:bg-ac hover:text-act">{label}</Link>
        ))}
        <div className="mt-auto flex flex-col items-start gap-3 px-3 max-[700px]:mt-0">
          <span className="text-sm text-mut">{u.name} ({u.role.name})</span>
          <ThemeToggle />
          <form action={signOut}><button className={ghostSm}>Sign out</button></form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-8 max-[700px]:p-4">{children}</main>
    </div>
  );
}
