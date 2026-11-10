// Starting data for a new organization. Everything here can be edited under Policies.
export const DEFAULT_HOLIDAYS: [string, string][] = [
  ["2026-01-01", "New Year's Day"], ["2026-04-03", "Good Friday"], ["2026-04-06", "Easter Monday"], ["2026-05-01", "Labour Day"],
  ["2026-06-01", "Madaraka Day"], ["2026-10-10", "Utamaduni Day"], ["2026-10-20", "Mashujaa Day"], ["2026-12-12", "Jamhuri Day"],
  ["2026-12-25", "Christmas Day"], ["2026-12-26", "Boxing Day"],
  ["2027-01-01", "New Year's Day"], ["2027-03-26", "Good Friday"], ["2027-03-29", "Easter Monday"], ["2027-05-01", "Labour Day"], ["2027-06-01", "Madaraka Day"],
];
export const OTHER_TYPES: [string, number][] = [["Sick", 14], ["Compassionate", 5], ["Paternity", 14], ["Maternity", 90]];
// A role called HR (or Human Resources) gives its people admin access automatically.
export const isHrRole = (name: string) => /\bHR\b|human resources/i.test(name);
