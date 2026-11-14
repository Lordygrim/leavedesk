import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { addClosure, addHoliday, addLeaveType, addRole, deleteClosure, deleteHoliday, deleteRole, updateLeaveType, updateOrganization } from "@/lib/actions";
import { fmtDay, fmtMd } from "@/lib/dates";
import { allowanceOf } from "@/lib/allowance";
import AllowanceFields from "@/components/AllowanceFields";
import { btnSm, card, err, field, fieldSm, ghostSm, h1, h2, lbl, muted, note, tbl } from "@/components/styles";
const ERR: Record<string, string> = {
  org: "Enter a name and whole numbers from 0 to 260 for each period.", nametaken: "Another organization already uses that name.", closure: "Enter a name and both dates.", type: "Enter a leave type name and a number of days from 0 to 260.",
  typeexists: "That leave type already exists.", holiday: "Enter a date and a name for the holiday.", role: "Enter a role name.", roleexists: "That role already exists.",
  roleinuse: "That role still has people in it. Move them to another role first.",
};
export default async function Policies({ searchParams }: { searchParams: Promise<{ error?: string; welcome?: string; saved?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: admin.orgId } });
  const closures = await prisma.closure.findMany({ where: { orgId: org.id }, orderBy: { startMd: "asc" } });
  const types = await prisma.leaveType.findMany({ where: { orgId: org.id }, orderBy: { daysPerYear: "desc" } });
  const hols = await prisma.holiday.findMany({ where: { orgId: org.id }, orderBy: { date: "asc" } });
  const roles = await prisma.role.findMany({ where: { orgId: org.id }, include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } });
  const sec = `${card} flex flex-col gap-4 p-5`;
  return (
    <>
      <h1 className={h1}>Policies</h1>
      {sp.welcome && <div className={note}>Welcome! Your organization is ready. Check your annual leave allowance, mandatory leave periods and public holidays below, then add your people under Employees.</div>}
      {sp.saved && <div className={note}>Saved.</div>}
      {sp.error && <div className={err}>{ERR[sp.error]}</div>}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className={sec}>
          <h2 className={h2}>Organization and annual leave allowance</h2>
          <form action={updateOrganization} className="flex flex-col gap-4">
            <label className={lbl}>Organization name<input className={field} name="name" defaultValue={org.name} required /></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="approval" defaultChecked={org.requireApproval} className="mt-0.5 h-4 w-4" />People who join by typing this organization&apos;s name must be approved by an admin before they can sign in (recommended)</label>
            <AllowanceFields initial={allowanceOf(org)} />
            <p className={muted}>Saving changes everyone&apos;s allowance straight away. Days already taken stay counted.</p>
            <button className={`${btnSm} self-start`}>Save</button>
          </form>
        </section>
        <section className={sec}>
          <h2 className={h2}>Mandatory leave periods</h2>
          <p className={muted}>Dates when the whole organization is off every year, such as a festive closure. They are skipped when working days and back-at-work dates are calculated.</p>
          {closures.length === 0 && <p className={muted}>None set.</p>}
          <table className={tbl}><tbody>
            {closures.map((c) => (
              <tr key={c.id}><td>{c.name}</td><td>{fmtMd(c.startMd)} to {fmtMd(c.endMd)}, every year</td>
                <td><form action={deleteClosure}><input type="hidden" name="id" value={c.id} /><button className={ghostSm}>Remove</button></form></td></tr>
            ))}
          </tbody></table>
          <form action={addClosure} className="flex flex-wrap items-end gap-3">
            <label className={lbl}>Name<input className={fieldSm} name="name" placeholder="Festive closure" required /></label>
            <label className={lbl}>From (any year)<input className={fieldSm} type="date" name="from" required /></label>
            <label className={lbl}>To (any year)<input className={fieldSm} type="date" name="to" required /></label>
            <button className={btnSm}>Add</button>
          </form>
          <p className={muted}>A period can run over the new year, for example from 22 Dec to 11 Jan: pick any year for each date, only the day and month are used.</p>
        </section>
        <section className={sec}>
          <h2 className={h2}>Other leave types</h2>
          <table className={tbl}><tbody>
            {types.map((t) => (
              <tr key={t.id}><td>{t.name}</td><td>
                {t.quarterly ? <span className={muted}>Set by the allowance above</span> : (
                  <form action={updateLeaveType} className="flex gap-2"><input type="hidden" name="id" value={t.id} />
                    <input className={`${fieldSm} w-24`} type="number" name="days" min={0} max={260} defaultValue={t.daysPerYear} /><button className={ghostSm}>Save</button></form>
                )}
              </td></tr>
            ))}
          </tbody></table>
          <form action={addLeaveType} className="flex flex-wrap items-end gap-3">
            <label className={lbl}>New leave type<input className={fieldSm} name="name" required /></label>
            <label className={lbl}>Days a year<input className={`${fieldSm} w-24`} type="number" name="days" min={0} max={260} required /></label>
            <button className={btnSm}>Add</button>
          </form>
        </section>
        <section className={sec}>
          <h2 className={h2}>Roles</h2>
          <p className={muted}>Job titles in your organization. A role named HR (or Human Resources) gives its people admin access automatically.</p>
          <table className={tbl}><tbody>
            {roles.map((r) => (
              <tr key={r.id}><td>{r.name}{r.grantsAdmin ? <span className={`${muted} ml-2`}>(admin access)</span> : ""}</td><td>{r._count.users} {r._count.users === 1 ? "person" : "people"}</td>
                <td>{r._count.users === 0 && <form action={deleteRole}><input type="hidden" name="id" value={r.id} /><button className={ghostSm}>Remove</button></form>}</td></tr>
            ))}
          </tbody></table>
          <form action={addRole} className="flex flex-wrap items-end gap-3">
            <label className={lbl}>New role<input className={fieldSm} name="name" required /></label>
            <button className={btnSm}>Add role</button>
          </form>
        </section>
        <section className={`${sec} xl:col-span-2`}>
          <h2 className={h2}>Public holidays</h2>
          <p className={muted}>Skipped when working days are calculated. Add moveable holidays (such as Eid) each year, and check dates against the official gazette.</p>
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
    </>
  );
}
