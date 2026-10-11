'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Swatch from '@/components/ui/Swatch';
import { api } from '@/lib/api';
import { formatShort } from '@/lib/format';
import RangeText from '@/components/ui/RangeText';
import { useBookingStore } from '@/store/booking';

const TONES = ['sand', 'charcoal', 'oak', 'stone'];

export default function EstimateResult({ estimate, config, onChange, onRestart }) {
  const router = useRouter();
  const switcher = useRef(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const selected = estimate.results.find((r) => r.package === estimate.selectedPackage) || estimate.results[0];
  const i = estimate.inputs;
  const sizeLabel = i.propertyCategory === 'COMMERCIAL' || i.bhk === 'CUSTOM'
    ? `${Number(i.area).toLocaleString('en-IN')} sq ft`
    : config.residentialSizes.find((s) => s.value === i.bhk)?.label || i.bhk;
  const addonLabels = (i.addons || []).map((k) => config.addons.find((a) => a.key === k)?.label || k);

  const choose = async (pkgId) => {
    if (pkgId === estimate.selectedPackage) return;
    setBusy(pkgId);
    setError('');
    try {
      const res = await api(`/estimates/${estimate.id}/package`, { method: 'PATCH', body: { packageId: pkgId } });
      onChange(res.data.estimate);
    } catch (err) { setError(err.message); } finally { setBusy(null); }
  };

  const book = () => {
    useBookingStore.getState().setLead(estimate.leadId, null);
    router.push('/book-consultation');
  };

  return (
    <div className="container-x max-w-5xl py-12 sm:py-16">
      <h1 className="text-d2" tabIndex={-1} id="step-title">Your estimated interior budget</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {/* The estimate sits in a red drawing frame with corner registration marks. */}
          <div className="relative border-2 border-wine p-[6px]">
            {['-left-2 -top-2', '-right-2 -top-2', '-left-2 -bottom-2', '-right-2 -bottom-2'].map((c) => <span key={c} aria-hidden="true" className={`absolute ${c} size-4 border-wine`} style={{ borderWidth: 2 }} />)}
            <div className="bg-wine px-6 py-8 text-paper sm:px-10 sm:py-10">
              <p className="font-semibold text-paper/85">{selected.packageName}, {sizeLabel}</p>
              <p className="tabular mt-3 font-display text-[clamp(2.4rem,6.5vw,4.2rem)] leading-none" aria-live="polite">
                {selected.available ? <RangeText min={selected.finalMin} max={selected.finalMax} /> : 'Price on request'}
              </p>
              {!selected.available && <p className="mt-4 text-paper/85">We don&apos;t publish a range for this combination. Book a free consultation and our designer will prepare one for your home.</p>}
              {selected.warranty?.years ? <p className="mt-5 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" />{selected.warranty.years}-year warranty cover plan</p> : null}
            </div>
          </div>

          <p className="mt-6 border-l-4 border-wine bg-blush p-4 text-sm text-charcoal">{estimate.disclaimer}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={book}>Book free consultation</Button>
            <Button size="lg" variant="secondary" onClick={() => { switcher.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); switcher.current?.querySelector('button')?.focus({ preventScroll: true }); }}>Explore another package</Button>
          </div>
        </div>

        <dl className="h-max divide-y divide-stone border-y border-stone lg:col-span-5">
          {[
            ['Property type', i.propertyCategory === 'COMMERCIAL' ? 'Commercial' : 'Residential'],
            ['Size', sizeLabel],
            ...(i.propertyCategory === 'RESIDENTIAL' ? [['Rooms', `${i.kitchens} kitchen, ${i.bedrooms} bedroom, ${i.washrooms} washroom`]] : []),
            ['Package', selected.packageName],
            ['Selected features', addonLabels.length ? addonLabels.join(', ') : 'None'],
            ...(selected.available ? [['Package base', `${formatShort(selected.baseMin)} – ${formatShort(selected.baseMax)}`]] : []),
            ...(selected.adjustments || []).map((a) => [a.qty > 1 ? `${a.label} × ${a.qty}` : a.label, `+ ${formatShort(a.min)} – ${formatShort(a.max)}`]),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 py-3 text-sm"><dt className="text-graphite">{k}</dt><dd className="text-right">{v}</dd></div>
          ))}
        </dl>
      </div>

      <section ref={switcher} aria-labelledby="switch-title" className="mt-16">
        <h2 id="switch-title" className="text-d3">Compare packages for your home</h2>
        {error && <Notice tone="error" className="mt-4">{error}</Notice>}
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {estimate.results.map((r, idx) => {
            const on = r.package === estimate.selectedPackage;
            return (
              <li key={r.package}>
                <button type="button" aria-pressed={on} onClick={() => choose(r.package)} disabled={busy !== null}
                  className={clsx('flex w-full flex-col rounded-none border bg-paper text-left transition-colors', on ? 'border-wine shadow-[inset_0_0_0_1px_var(--color-wine)]' : 'border-stone hover:border-stone-deep')}>
                  <Swatch tone={TONES[idx % 4]} className="h-16 w-full" />
                  <span className="p-4">
                    <span className="block font-display text-xl">{r.packageName}</span>
                    <span className="tabular mt-1 block text-sm">{r.available ? `${formatShort(r.finalMin)} – ${formatShort(r.finalMax)}` : 'Price on request'}</span>
                    <span className="mt-2 block text-xs text-graphite">{busy === r.package ? 'Updating…' : on ? 'Selected' : 'Select'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <button type="button" onClick={onRestart} className="mt-12 text-sm text-graphite underline underline-offset-4 hover:text-charcoal">Start a new estimate</button>
    </div>
  );
}
