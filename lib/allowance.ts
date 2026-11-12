// How an organization gives annual leave days: how often (yearly, half-yearly, quarterly, monthly)
// and when they can be taken (only in their own period, or building up through the year). Pure functions, safe in the browser too.
import { add, isWorkday, type Off } from "./dates";

export type Period = "YEARLY" | "HALF_YEARLY" | "QUARTERLY" | "MONTHLY";
export type Rule = "WINDOW" | "CUMULATIVE";
export type Allowance = { period: Period; rule: Rule; days: number[] };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const PERIODS: Record<Period, { count: number; label: string; names: string[] }> = {
  YEARLY: { count: 1, label: "Yearly: one fixed allowance for the whole year", names: ["Days for the year"] },
  HALF_YEARLY: { count: 2, label: "Half-yearly: twice a year", names: ["First half (Jan to Jun)", "Second half (Jul to Dec)"] },
  QUARTERLY: { count: 4, label: "Quarterly: four times a year", names: ["Q1 (Jan to Mar)", "Q2 (Apr to Jun)", "Q3 (Jul to Sep)", "Q4 (Oct to Dec)"] },
  MONTHLY: { count: 12, label: "Monthly: every month", names: MONTHS },
};
export const RULES: Record<Rule, string> = {
  WINDOW: "Only in their own period: days must be taken in the period they are given, and unused days are lost.",
  CUMULATIVE: "Building up: days are earned as each period starts and can be taken any time later in the year (accrual).",
};
export const isPeriod = (v: string): v is Period => v in PERIODS;
export const isRule = (v: string): v is Rule => v in RULES;
export const totalDays = (a: Allowance) => a.days.reduce((x, y) => x + y, 0);
// Spreads a total over n periods as evenly as whole days allow, e.g. 21 over 4 gives 6, 5, 5, 5.
export const distribute = (total: number, n: number) => Array.from({ length: n }, (_, i) => Math.floor(total / n) + (i < total % n ? 1 : 0));

type OrgLike = { leavePeriod: string; leaveRule: string; periodDays: string; q1Days: number; q2Days: number; q3Days: number; q4Days: number };
export function allowanceOf(org: OrgLike): Allowance {
  const period: Period = isPeriod(org.leavePeriod) ? org.leavePeriod : "QUARTERLY";
  const parsed = org.periodDays ? org.periodDays.split(",").map(Number) : [];
  const days = parsed.length === PERIODS[period].count && parsed.every((n) => Number.isFinite(n)) ? parsed : [org.q1Days, org.q2Days, org.q3Days, org.q4Days]; // older organizations only have quarters
  return { period: days.length === PERIODS[period].count ? period : "QUARTERLY", rule: isRule(org.leaveRule) ? org.leaveRule : "WINDOW", days };
}
export function periodIndex(p: Period, date: string) {
  const m = Number(date.slice(5, 7));
  return p === "YEARLY" ? 0 : p === "HALF_YEARLY" ? (m <= 6 ? 0 : 1) : p === "QUARTERLY" ? Math.floor((m - 1) / 3) : m - 1;
}
export const periodLabel = (p: Period, i: number) => (p === "YEARLY" ? "the year" : PERIODS[p].names[i].split(" (")[0]);

// Working days of a request, split by period. Keys look like "2027-1" (year, period number).
export function daysByPeriod(a: string, b: string, off: Off, p: Period) {
  const out: Record<string, number> = {};
  for (let d = a; d <= b; d = add(d, 1)) if (isWorkday(d, off)) { const k = `${d.slice(0, 4)}-${periodIndex(p, d)}`; out[k] = (out[k] ?? 0) + 1; }
  return out;
}
// Returns the period ("2027-1") where a new request would go over the allowance, or null if it fits.
export function violation(al: Allowance, used: Record<string, number>, need: Record<string, number>): string | null {
  for (const y of new Set(Object.keys(need).map((k) => k.slice(0, 4)))) {
    const total = al.days.map((_, i) => (used[`${y}-${i}`] ?? 0) + (need[`${y}-${i}`] ?? 0));
    const first = al.days.findIndex((_, i) => (need[`${y}-${i}`] ?? 0) > 0);
    if (al.rule === "WINDOW") {
      for (let i = 0; i < total.length; i++) if ((need[`${y}-${i}`] ?? 0) > 0 && total[i] > al.days[i]) return `${y}-${i}`;
    } else {
      let cap = 0, sum = 0;
      for (let i = 0; i < total.length; i++) { cap += al.days[i]; sum += total[i]; if (i >= first && sum > cap) return `${y}-${i}`; }
    }
  }
  return null;
}
