'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Columns3 } from 'lucide-react';
import { useState } from 'react';
import Spinner from '@/components/ui/Spinner';
import Notice from '@/components/ui/Notice';
import Button from '@/components/ui/Button';

export function Header({ title, subtitle, back, children }) {
  return (
    <div className="mb-6">
      {back && <Link href={back[0]} className="mb-3 inline-block text-sm text-graphite hover:text-charcoal">← {back[1]}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-graphite">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function Box({ title, action, children, className, pad = true }) {
  return (
    <section className={clsx('rounded-[3px] border border-stone bg-paper', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-stone px-5 py-3">
          {title && <h2 className="font-sans text-sm font-semibold tracking-normal">{title}</h2>}
          {action}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

const PILL = {
  wine: 'bg-wine text-paper', green: 'bg-success/12 text-success', amber: 'bg-brass/15 text-[#7a5a24]',
  grey: 'bg-stone/70 text-charcoal', red: 'bg-error/10 text-error', outline: 'border border-stone-deep text-graphite',
};
const STATUS_TONE = {
  NEW: 'amber', IN_PROGRESS: 'amber', OTP_PENDING: 'amber', VERIFIED: 'grey', QUALIFIED: 'grey', BOOKED: 'wine', CONTRACTOR_ASSIGNED: 'grey',
  SITE_VISIT_SCHEDULED: 'amber', SITE_VISIT_COMPLETED: 'grey', QUOTATION_DRAFT: 'grey', QUOTATION_REVIEW: 'amber', QUOTATION_SENT: 'wine',
  WON: 'green', LOST: 'red', CANCELLED: 'outline', CONFIRMED: 'wine', QUOTATION_IN_PROGRESS: 'grey', QUOTATION_ACCEPTED: 'green', QUOTATION_REJECTED: 'red',
  PROJECT_STARTED: 'green', PROJECT_IN_PROGRESS: 'green', PROJECT_COMPLETED: 'green', DRAFT: 'grey', UNDER_ADMIN_REVIEW: 'amber', APPROVED: 'green',
  SENT_TO_CUSTOMER: 'wine', ACCEPTED: 'green', REJECTED: 'red', REVISION_REQUESTED: 'amber', SCHEDULED: 'amber', COMPLETED: 'green',
  ACTIVE: 'green', INACTIVE: 'outline', BLOCKED: 'red', SENT: 'green', FAILED: 'red', SKIPPED: 'outline',
};
export function Pill({ value, tone, children }) {
  const t = tone || STATUS_TONE[value] || 'grey';
  return <span className={clsx('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[0.72rem] font-medium', PILL[t])}>{children || String(value || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>;
}

export function Stat({ label, value, hint }) {
  return (
    <div className="rounded-[3px] border border-stone bg-paper p-4">
      <p className="text-xs text-graphite">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-graphite">{hint}</p>}
    </div>
  );
}

export function Loader() { return <div className="flex items-center gap-3 py-10 text-graphite" role="status"><Spinner className="size-5 text-wine" />Loading…</div>; }
export function Failed({ error, retry }) { return <Notice tone="error" action={retry && <Button size="sm" variant="secondary" onClick={retry}>Retry</Button>}>{error?.message || 'Could not load this.'}</Notice>; }

/**
 * Table with sortable headers, column visibility, empty/loading states and pagination.
 * columns: [{ key, label, render?(row), sortKey?, className?, defaultHidden? }]
 */
export function DataTable({ columns, rows, loading, error, retry, empty = 'Nothing here yet.', meta, onPage, sort, onSort, onExport, rowHref, selectable, selected, onSelect, tableId }) {
  const storageKey = tableId ? `ii-cols-${tableId}` : null;
  const [hidden, setHidden] = useState(() => {
    if (typeof window !== 'undefined' && storageKey) { try { const s = localStorage.getItem(storageKey); if (s) return new Set(JSON.parse(s)); } catch { /* ignore */ } }
    return new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key));
  });
  const [picker, setPicker] = useState(false);
  const toggle = (k) => setHidden((h) => { const n = new Set(h); n.has(k) ? n.delete(k) : n.add(k); if (storageKey) localStorage.setItem(storageKey, JSON.stringify([...n])); return n; });
  const cols = columns.filter((c) => !hidden.has(c.key));
  const allSelected = selectable && rows?.length > 0 && rows.every((r) => selected?.has(r.id));

  return (
    <div className="rounded-[3px] border border-stone bg-paper">
      <div className="flex items-center justify-end gap-2 border-b border-stone px-3 py-2">
        {meta && <span className="mr-auto text-xs text-graphite">{meta.total.toLocaleString('en-IN')} result{meta.total === 1 ? '' : 's'}</span>}
        <div className="relative">
          <Button size="sm" variant="ghost" onClick={() => setPicker((p) => !p)} aria-expanded={picker}><Columns3 className="size-4" />Columns</Button>
          {picker && (
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-[3px] border border-stone bg-paper p-2 shadow-lg">
              {columns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 px-2 py-1 text-sm">
                  <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggle(c.key)} className="accent-[var(--color-wine)]" />{c.label}
                </label>
              ))}
            </div>
          )}
        </div>
        {onExport && <Button size="sm" variant="ghost" onClick={onExport}><Download className="size-4" />Export CSV</Button>}
      </div>
      {error ? <div className="p-4"><Failed error={error} retry={retry} /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-linen/60 text-xs text-graphite">
              <tr>
                {selectable && <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => onSelect(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} className="accent-[var(--color-wine)]" /></th>}
                {cols.map((c) => (
                  <th key={c.key} scope="col" className={clsx('whitespace-nowrap px-3 py-2.5 font-medium', c.className)}
                    aria-sort={sort && c.sortKey && sort.replace('-', '') === c.sortKey ? (sort.startsWith('-') ? 'descending' : 'ascending') : undefined}>
                    {c.sortKey && onSort ? (
                      <button type="button" className="hover:text-charcoal" onClick={() => onSort(sort === `-${c.sortKey}` ? c.sortKey : `-${c.sortKey}`)}>
                        {c.label}{sort?.replace('-', '') === c.sortKey ? (sort.startsWith('-') ? ' ↓' : ' ↑') : ''}
                      </button>
                    ) : c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {loading && !rows?.length ? (
                <tr><td colSpan={cols.length + 1} className="px-3 py-10 text-center text-graphite"><Spinner className="mr-2 inline size-4 text-wine" />Loading…</td></tr>
              ) : !rows?.length ? (
                <tr><td colSpan={cols.length + 1} className="px-3 py-12 text-center text-graphite">{empty}</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className={clsx('align-top', rowHref && 'hover:bg-linen/50', loading && 'opacity-60')}>
                  {selectable && <td className="px-3 py-3"><input type="checkbox" aria-label="Select row" checked={selected?.has(r.id)} onChange={() => { const n = new Set(selected); n.has(r.id) ? n.delete(r.id) : n.add(r.id); onSelect(n); }} className="accent-[var(--color-wine)]" /></td>}
                  {cols.map((c, i) => (
                    <td key={c.key} className={clsx('px-3 py-3', c.className)}>
                      {i === 0 && rowHref ? <Link href={rowHref(r)} className="whitespace-nowrap font-medium text-charcoal underline-offset-4 hover:text-wine hover:underline">{c.render ? c.render(r) : r[c.key]}</Link> : (c.render ? c.render(r) : (r[c.key] ?? '—'))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between border-t border-stone px-3 py-2 text-sm">
          <span className="text-graphite">Page {meta.page} of {meta.pages}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
            <Button size="sm" variant="ghost" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-stone">
      {tabs.map(([k, label]) => (
        <button key={k} role="tab" type="button" aria-selected={value === k} onClick={() => onChange(k)}
          className={clsx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm', value === k ? 'border-wine text-wine' : 'border-transparent text-graphite hover:text-charcoal')}>{label}</button>
      ))}
    </div>
  );
}

export function KV({ rows }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k}><dt className="text-xs text-graphite">{k}</dt><dd className="mt-0.5 break-words">{v || v === 0 ? v : '—'}</dd></div>
      ))}
    </dl>
  );
}
