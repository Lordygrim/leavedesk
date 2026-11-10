// All leave dates are plain "YYYY-MM-DD" strings, so time zones can't shift a leave day.
export type Off = (d: string) => boolean; // true for a public holiday or a mandatory leave day
const D = (s: string) => new Date(s + "T00:00:00Z");
const S = (d: Date) => d.toISOString().slice(0, 10);
export const add = (s: string, n: number) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return S(d); };
export const isWorkday = (s: string, off: Off) => { const w = D(s).getUTCDay(); return w !== 0 && w !== 6 && !off(s); };
export function workingDays(a: string, b: string, off: Off) { let n = 0; for (let d = a; d <= b; d = add(d, 1)) if (isWorkday(d, off)) n++; return n; }
export function reportBack(end: string, off: Off) { let d = add(end, 1); while (!isWorkday(d, off)) d = add(d, 1); return d; }
// MM-DD range that may wrap around the new year, e.g. 12-22 to 01-11.
export const inMd = (md: string, s: string, e: string) => (s <= e ? md >= s && md <= e : md >= s || md <= e);
export const quarterOf = (d: string) => Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1;
export function quarterDays(a: string, b: string, off: Off) {
  const out: Record<string, number> = {};
  for (let d = a; d <= b; d = add(d, 1)) if (isWorkday(d, off)) { const k = `${d.slice(0, 4)}-Q${quarterOf(d)}`; out[k] = (out[k] ?? 0) + 1; }
  return out;
}
export const todayNairobi = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
export const fmt = (s: string) => D(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const fmtDay = (s: string) => D(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const fmtMd = (md: string) => new Date(`2000-${md}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
