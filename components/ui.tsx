const CHIPS: Record<string, [string, string]> = {
  PENDING: ["bg-peb text-pet", "Pending"], APPROVED: ["bg-okb text-okt", "Approved"], DECLINED: ["bg-rjb text-rjt", "Declined"],
  ON_LEAVE: ["bg-olb text-olt", "On leave"], DUE: ["bg-peb text-pet", "Due back today"], OVERDUE: ["bg-odb text-odt", "Overdue"],
};
export function Chip({ s }: { s: string }) {
  const [c, t] = CHIPS[s] ?? ["bg-peb text-pet", s];
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${c}`}>{t}</span>;
}
export function Ring({ left, total, size = 120 }: { left: number; total: number; size?: number }) {
  const r = size * 0.45, w = size / 12, C = 2 * Math.PI * r, h = size / 2;
  const dash = C * Math.max(0, Math.min(1, left / total));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${left} of ${total} days left`}>
      <circle cx={h} cy={h} r={r} fill="none" stroke="var(--track)" strokeWidth={w} />
      <circle cx={h} cy={h} r={r} fill="none" stroke="var(--ac)" strokeWidth={w} strokeLinecap="round" strokeDasharray={`${dash} ${C}`} transform={`rotate(-90 ${h} ${h})`} />
      <text x={h} y={h + size * 0.08} textAnchor="middle" fontSize={size * 0.24} fontWeight="700" fill="var(--ink)">{left}</text>
    </svg>
  );
}
