'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ShieldCheck, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import RangeText from '@/components/ui/RangeText';

const BHK_LABEL = { '1BHK': '1 BHK', '2BHK': '2 BHK', '3BHK': '3 BHK', '4BHK': '4 BHK', '5BHK_PLUS': '5 BHK+' };

// Packages as drawing title blocks: ruled cells for package, range, warranty and inclusions.
export default function PackageBoards({ packages, full = false, inverse = false }) {
  const bhks = useMemo(() => {
    const set = new Set(packages.flatMap((p) => p.pricing.map((x) => x.bhk)));
    return Object.keys(BHK_LABEL).filter((k) => set.has(k));
  }, [packages]);
  const [bhk, setBhk] = useState(bhks.includes('3BHK') ? '3BHK' : bhks[0]);

  if (!packages.length) {
    return <p className={inverse ? 'text-paper/85' : 'text-graphite'}>Package details are being updated. <a href="/book-consultation" className="underline">Book a consultation</a> and we will walk you through the options.</p>;
  }

  return (
    <div>
      {bhks.length > 0 && (
        <fieldset className="mb-8">
          <legend className={clsx('mb-3 text-sm font-semibold', inverse ? 'text-paper/85' : 'text-graphite')}>Show indicative ranges for</legend>
          <div className={clsx('inline-flex border-2', inverse ? 'border-paper' : 'border-wine')}>
            {bhks.map((b) => (
              <label key={b} className={clsx('cursor-pointer px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                bhk === b ? (inverse ? 'bg-paper text-wine' : 'bg-wine text-paper') : (inverse ? 'text-paper hover:bg-white/10' : 'text-wine hover:bg-blush'))}>
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
            <li key={p.id} className="flex flex-col border-2 border-charcoal/10 bg-paper text-charcoal outline outline-2 outline-offset-[-2px] outline-wine">
              <div className="flex items-stretch border-b-2 border-wine">
                <span className="tabular flex w-12 items-center justify-center border-r-2 border-wine font-display text-lg text-wine">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 px-4 py-3">
                  <h3 className="text-[1.35rem] leading-tight">{p.name}</h3>
                  {p.isRecommended && <span className="mt-1 inline-block bg-wine px-2 py-0.5 text-[0.7rem] font-semibold text-paper">Recommended</span>}
                </div>
              </div>
              <p className="border-b border-stone-deep px-4 py-3 text-sm text-graphite">{p.headline}</p>
              <div className="border-b border-stone-deep px-4 py-3">
                <p className="text-[0.7rem] font-semibold text-graphite">{BHK_LABEL[bhk] || 'Your home'}, indicative</p>
                <p className="tabular mt-1 whitespace-nowrap font-display text-[1.45rem] leading-tight text-wine" aria-live="polite">{price ? <RangeText min={price.min} max={price.max} /> : 'On request'}</p>
              </div>
              <div className="flex items-center justify-between border-b border-stone-deep px-4 py-2.5 text-sm">
                <span className="font-semibold text-graphite">Warranty</span>
                <span className="flex items-center gap-1.5 font-bold">{p.warranty?.years ? <><ShieldCheck className="size-4 text-wine" aria-hidden="true" />{p.warranty.years} years</> : 'As per quotation'}</span>
              </div>
              <ul className="flex-1 space-y-2 px-4 py-4 text-sm">
                {features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden="true" />{f}</li>)}
                {!full && p.features.length > 4 && <li className="pl-6 text-graphite">and {p.features.length - 4} more</li>}
              </ul>
              <div className="p-3 pt-0"><Button href={`/estimate?package=${p.slug}`} className="w-full">Select package</Button></div>
            </li>
          );
        })}
      </ul>
      <p className={clsx('mt-6 text-sm', inverse ? 'text-paper/85' : 'text-graphite')}>Ranges are indicative. Your final price is set after a site visit, measurements and material selection.</p>
    </div>
  );
}
