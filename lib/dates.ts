// All leave dates are plain "YYYY-MM-DD" strings, so time zones can't shift a leave day.
const D = (s: string) => new Date(s + "T00:00:00Z");
const S = (d: Date) => d.toISOString().slice(0, 10);
export const add = (s: string, n: number) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return S(d); };
export const isWorkday = (s: string, h: Set<string>) => { const w = D(s).getUTCDay(); return w !== 0 && w !== 6 && !h.has(s); };
export function workingDays(a: string, b: string, h: Set<string>) { let n = 0; for (let d = a; d <= b; d = add(d, 1)) if (isWorkday(d, h)) n++; return n; }
export function reportBack(end: string, h: Set<string>) { let d = add(end, 1); while (!isWorkday(d, h)) d = add(d, 1); return d; }
export const todayNairobi = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
export const fmt = (s: string) => D(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const fmtDay = (s: string) => D(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
