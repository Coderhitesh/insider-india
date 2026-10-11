// Rounded progress bar with step count.
export default function Progress({ value, total, label }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between text-sm">
        <span className="eyebrow">{label}</span>
        <span className="tabular rounded-full bg-blush px-2.5 py-0.5 text-xs font-semibold text-wine">Step {value} of {total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label="Progress">
        <div className="h-full rounded-full bg-gradient-to-r from-wine to-[#e2394f] transition-[width] duration-500 ease-[var(--ease-quart)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
