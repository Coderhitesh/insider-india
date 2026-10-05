'use client';

import { Minus, Plus } from 'lucide-react';

export default function Counter({ id, label, hint, value, min = 0, max = 10, onChange }) {
  const btn = 'flex size-11 items-center justify-center rounded-full border border-stone-deep text-charcoal transition-colors hover:border-wine disabled:opacity-35 disabled:hover:border-stone-deep';
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone py-5 last:border-b-0">
      <div>
        <p id={`${id}-label`} className="text-lg font-medium">{label}</p>
        {hint && <p className="text-sm text-graphite">{hint}</p>}
      </div>
      <div className="flex items-center gap-4" role="group" aria-labelledby={`${id}-label`}>
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}>
          <Minus className="size-4" />
        </button>
        <output aria-live="polite" className="tabular w-8 text-center font-display text-3xl leading-none">{value}</output>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
