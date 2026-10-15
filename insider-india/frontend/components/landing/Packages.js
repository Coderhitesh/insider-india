'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import RangeText from '@/components/ui/RangeText';
import { HOME_IMG, Eyebrow, Arrow } from './media';

const BHK_LABEL = { '1BHK': '1 BHK', '2BHK': '2 BHK', '3BHK': '3 BHK', '4BHK': '4 BHK', '5BHK_PLUS': '5 BHK+' };

export default function Packages({ packages }) {
  const bhks = useMemo(() => {
    const set = new Set(packages.flatMap((p) => p.pricing.map((x) => x.bhk)));
    return Object.keys(BHK_LABEL).filter((k) => set.has(k));
  }, [packages]);
  const [bhk, setBhk] = useState(bhks.includes('3BHK') ? '3BHK' : bhks[0]);

  return (
    <section aria-labelledby="packages-title" className="py-14 sm:py-16">
      <div className="container-x">
        <div className="mb-8 grid gap-5 lg:mb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <Eyebrow>Our packages</Eyebrow>
            <h2 id="packages-title" className="mt-2 text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.08]">
              {packages.length === 4 ? 'Four' : 'Our'} packages, <span className="text-wine">one honest</span> process
            </h2>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-6 lg:pl-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <p className="max-w-md text-sm leading-relaxed text-graphite">Choose the finish level that suits you. Compare what&rsquo;s included in each package and find the right fit for your home.</p>
              <Link href="/packages" className="inline-flex shrink-0 items-center gap-1.5 border-b border-wine pb-0.5 text-sm font-medium text-wine hover:text-wine-deep">Compare packages<Arrow className="size-3.5" /></Link>
            </div>
            {bhks.length > 1 && (
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="sr-only">Show indicative ranges for</legend>
                <span aria-hidden="true" className="mr-1 text-xs text-graphite">Ranges for</span>
                {bhks.map((b) => (
                  <label key={b} className={clsx('cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                    bhk === b ? 'border-wine bg-wine text-paper' : 'border-stone-deep text-charcoal hover:border-wine')}>
                    <input type="radio" name="home-pkg-bhk" value={b} checked={bhk === b} onChange={() => setBhk(b)} className="sr-only" />
                    {BHK_LABEL[b]}
                  </label>
                ))}
              </fieldset>
            )}
          </div>
        </div>

        {!packages.length ? (
          <p className="text-graphite">Package details are being updated. <Link href="/book-consultation" className="text-wine underline">Book a consultation</Link> and we will walk you through the options.</p>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {packages.map((p, i) => {
              const price = p.pricing.find((x) => x.bhk === bhk);
              const img = p.image || HOME_IMG.packages[i % HOME_IMG.packages.length];
              const top = p.isRecommended;
              return (
                <li key={p.id} className={clsx('relative flex flex-col rounded-xl bg-paper p-4', top ? 'border-2 border-wine shadow-[0_18px_40px_-20px_rgb(154_12_34/.45)]' : 'soft-card')}>
                  {top && <span className="absolute -top-px right-4 rounded-b-md bg-wine px-2.5 py-1 text-[0.65rem] font-semibold text-paper">Most Popular</span>}
                  <div className="flex flex-1 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className={clsx('rounded-[4px] border px-1.5 py-0.5 text-sm font-semibold tabular-nums', top ? 'border-wine bg-wine text-paper' : 'border-wine/40 text-wine')}>{String(i + 1).padStart(2, '0')}</span>
                        <h3 className="ui-title text-[1.02rem] leading-tight">{p.name}</h3>
                      </div>
                      <p className="mt-2.5 text-[0.8rem] leading-snug text-graphite">{p.headline}</p>
                      <p className="price mt-3 whitespace-nowrap text-[1.3rem] leading-tight text-wine" aria-live="polite">
                        {price ? <RangeText min={price.min} max={price.max} /> : 'On request'}
                      </p>
                      <p className="text-[0.68rem] text-mist">{BHK_LABEL[bhk] || 'Your home'}, indicative{p.warranty?.years ? ` · ${p.warranty.years}-yr warranty` : ''}</p>
                      <ul className="mt-3 space-y-1.5 text-[0.8rem] text-graphite">
                        {p.features.slice(0, 4).map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-wine" aria-hidden="true" />{f}</li>)}
                      </ul>
                    </div>
                    <div className="relative w-[34%] shrink-0 self-start overflow-hidden rounded-lg" style={{ aspectRatio: '3 / 5' }}>
                      <Image src={img} alt="" fill sizes="140px" className="object-cover" />
                    </div>
                  </div>
                  <Link href="/packages" className="btn mt-4 flex h-10 items-center justify-center gap-2 bg-wine text-sm font-medium text-paper transition-colors hover:bg-wine-deep">
                    View package <Arrow className="size-3.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-5 text-xs text-graphite">Ranges are indicative. Your final price is set after a site visit, measurements and material selection.</p>
      </div>
    </section>
  );
}
