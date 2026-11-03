import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { balance } from "@/lib/leave";
import { Ring } from "@/components/ui";
export default async function Employees() {
  await requireAdmin();
  const annual = await prisma.leaveType.findUniqueOrThrow({ where: { name: "Annual" } });
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { name: "asc" } });
  const rows = await Promise.all(users.map(async (u) => ({ u, b: await balance(u.id, annual.id) })));
  return (
    <>
      <h1 className="text-3xl font-medium">Employees and balances</h1>
      <div className="rounded-2xl border border-line bg-card"><table className="w-full border-collapse text-sm max-[700px]:block max-[700px]:overflow-x-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-mut [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle">
        <thead><tr><th>Employee</th><th>Department</th><th>Access</th><th>Annual leave left</th></tr></thead>
        <tbody>{rows.map(({ u, b }) => (
          <tr key={u.id}><td>{u.name}<div className="text-sm text-mut">{u.role.name}</div></td><td>{u.department}</td><td>{u.role.isAdmin ? "Admin" : "Staff"}</td>
            <td><span className="flex gap-2" style={{ alignItems: "center" }}><Ring left={b.left} total={b.total} size={32} />{b.left} of {b.total}</span></td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
