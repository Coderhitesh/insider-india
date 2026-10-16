'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Image from 'next/image';
import { HOME_IMG } from '@/components/landing/media';
import { api } from '@/lib/api';
import { formatShort } from '@/lib/format';
import RangeText from '@/components/ui/RangeText';
import { useBookingStore } from '@/store/booking';


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
    <div className="hero-wash">
    <div className="container-x max-w-6xl py-12 sm:py-16">
      <p className="eyebrow">Indicative estimate</p>
      <h1 className="mt-3 text-[clamp(2.1rem,4.2vw,3.4rem)] leading-[1.04]" tabIndex={-1} id="step-title">Your estimated <span className="text-wine">interior budget</span></h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="red-panel relative overflow-hidden rounded-2xl shadow-[0_24px_50px_-24px_rgb(154_12_34/.6)]">
            <span aria-hidden="true" className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10" />
            <span aria-hidden="true" className="absolute -bottom-20 right-24 size-40 rounded-full bg-white/5" />
            <div className="relative px-6 py-8 text-paper sm:px-10 sm:py-10">
              <p className="font-semibold text-paper/85">{selected.packageName}, {sizeLabel}</p>
              <p className="price mt-3 text-[clamp(2.4rem,6.5vw,4rem)] leading-none" aria-live="polite">
                {selected.available ? <RangeText min={selected.finalMin} max={selected.finalMax} /> : 'Price on request'}
              </p>
              {!selected.available && <p className="mt-4 text-paper/85">We don&apos;t publish a range for this combination. Book a free consultation and our designer will prepare one for your home.</p>}
              {selected.warranty?.years ? <p className="mt-5 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" />{selected.warranty.years}-year warranty cover plan</p> : null}
            </div>
          </div>

          <p className="mt-5 rounded-xl border border-stone bg-paper p-4 text-sm text-charcoal">{estimate.disclaimer}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={book} className="h-13 px-7">Book free consultation →</Button>
            <Button size="lg" variant="secondary" className="h-13 border-[1.5px] bg-paper px-7" onClick={() => { switcher.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); switcher.current?.querySelector('button')?.focus({ preventScroll: true }); }}>Explore another package</Button>
          </div>
        </div>

        <dl className="soft-card h-max divide-y divide-stone px-5 py-2 lg:col-span-5">
          {[
            ['Property type', i.propertyCategory === 'COMMERCIAL' ? 'Commercial' : 'Residential'],
            ['Size', sizeLabel],
            ...(i.propertyCategory === 'RESIDENTIAL' ? [['Rooms', `${i.kitchens} kitchen, ${i.bedrooms} bedroom, ${i.washrooms} washroom`]] : []),
            ...(i.propertyCategory === 'COMMERCIAL' && i.commercialType ? [['Space type', config.commercialTypes?.find((t) => t.value === i.commercialType)?.label || i.commercialType]] : []),
            ...(i.propertyCategory === 'COMMERCIAL' && Object.keys(i.units || {}).length ? [['Includes', Object.entries(i.units).map(([k, q]) => { const u = config.units?.find((x) => x.key === k); return `${q} × ${u?.label || k}`; }).join(', ')]] : []),
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
        <p className="eyebrow">Our packages</p><h2 id="switch-title" className="mt-2 text-[clamp(1.8rem,3vw,2.4rem)]">Compare packages for your home</h2>
        {error && <Notice tone="error" className="mt-4">{error}</Notice>}
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {estimate.results.map((r, idx) => {
            const on = r.package === estimate.selectedPackage;
            return (
              <li key={r.package}>
                <button type="button" aria-pressed={on} onClick={() => choose(r.package)} disabled={busy !== null}
                  className={clsx('flex w-full flex-col overflow-hidden rounded-xl border bg-paper text-left transition-shadow', on ? 'border-wine shadow-[0_0_0_1px_var(--color-wine),0_14px_30px_-16px_rgb(154_12_34/.5)]' : 'border-stone hover:shadow-[0_10px_24px_-16px_rgb(154_12_34/.35)]')}>
                  <span className="relative block h-24 w-full"><Image src={HOME_IMG.packagesWide[idx % 4]} alt="" fill sizes="25vw" className="object-cover" /></span>
                  <span className="p-4">
                    <span className="block font-display text-xl">{r.packageName}</span>
                    <span className="price mt-1 block text-sm text-wine">{r.available ? `${formatShort(r.finalMin)} – ${formatShort(r.finalMax)}` : 'Price on request'}</span>
                    <span className={clsx('mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium', on ? 'bg-wine text-paper' : 'bg-blush text-wine')}>{busy === r.package ? 'Updating…' : on ? 'Selected' : 'Select'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <button type="button" onClick={onRestart} className="mt-12 text-sm text-graphite underline underline-offset-4 hover:text-charcoal">Start a new estimate</button>
    </div>
    </div>
  );
}
