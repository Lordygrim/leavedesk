import { prisma } from "@/lib/db";
import { submitRequest } from "@/lib/actions";
import { requireUser } from "@/lib/dal";
import { todayNairobi } from "@/lib/dates";
import { BalancesPanel, HolidaysPanel } from "@/components/panels";
const ERR: Record<string, string> = {
  dates: "Check your dates: the end date can't be before the start date.", past: "The start date can't be in the past.",
  nodays: "That range has no working days. Weekends and public holidays are excluded.", balance: "You don't have enough days left for that leave type.",
  overlap: "You already have leave on some of those dates.", note: "Please add a note for HR explaining the reason for your leave.",
};
const lbl = "flex flex-col gap-1.5 text-sm text-mut";
const fld = "h-12 w-full rounded-xl border border-fld bg-card px-3.5 text-base text-ink";
export default async function Request({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const types = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
  const today = todayNairobi();
  return (
    <>
      <h1 className="text-3xl font-medium">Request leave</h1>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <form action={submitRequest} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-6 lg:col-span-2">
          {sp.error && <div className="rounded-xl bg-rjb px-4 py-3 text-rjt">{ERR[sp.error] ?? "Something went wrong."}</div>}
          <label className={lbl}>Leave type<select className={fld} name="typeId" defaultValue={types.find((t) => t.name === "Annual")?.id}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={lbl}>From<input className={fld} type="date" name="start" min={today} required /></label>
            <label className={lbl}>To<input className={fld} type="date" name="end" min={today} required /></label>
          </div>
          <label className={lbl}>Note for HR<input className={fld} name="note" placeholder="Reason for your leave" required /></label>
          <p className="text-sm text-mut">Weekends and public holidays are excluded. Your back-at-work date is calculated when you send the request.</p>
          <button className="h-12 cursor-pointer self-start rounded-xl bg-ac px-8 text-base font-medium text-act">Send request</button>
        </form>
        <div className="flex flex-col gap-6"><BalancesPanel userId={u.id} /><HolidaysPanel /></div>
      </div>
    </>
  );
}
