import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { addHoliday, addLeaveType, deleteHoliday, updateLeaveType } from "@/lib/actions";
import { fmtDay } from "@/lib/dates";
import { btn, btnSm, card, err, field, fieldSm, ghostSm, h1, h2, lbl, muted, tbl } from "@/components/styles";
const ERR: Record<string, string> = { type: "Enter a leave type name and a number of days from 0 to 365.", typeexists: "That leave type already exists.", holiday: "Enter a date and a name for the holiday." };
export default async function Policies({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const types = await prisma.leaveType.findMany({ orderBy: { daysPerYear: "desc" } });
  const hols = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  const roles = await prisma.role.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } });
  return (
    <>
      <h1 className={h1}>Policies</h1>
      {sp.error && <div className={err}>{ERR[sp.error]}</div>}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className={`${card} flex flex-col gap-4 p-5`}>
          <h2 className={h2}>Leave types and days a year</h2>
          <table className={tbl}><tbody>
            {types.map((t) => (
              <tr key={t.id}><td>{t.name}</td><td>
                <form action={updateLeaveType} className="flex gap-2"><input type="hidden" name="id" value={t.id} />
                  <input className={`${fieldSm} w-24`} type="number" name="days" min={0} max={365} defaultValue={t.daysPerYear} /><button className={ghostSm}>Save</button></form>
              </td></tr>
            ))}
          </tbody></table>
          <form action={addLeaveType} className="flex flex-wrap items-end gap-3">
            <label className={lbl}>New leave type<input className={fieldSm} name="name" required /></label>
            <label className={lbl}>Days a year<input className={`${fieldSm} w-24`} type="number" name="days" min={0} max={365} required /></label>
            <button className={btnSm}>Add</button>
          </form>
          <p className={muted}>Changing days a year changes everyone&apos;s balance for the current year straight away.</p>
        </section>
        <section className={`${card} flex flex-col gap-4 p-5`}>
          <h2 className={h2}>Public holidays</h2>
          <p className={muted}>Weekends and these dates are skipped when working days and back-at-work dates are calculated. Add moveable holidays (such as Eid) here each year.</p>
          <table className={tbl}><tbody>
            {hols.map((h) => (
              <tr key={h.id}><td>{h.name}</td><td>{fmtDay(h.date)} {h.date.slice(0, 4)}</td>
                <td><form action={deleteHoliday}><input type="hidden" name="id" value={h.id} /><button className={ghostSm}>Remove</button></form></td></tr>
            ))}
          </tbody></table>
          <form action={addHoliday} className="flex flex-wrap items-end gap-3">
            <label className={lbl}>Date<input className={fieldSm} type="date" name="date" required /></label>
            <label className={lbl}>Name<input className={fieldSm} name="name" required /></label>
            <button className={btnSm}>Add holiday</button>
          </form>
        </section>
      </div>
      <section className={`${card} p-5`}>
        <h2 className={`${h2} mb-3`}>Roles</h2>
        <table className={tbl}>
          <thead><tr><th>Role</th><th>HR dashboard access</th><th>Own leave auto-approved</th><th>People</th></tr></thead>
          <tbody>{roles.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.isAdmin ? "Yes" : "No"}</td><td>{r.selfApprove ? "Yes" : "No"}</td><td>{r._count.users}</td></tr>)}</tbody>
        </table>
        <p className={`${muted} mt-3`}>Admin access is a property of the role. To change it, use Prisma Studio (npx prisma studio) for now.</p>
      </section>
    </>
  );
}
