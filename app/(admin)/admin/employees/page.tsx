import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { balance } from "@/lib/leave";
import { addEmployee } from "@/lib/actions";
import { Ring } from "@/components/ui";
import { btn, card, err, field, ghostSm, h1, lbl, muted, note, tbl } from "@/components/styles";
const ERR: Record<string, string> = { invalid: "Fill in every field with valid values.", short: "The temporary password must be at least 8 characters.", exists: "Someone with that email already exists." };
export default async function Employees({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const annual = await prisma.leaveType.findUniqueOrThrow({ where: { name: "Annual" } });
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { name: "asc" } });
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  const rows = await Promise.all(users.map(async (u) => ({ u, b: await balance(u.id, annual.id) })));
  return (
    <>
      <h1 className={h1}>Employees and balances</h1>
      {sp.error && <div className={err}>{ERR[sp.error]}</div>}
      {sp.deleted && <div className={note}>Employee deleted.</div>}
      <details className={`${card} p-5`} open={!!sp.error}>
        <summary className="cursor-pointer font-medium">Add employee</summary>
        <form action={addEmployee} className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className={lbl}>Full name<input className={field} name="name" required /></label>
          <label className={lbl}>Work email<input className={field} type="email" name="email" required /></label>
          <label className={lbl}>Role<select className={field} name="roleId">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label className={lbl}>Department or practice area<input className={field} name="department" required /></label>
          <label className={lbl}>Temporary password (min 8 characters)<input className={field} name="password" minLength={8} required /></label>
          <div className="flex items-end"><button className={btn}>Add employee</button></div>
        </form>
        <p className={`${muted} mt-3`}>Give the person their temporary password yourself. They can change it under Profile.</p>
      </details>
      <div className={card}><table className={tbl}>
        <thead><tr><th>Employee</th><th>Department</th><th>Access</th><th>Annual leave left</th><th></th></tr></thead>
        <tbody>{rows.map(({ u, b }) => (
          <tr key={u.id} className={u.active ? "" : "opacity-60"}>
            <td>{u.name} ({u.role.name})<div className={muted}>{u.email}{u.active ? "" : " · deactivated"}</div></td><td>{u.department}</td><td>{u.role.isAdmin ? "Admin" : "Staff"}</td>
            <td><span className="flex items-center gap-2"><Ring left={b.left} total={b.total} size={32} />{b.left} of {b.total}</span></td>
            <td><Link className={ghostSm} href={`/admin/employees/${u.id}`}>Edit</Link></td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
