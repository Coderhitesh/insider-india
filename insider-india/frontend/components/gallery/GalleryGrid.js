'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import EstimateHover from './EstimateHover';

const estimateHref = () => '/estimate';

/** Photo grid with a lightbox. Each tile shows a "Get Estimate" button on hover. */
export default function GalleryGrid({ items, names = {} }) {
  const [open, setOpen] = useState(-1);
  const close = useCallback(() => setOpen(-1), []);
  const step = useCallback((d) => setOpen((i) => (i < 0 ? i : (i + d + items.length) % items.length)), [items.length]);
  useEffect(() => {
    if (open < 0) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, close, step]);
  const cur = items[open];

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
        {items.map((x, i) => (
          <li key={x.id} className="group relative break-inside-avoid overflow-hidden bg-stone/40">
            <button type="button" onClick={() => setOpen(i)} className="block w-full cursor-zoom-in text-left" aria-label={`View ${x.alt || 'photo'}`}>
              <Image src={x.image} alt={x.alt || x.title || ''} width={900} height={i % 3 === 1 ? 1100 : 680} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading={i < 6 ? 'eager' : 'lazy'} />
              <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-paper/85 text-charcoal opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><Expand className="size-4" /></span>
              {(x.title || names[x.category]) && (
                <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-paper/90 px-3 py-1 text-xs font-medium text-charcoal opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">{names[x.category] || x.title}</span>
              )}
            </button>
            <EstimateHover href={estimateHref(x.category)} />
          </li>
        ))}
      </ul>

      {cur && (
        <div role="dialog" aria-modal="true" aria-label={cur.alt || 'Photo'} className="fixed inset-0 z-[80] flex flex-col bg-black/95" onClick={close}>
          <div className="flex items-center justify-between gap-3 p-3 text-paper sm:p-5" onClick={(e) => e.stopPropagation()}>
            <p className="min-w-0 truncate text-sm">{cur.title || names[cur.category] || ''}<span className="ml-2 text-paper/60">{open + 1} / {items.length}</span></p>
            <button type="button" onClick={close} className="flex size-10 items-center justify-center rounded-full bg-paper/10 hover:bg-paper/20" aria-label="Close"><X className="size-5" /></button>
          </div>
          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
            <Image src={cur.image} alt={cur.alt || ''} fill sizes="100vw" className="object-contain" priority />
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-paper ring-1 ring-paper/30 hover:bg-black/75 sm:left-5" aria-label="Previous photo"><ChevronLeft className="size-6" /></button>
                <button type="button" onClick={() => step(1)} className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-paper ring-1 ring-paper/30 hover:bg-black/75 sm:right-5" aria-label="Next photo"><ChevronRight className="size-6" /></button>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 p-4" onClick={(e) => e.stopPropagation()}>
            <Link href={estimateHref(cur.category)} className="inline-flex items-center rounded-lg bg-wine px-5 py-3 text-sm font-semibold text-paper hover:bg-wine-deep">Get Estimate for a space like this</Link>
            {cur.projectSlug && <Link href={`/project/${cur.projectSlug}`} className="inline-flex items-center rounded-lg border border-paper/50 px-5 py-3 text-sm font-semibold text-paper hover:bg-paper/10">View project</Link>}
          </div>
        </div>
      )}
    </>
  );
}
