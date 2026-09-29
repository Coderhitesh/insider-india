'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Swatch from '@/components/ui/Swatch';
import RangeText from '@/components/ui/RangeText';

const TONES = ['sand', 'terracotta', 'stone', 'brass'];
const BHK_LABEL = { '1BHK': '1 BHK', '2BHK': '2 BHK', '3BHK': '3 BHK', '4BHK': '4 BHK', '5BHK_PLUS': '5 BHK+' };

// Packages presented as material sample boards (brief §28), not SaaS pricing cards.
export default function PackageBoards({ packages, full = false, inverse = false }) {
  const bhks = useMemo(() => {
    const set = new Set(packages.flatMap((p) => p.pricing.map((x) => x.bhk)));
    return Object.keys(BHK_LABEL).filter((k) => set.has(k));
  }, [packages]);
  const [bhk, setBhk] = useState(bhks.includes('3BHK') ? '3BHK' : bhks[0]);

  if (!packages.length) {
    return <p className={inverse ? 'text-stone' : 'text-graphite'}>Package details are being updated. <a href="/book-consultation" className="underline">Book a consultation</a> and we will walk you through the options.</p>;
  }

  return (
    <div>
      {bhks.length > 0 && (
        <fieldset className="mb-8">
          <legend className={clsx('mb-3 text-sm', inverse ? 'text-stone' : 'text-graphite')}>Show indicative ranges for</legend>
          <div className="flex flex-wrap gap-2">
            {bhks.map((b) => (
              <label key={b} className={clsx('cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brass',
                bhk === b ? (inverse ? 'border-paper bg-paper text-charcoal' : 'border-charcoal bg-charcoal text-paper') : (inverse ? 'border-white/25 hover:border-paper' : 'border-stone-deep hover:border-charcoal'))}>
                <input type="radio" name="pkg-bhk" value={b} checked={bhk === b} onChange={() => setBhk(b)} className="sr-only" />
                {BHK_LABEL[b]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {packages.map((p, i) => {
          const price = p.pricing.find((x) => x.bhk === bhk);
          const features = full ? p.features : p.features.slice(0, 4);
          return (
            <li key={p.id} className={clsx('flex flex-col rounded-[3px] border', inverse ? 'border-white/15 bg-white/[0.03]' : 'border-stone bg-paper')}>
              <div className="grid h-24 grid-cols-5 gap-1 p-1">
                <Swatch tone={p.accent && TONES.includes(p.accent) ? p.accent : TONES[i % 4]} className="col-span-3" />
                <Swatch tone={i >= 2 ? 'charcoal' : 'paper'} className="col-span-1" />
                <Swatch tone={i === 3 ? 'brass' : i === 2 ? 'stone' : 'oak'} className="col-span-1" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[1.9rem] leading-tight">{p.name}</h3>
                  {p.isRecommended && <span className={clsx('mt-2 shrink-0 border px-2 py-0.5 text-xs', inverse ? 'border-brass text-brass' : 'border-wine text-wine')}>Recommended</span>}
                </div>
                <p className={clsx('mt-2 text-sm', inverse ? 'text-stone' : 'text-graphite')}>{p.headline}</p>
                <div className={clsx('mt-6 border-y py-4', inverse ? 'border-white/15' : 'border-stone')}>
                  <p className={clsx('text-xs', inverse ? 'text-stone' : 'text-graphite')}>{BHK_LABEL[bhk] || 'Your home'}, indicative</p>
                  <p className="tabular mt-1 font-display text-3xl" aria-live="polite">{price ? <RangeText min={price.min} max={price.max} /> : 'Price on request'}</p>
                </div>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {features.map((f) => <li key={f} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-brass" />{f}</li>)}
                  {!full && p.features.length > 4 && <li className={inverse ? 'text-stone' : 'text-graphite'}>and {p.features.length - 4} more</li>}
                </ul>
                {p.warranty?.years ? (
                  <p className="mt-5 flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-brass" />{p.warranty.years}-year warranty cover</p>
                ) : null}
                <Button href={`/estimate?package=${p.slug}`} variant={inverse ? 'light' : 'secondary'} className="mt-6 w-full">Select package</Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className={clsx('mt-6 text-sm', inverse ? 'text-stone' : 'text-graphite')}>Ranges are indicative. Your final price is set after a site visit, measurements and material selection.</p>
    </div>
  );
}
