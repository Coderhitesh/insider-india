'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import RangeText from '@/components/ui/RangeText';
import { Panel, PageTitle, Empty, Loading, LoadError } from '@/components/account/Bits';
import { useApi } from '@/lib/useApi';
import { formatDate } from '@/lib/format';
import { useBookingStore } from '@/store/booking';

const SIZE = { '1BHK': 'Studio / 1 BHK', '2BHK': '2 BHK', '3BHK': '3 BHK', '4BHK': '4 BHK', '5BHK_PLUS': '5 BHK+' };

export default function Estimates() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi('/estimates/mine?limit=50');
  const [open, setOpen] = useState(null);
  return (
    <>
      <PageTitle title="Estimates"><Button href="/estimate" variant="secondary" size="sm">New estimate</Button></PageTitle>
      {loading ? <Loading /> : error ? <LoadError error={error} onRetry={reload} /> : !data.items.length ? (
        <Empty title="No estimates yet" body="Get an indicative budget for your home in five quick steps." href="/estimate" cta="Calculate my budget" />
      ) : (
        <div className="space-y-4">
          {data.items.map((e) => {
            const sel = e.results.find((r) => r.package === e.selectedPackage);
            const i = e.inputs;
            const size = i.propertyCategory === 'COMMERCIAL' || i.bhk === 'CUSTOM' ? `${Number(i.area).toLocaleString('en-IN')} sq ft` : SIZE[i.bhk] || i.bhk;
            const expanded = open === e.id;
            return (
              <Panel key={e.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-graphite">{e.estimateNumber}, {formatDate(e.createdAt)}</p>
                    <p className="mt-1 font-medium">{i.propertyCategory === 'COMMERCIAL' ? 'Commercial' : 'Residential'}, {size}. {sel?.packageName}</p>
                    <p className="tabular mt-1 text-2xl font-semibold tracking-tight">{sel?.available ? <RangeText min={sel.finalMin} max={sel.finalMax} /> : 'Price on request'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : e.id)}>{expanded ? 'Hide packages' : 'All packages'}</Button>
                    {e.leadId && <Button size="sm" onClick={() => { useBookingStore.getState().setLead(e.leadId, null); router.push('/book-consultation'); }}>Book consultation</Button>}
                  </div>
                </div>
                {expanded && (
                  <ul className="mt-5 grid gap-3 border-t border-stone pt-5 sm:grid-cols-2 lg:grid-cols-4">
                    {e.results.map((r) => (
                      <li key={r.package} className={clsx('rounded-none border p-3', r.package === e.selectedPackage ? 'border-wine' : 'border-stone')}>
                        <p className="font-medium">{r.packageName}</p>
                        <p className="tabular text-sm">{r.available ? <RangeText min={r.finalMin} max={r.finalMax} /> : 'Price on request'}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs text-graphite">Indicative only. Final pricing follows a site visit and measurements.</p>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
