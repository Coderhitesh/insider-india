// Progress as a measuring rule: red fill over tick marks.
export default function Progress({ value, total, label }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-charcoal">{label}</span>
        <span className="tabular font-semibold text-wine">{String(value).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      </div>
      <div className="relative h-4" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label="Progress">
        <div className="ruler absolute inset-x-0 top-0 h-full text-stone-deep" />
        <div className="absolute left-0 top-0 h-[5px] bg-wine transition-[width] duration-500 ease-[var(--ease-quart)]" style={{ width: `${pct}%` }} />
        <div className="absolute inset-x-0 top-0 h-px bg-stone-deep" />
      </div>
    </div>
  );
}
