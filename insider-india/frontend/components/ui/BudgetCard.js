import { Info } from 'lucide-react';
import RangeText from './RangeText';

// Indicative budget with the mandatory "not final" note. Used on thank-you, customer and admin booking pages.
export default function BudgetCard({ budget, title = 'Approximate budget', compact = false, showPackages = false }) {
  if (!budget) return null;
  return (
    <div className="border-2 border-wine">
      <div className="bg-wine px-5 py-4 text-paper">
        <p className="text-sm font-semibold text-paper/85">{title}{budget.packageName ? ` — ${budget.packageName}` : ''}</p>
        <p className={`tabular mt-1 font-display leading-tight ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
          {budget.available ? <RangeText min={budget.min} max={budget.max} /> : 'Price on request'}
        </p>
      </div>
      {showPackages && budget.packages?.length > 1 && (
        <ul className="grid grid-cols-2 border-b border-stone-deep text-sm sm:grid-cols-4">
          {budget.packages.map((p) => (
            <li key={p.name} className="border-r border-stone-deep px-4 py-2.5 last:border-r-0">
              <p className="text-xs font-semibold text-graphite">{p.name}</p>
              <p className="tabular font-semibold">{p.available ? <RangeText min={p.min} max={p.max} /> : 'On request'}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="flex gap-2 bg-blush px-5 py-3 text-sm text-charcoal">
        <Info className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden="true" />
        <span><strong>This is not the final budget.</strong> {budget.source === 'AUTO_BOOKING' ? 'It is estimated from your home size and the services you chose. ' : ''}Your final quotation is prepared after the site visit, actual measurements and material selection.</span>
      </p>
    </div>
  );
}
