'use client';

import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import Button from '@/components/ui/Button';

const cls = 'h-9 rounded-[3px] border border-stone-deep bg-paper px-2.5 text-sm focus:border-charcoal focus:outline-none';
export const RANGES = [['', 'Any time'], ['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['custom', 'Custom range']];

/** filters: [{ name, label, options:[[value,label]] } | { name:'range' } ] */
export default function Filters({ params, setParams, filters = [], search = true, placeholder = 'Search' }) {
  const [q, setQ] = useState(params.q || '');
  useEffect(() => { const t = setTimeout(() => q !== (params.q || '') && setParams({ q }), 350); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = filters.some((f) => params[f.name]) || params.q || params.from;
  const count = filters.filter((f) => params[f.name]).length;
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      {search && (
        <label className="relative">
          <span className="sr-only">{placeholder}</span>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-graphite" aria-hidden="true" />
          <input className={`${cls} w-60 pl-8`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
        </label>
      )}
      {filters.length > 0 && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`${cls} inline-flex items-center gap-1.5 sm:hidden`}>
          <SlidersHorizontal className="size-4" />Filters{count ? ` (${count})` : ''}
        </button>
      )}
      <div className={`${open ? 'flex' : 'hidden'} w-full flex-wrap items-end gap-2 sm:flex sm:w-auto`}>
      {filters.map((f) => (f.name === 'range' ? (
        <div key="range" className="flex items-end gap-2">
          <label className="flex flex-col gap-0.5 text-xs text-graphite">Date
            <select className={cls} value={params.range || ''} onChange={(e) => setParams({ range: e.target.value, ...(e.target.value !== 'custom' ? { from: '', to: '' } : {}) })}>
              {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {params.range === 'custom' && <>
            <label className="flex flex-col gap-0.5 text-xs text-graphite">From<input type="date" className={cls} value={params.from || ''} onChange={(e) => setParams({ from: e.target.value })} /></label>
            <label className="flex flex-col gap-0.5 text-xs text-graphite">To<input type="date" className={cls} value={params.to || ''} onChange={(e) => setParams({ to: e.target.value })} /></label>
          </>}
        </div>
      ) : (
        <label key={f.name} className="flex flex-col gap-0.5 text-xs text-graphite">{f.label}
          <select className={`${cls} max-w-48`} value={params[f.name] || ''} onChange={(e) => setParams({ [f.name]: e.target.value })}>
            <option value="">All</option>
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      )))}
      </div>
      {active && <Button size="sm" variant="ghost" onClick={() => { setQ(''); setParams(Object.fromEntries([...filters.map((f) => [f.name, '']), ['q', ''], ['from', ''], ['to', '']])); }}>Clear</Button>}
    </div>
  );
}
