import { add } from "./dates";
export const shiftMonth = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
export const monthLabel = (ym: string) => new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
export const mondayOf = (s: string) => add(s, -((new Date(s + "T00:00:00Z").getUTCDay() + 6) % 7));
export function monthGrid(ym: string) {
  const first = ym + "-01", last = add(shiftMonth(ym, 1) + "-01", -1), days: string[] = [];
  for (let d = mondayOf(first); d <= last || days.length % 7 !== 0; d = add(d, 1)) days.push(d);
  return days;
}
export const isWeekday = (s: string) => { const w = new Date(s + "T00:00:00Z").getUTCDay(); return w !== 0 && w !== 6; };
