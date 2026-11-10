import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { deleteEmployee, setAdminAccess, updateEmployee } from "@/lib/actions";
import { btn, card, err, field, ghostSm, h1, h2, lbl, muted, note } from "@/components/styles";
const ERR: Record<string, string> = {
  invalid: "Fill in the email, role and department.", emailtaken: "Another person already uses that email.", short: "The new password must be at least 8 characters.",
  self: "You can't deactivate yourself.", lastadmin: "At least one active admin is required.",
  owner: "The organization owner always has admin access.", hrrole: "This person's admin access comes from their HR role. Change their role to remove it.",
  selfdelete: "You can't delete your own account.", ownerdelete: "The organization owner can't be deleted.",
  confirm: "The name you typed does not match, so nothing was deleted.",
};
export default async function EditEmployee({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; done?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const u = await prisma.user.findFirst({ where: { id, orgId: admin.orgId }, include: { role: true } });
  if (!u) notFound();
  const roles = await prisma.role.findMany({ where: { orgId: admin.orgId }, orderBy: { name: "asc" } });
  const others = await prisma.user.findMany({ where: { orgId: admin.orgId, active: true, NOT: { id: u.id } }, include: { role: true }, orderBy: { name: "asc" } });
  const how = u.isOwner ? "This person created the organization, so they always have admin access." : u.role.grantsAdmin ? "This person has admin access automatically because their role is HR." : u.isAdmin ? "This person has admin access, granted by the owner or another admin." : "This person does not have admin access.";
  return (
    <>
      <Link className="text-ac" href="/admin/employees">← Employees</Link>
      <h1 className={h1}>{u.name}</h1>
      <p className={muted}>{u.email}</p>
      {sp.error && <div className={err}>{ERR[sp.error]}</div>}
      {sp.done && <div className={note}>{sp.done === "granted" ? "Admin access granted. They have been notified." : "Admin access rescinded. They have been notified."}</div>}
      <form action={updateEmployee} className={`${card} flex max-w-xl flex-col gap-4 p-6`}>
        <input type="hidden" name="id" value={u.id} />
        <label className={lbl}>Work email (use their official address)<input className={field} type="email" name="email" defaultValue={u.email} required /></label>
        <label className={lbl}>Role<select className={field} name="roleId" defaultValue={u.roleId}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.grantsAdmin ? " (admin)" : ""}</option>)}</select></label>
        <label className={lbl}>Reports to (approves their leave, along with the admins)<select className={field} name="managerId" defaultValue={u.managerId ?? ""}><option value="">No one (only admins approve)</option>{others.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.role.name})</option>)}</select></label>
        <label className={lbl}>Department or practice area<input className={field} name="department" defaultValue={u.department} required /></label>
        <label className={lbl}>Set a new password (leave empty to keep the current one)<input className={field} name="password" minLength={8} /></label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4" />Active (untick to stop this person signing in)</label>
        <button className={`${btn} self-start`}>Save changes</button>
      </form>
      <section className={`${card} flex max-w-xl flex-col gap-4 p-6`}>
        <h2 className={h2}>Admin access</h2>
        <p className={muted}>{how} Admins can open the HR dashboard, approve leave and manage people and policies. Giving a person an HR role also gives them admin access automatically.</p>
        {!u.isOwner && !u.role.grantsAdmin && (
          <form action={setAdminAccess}>
            <input type="hidden" name="id" value={u.id} /><input type="hidden" name="grant" value={u.isAdmin ? "0" : "1"} />
            <button className={u.isAdmin ? ghostSm : btn}>{u.isAdmin ? "Rescind admin access" : "Give admin access"}</button>
          </form>
        )}
      </section>
      {!u.isOwner && (
        <section className="flex max-w-xl flex-col gap-4 rounded-2xl border border-rjt p-6">
          <h2 className="text-base font-medium text-rjt">Delete employee</h2>
          <p className={muted}>Use this when someone has left. It permanently removes {u.name}, their leave requests and their notifications. The audit trail keeps a record that the deletion happened. If you only want to stop them signing in, untick Active above instead.</p>
          <a className={`${ghostSm} self-start`} href="/admin/reports/export">Export the leave report first (CSV)</a>
          <form action={deleteEmployee} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={u.id} />
            <label className={lbl}>Type &quot;{u.name}&quot; to confirm<input className={field} name="confirm" autoComplete="off" required /></label>
            <button className="inline-flex h-12 cursor-pointer items-center justify-center self-start rounded-xl border border-rjt bg-transparent px-8 text-base font-medium text-rjt hover:bg-rjt hover:text-bg">Delete permanently</button>
          </form>
        </section>
      )}
    </>
  );
}
