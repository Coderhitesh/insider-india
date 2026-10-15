'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { ShieldCheck, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import RangeText from '@/components/ui/RangeText';
import { HOME_IMG, Arrow } from '@/components/landing/media';

const BHK_LABEL = { '1BHK': '1 BHK', '2BHK': '2 BHK', '3BHK': '3 BHK', '4BHK': '4 BHK', '5BHK_PLUS': '5 BHK+' };

// Package cards in the home-page style; `full` lists every feature (packages page).
export default function PackageBoards({ packages, full = false }) {
  const bhks = useMemo(() => {
    const set = new Set(packages.flatMap((p) => p.pricing.map((x) => x.bhk)));
    return Object.keys(BHK_LABEL).filter((k) => set.has(k));
  }, [packages]);
  const [bhk, setBhk] = useState(bhks.includes('3BHK') ? '3BHK' : bhks[0]);

  if (!packages.length) {
    return <p className="text-graphite">Package details are being updated. <a href="/book-consultation" className="text-wine underline">Book a consultation</a> and we will walk you through the options.</p>;
  }

  return (
    <div>
      {bhks.length > 0 && (
        <fieldset className="mb-8 flex flex-wrap items-center gap-2">
          <legend className="mb-3 w-full text-sm font-medium text-graphite">Show indicative ranges for</legend>
          {bhks.map((b) => (
            <label key={b} className={clsx('cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              bhk === b ? 'border-wine bg-wine text-paper' : 'border-stone-deep hover:border-wine')}>
              <input type="radio" name="pkg-bhk" value={b} checked={bhk === b} onChange={() => setBhk(b)} className="sr-only" />
              {BHK_LABEL[b]}
            </label>
          ))}
        </fieldset>
      )}
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {packages.map((p, i) => {
          const price = p.pricing.find((x) => x.bhk === bhk);
          const features = full ? p.features : p.features.slice(0, 4);
          const top = p.isRecommended;
          return (
            <li key={p.id} id={p.slug} className={clsx('relative flex scroll-mt-24 flex-col overflow-hidden rounded-xl bg-paper', top ? 'border-2 border-wine shadow-[0_18px_40px_-20px_rgb(154_12_34/.45)]' : 'soft-card')}>
              <div className="relative aspect-[16/10]">
                <Image src={p.image || HOME_IMG.packagesWide[i % HOME_IMG.packagesWide.length]} alt="" fill sizes="(min-width:1280px) 25vw, (min-width:768px) 50vw, 100vw" className="object-cover" />
                {top && <span className="absolute right-3 top-3 rounded-md bg-wine px-2.5 py-1 text-[0.7rem] font-semibold text-paper">Most Popular</span>}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2.5">
                  <span className={clsx('rounded-[4px] border px-1.5 py-0.5 text-sm font-semibold', top ? 'border-wine bg-wine text-paper' : 'border-wine/40 text-wine')}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="ui-title text-lg leading-tight">{p.name}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-snug text-graphite">{p.headline}</p>
                <p className="price mt-4 whitespace-nowrap text-[1.45rem] leading-tight text-wine" aria-live="polite">{price ? <RangeText min={price.min} max={price.max} /> : 'On request'}</p>
                <p className="text-xs text-mist">{BHK_LABEL[bhk] || 'Your home'}, indicative</p>
                <p className="mt-3 flex items-center gap-1.5 rounded-md bg-blush px-3 py-2 text-xs font-medium">
                  <ShieldCheck className="size-4 text-wine" aria-hidden="true" />{p.warranty?.years ? `${p.warranty.years}-year warranty` : 'Warranty as per quotation'}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-graphite">
                  {features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden="true" />{f}</li>)}
                  {!full && p.features.length > 4 && <li className="pl-6 text-mist">and {p.features.length - 4} more</li>}
                </ul>
                <Button href={`/estimate?package=${p.slug}`} className="mt-5 h-11 w-full">Select package <Arrow className="size-3.5" /></Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-graphite">Ranges are indicative. Your final price is set after a site visit, measurements and material selection.</p>
    </div>
  );
}
