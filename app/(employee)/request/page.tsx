import { prisma } from "@/lib/db";
import { submitRequest } from "@/lib/actions";
import { requireUser } from "@/lib/dal";
import { todayNairobi } from "@/lib/dates";
const ERR: Record<string, string> = {
  dates: "Check your dates: the end date can't be before the start date.", past: "The start date can't be in the past.",
  nodays: "That range has no working days. Weekends and public holidays are excluded.", balance: "You don't have enough days left for that leave type.",
  overlap: "You already have leave on some of those dates.",
};
export default async function Request({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const types = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
  const today = todayNairobi();
  return (
    <form action={submitRequest} className="flex flex-col gap-4">
      <h1 className="text-3xl font-medium">Request leave</h1>
      {sp.error && <div className="rounded-xl bg-rjb px-4 py-3 text-rjt">{ERR[sp.error] ?? "Something went wrong."}</div>}
      <label className="flex flex-col gap-1.5 text-sm text-mut">Leave type<select className="rounded-xl border border-fld bg-card text-ink h-12 w-full px-3.5 text-base" name="typeId" defaultValue={types.find((t) => t.name === "Annual")?.id}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <div className="flex items-center justify-between gap-4"><label className="flex flex-1 flex-col gap-1.5 text-sm text-mut">From<input className="rounded-xl border border-fld bg-card text-ink h-12 w-full px-3.5 text-base" type="date" name="start" min={today} required /></label><label className="flex flex-1 flex-col gap-1.5 text-sm text-mut">To<input className="rounded-xl border border-fld bg-card text-ink h-12 w-full px-3.5 text-base" type="date" name="end" min={today} required /></label></div>
      <label className="flex flex-col gap-1.5 text-sm text-mut">Note for HR (optional)<input className="rounded-xl border border-fld bg-card text-ink h-12 w-full px-3.5 text-base" name="note" /></label>
      <p className="text-sm text-mut">Weekends and public holidays are excluded. Your back-at-work date is calculated when you send the request.</p>
      <button className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-12 px-5 text-base bg-ac text-act">Send request</button>
    </form>
  );
}
