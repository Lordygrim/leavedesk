import { prisma } from "@/lib/db";
import { submitRequest } from "@/lib/actions";
import { requireUser } from "@/lib/dal";
import { todayNairobi } from "@/lib/dates";
import { allowanceOf, periodLabel } from "@/lib/allowance";
import { BalancesPanel, HolidaysPanel, AllowancePanel } from "@/components/panels";
import { btn, card, err, field, h1, lbl, muted } from "@/components/styles";
const ERR: Record<string, string> = {
  dates: "Check your dates: the end date can't be before the start date.", past: "The start date can't be in the past.",
  nodays: "That range has no working days. Weekends, public holidays and mandatory leave days are excluded.", balance: "You don't have enough days left for that leave type.",
  overlap: "You already have leave on some of those dates.", note: "Please add a note for HR explaining the reason for your leave.",
};
export default async function Request({ searchParams }: { searchParams: Promise<{ error?: string; q?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const types = await prisma.leaveType.findMany({ where: { orgId: u.orgId }, orderBy: { name: "asc" } });
  const today = todayNairobi();
  const al = allowanceOf(u.org);
  const msg = sp.error === "quarter" && sp.q ? `That would go over your annual leave allowance for ${periodLabel(al.period, Number(sp.q.slice(5)))}${al.period === "YEARLY" ? "" : " " + sp.q.slice(0, 4)}. Check the allowance card on the right.` : sp.error ? ERR[sp.error] ?? "Something went wrong." : "";
  return (
    <>
      <h1 className={h1}>Request leave</h1>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <form action={submitRequest} className={`${card} flex flex-col gap-4 p-6 lg:col-span-2`}>
          {msg && <div className={err}>{msg}</div>}
          <label className={lbl}>Leave type<select className={field} name="typeId" defaultValue={types.find((t) => t.name === "Annual")?.id}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={lbl}>From<input className={field} type="date" name="start" min={today} required /></label>
            <label className={lbl}>To<input className={field} type="date" name="end" min={today} required /></label>
          </div>
          <label className={lbl}>Note for HR<input className={field} name="note" placeholder="Reason for your leave" required /></label>
          <p className={muted}>Weekends, public holidays and mandatory leave days are excluded. Annual leave follows your organization's allowance (see the card on the right). Your back-at-work date is calculated when you send the request.</p>
          <button className={`${btn} self-start px-8`}>Send request</button>
        </form>
        <div className="flex flex-col gap-6"><AllowancePanel userId={u.id} orgId={u.orgId} /><BalancesPanel userId={u.id} orgId={u.orgId} /><HolidaysPanel orgId={u.orgId} /></div>
      </div>
    </>
  );
}
