import Link from 'next/link';
import { Calculator } from 'lucide-react';

/** "Get Estimate" bar that slides up from the bottom of a photo on hover (always visible on touch screens). Parent needs `group relative`. */
export default function EstimateHover({ href = '/estimate', label = 'Get Estimate' }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
      <Link href={href} onClick={(e) => e.stopPropagation()}
        className="inline-flex translate-y-2 items-center gap-2 rounded-lg bg-wine px-4 py-2.5 text-sm font-semibold text-paper shadow-lg transition-transform duration-300 hover:bg-wine-deep group-hover:translate-y-0 [@media(hover:none)]:translate-y-0">
        <Calculator className="size-4" aria-hidden="true" />{label}
      </Link>
    </div>
  );
}
