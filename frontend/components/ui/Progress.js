export default function Progress({ value, total, label }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm text-graphite">
        <span>{label}</span>
        <span className="tabular">{value} of {total}</span>
      </div>
      <div className="h-[3px] w-full bg-stone" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label="Progress">
        <div className="h-full bg-wine transition-[width] duration-500 ease-[var(--ease-quart)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
