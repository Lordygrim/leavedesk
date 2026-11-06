import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { updateEmployee } from "@/lib/actions";
import { deleteEmployee } from "@/lib/delete-employee";
import { btn, card, err, field, ghostSm, h1, lbl, muted } from "@/components/styles";
const ERR: Record<string, string> = {
  invalid: "Fill in the role and department.", short: "The new password must be at least 8 characters.",
  self: "You can't deactivate yourself or remove your own admin access.", lastadmin: "At least one active admin is required.",
  selfdelete: "You can't delete your own account.", confirm: "The name you typed does not match, so nothing was deleted.",
};
export default async function EditEmployee({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const u = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!u) notFound();
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <Link className="text-ac" href="/admin/employees">← Employees</Link>
      <h1 className={h1}>{u.name}</h1>
      <p className={muted}>{u.email}</p>
      {sp.error && <div className={err}>{ERR[sp.error]}</div>}
      <form action={updateEmployee} className={`${card} flex max-w-xl flex-col gap-4 p-6`}>
        <input type="hidden" name="id" value={u.id} />
        <label className={lbl}>Role<select className={field} name="roleId" defaultValue={u.roleId}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.isAdmin ? " (admin)" : ""}</option>)}</select></label>
        <label className={lbl}>Department or practice area<input className={field} name="department" defaultValue={u.department} required /></label>
        <label className={lbl}>Set a new password (leave empty to keep the current one)<input className={field} name="password" minLength={8} /></label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4" />Active (untick to stop this person signing in)</label>
        <button className={`${btn} self-start`}>Save changes</button>
      </form>
      <section className="flex max-w-xl flex-col gap-4 rounded-2xl border border-rjt p-6">
        <h2 className="text-base font-medium text-rjt">Delete employee</h2>
        <p className="text-sm text-mut">Use this when someone has left the firm. It permanently removes {u.name}, their leave requests and their notifications. The audit trail keeps a record that the deletion happened. If you only want to stop them signing in, untick Active above instead.</p>
        <a className={`${ghostSm} self-start`} href="/admin/reports/export">Export the leave report first (CSV)</a>
        <form action={deleteEmployee} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={u.id} />
          <label className={lbl}>Type &quot;{u.name}&quot; to confirm<input className={field} name="confirm" autoComplete="off" required /></label>
          <button className="inline-flex h-12 cursor-pointer items-center justify-center self-start rounded-xl border border-rjt bg-transparent px-8 text-base font-medium text-rjt hover:bg-rjt hover:text-bg">Delete permanently</button>
        </form>
      </section>
    </>
  );
}
