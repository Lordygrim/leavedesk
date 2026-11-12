"use client";
// The leave allowance fields, used when creating an organization and under Policies. They live inside a normal server-handled form.
import { useState } from "react";
import { PERIODS, RULES, distribute, type Period, type Rule } from "@/lib/allowance";
import { field, lbl, muted } from "./styles";

export default function AllowanceFields({ initial }: { initial: { period: Period; rule: Rule; days: number[] } }) {
  const [period, setPeriod] = useState<Period>(initial.period);
  const [rule, setRule] = useState<Rule>(initial.rule);
  const [days, setDays] = useState<string[]>(initial.days.map(String));
  const n = PERIODS[period].count;
  const total = days.slice(0, n).reduce((a, d) => a + (Number(d) || 0), 0);
  function changePeriod(p: Period) { // keep the same yearly total, spread over the new number of periods
    setPeriod(p);
    setDays(distribute(total, PERIODS[p].count).map(String));
    if (p === "YEARLY") setRule("WINDOW");
  }
  return (
    <div className="flex flex-col gap-4">
      <label className={lbl}>How are annual leave days given?
        <select className={field} name="period" value={period} onChange={(e) => changePeriod(e.target.value as Period)}>
          {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </label>
      {period === "YEARLY" ? <input type="hidden" name="rule" value="WINDOW" /> : (
        <label className={lbl}>When can they be taken?
          <select className={field} name="rule" value={rule} onChange={(e) => setRule(e.target.value as Rule)}>
            {Object.entries(RULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      )}
      <div className={`grid gap-4 ${n === 1 ? "max-w-xs" : "grid-cols-2 sm:grid-cols-4"}`}>
        {PERIODS[period].names.map((name, i) => (
          <label key={name} className={lbl}>{name}
            <input className={field} type="number" min={0} max={260} name={`d${i}`} value={days[i] ?? "0"} required onChange={(e) => setDays(days.map((x, j) => (j === i ? e.target.value : x)))} />
          </label>
        ))}
      </div>
      <p className={muted}>
        {total} annual leave days a year.{" "}
        {period === "YEARLY" ? "The whole allowance is available from 1 January." : rule === "WINDOW" ? "Use 0 for a period with no leave days." : "For example, a monthly allowance of 2 builds up to 6 days by the end of March."}
      </p>
    </div>
  );
}
