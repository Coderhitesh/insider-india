'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import GalleryGrid from './GalleryGrid';

/** Category pills that filter the grid in place (no page change). ?category=slug keeps the choice shareable. */
export default function GalleryTabs({ gallery, initial = '' }) {
  const [slug, setSlug] = useState(initial);
  useEffect(() => {
    if (initial) return;
    const q = new URLSearchParams(window.location.search).get('category');
    if (q && gallery.categories.some((c) => c.slug === q)) setSlug(q);
  }, [initial, gallery.categories]);

  const select = (s) => {
    setSlug(s);
    try {
      const url = new URL(window.location.href);
      if (s) url.searchParams.set('category', s); else url.searchParams.delete('category');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    } catch { /* ignore */ }
  };

  const cats = gallery.categories.filter((c) => c.count > 0);
  const cat = gallery.categories.find((c) => c.slug === slug);
  const items = useMemo(() => (slug ? gallery.items.filter((x) => x.category === slug) : gallery.items), [slug, gallery.items]);
  const names = Object.fromEntries(gallery.categories.map((c) => [c.slug, c.name]));
  const pill = (active) => clsx('block whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors', active ? 'border-wine bg-wine text-paper' : 'border-stone-deep hover:border-wine hover:text-wine');

  return (
    <>
      <div role="tablist" aria-label="Gallery categories" className="-mx-5 mb-10 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          <button type="button" role="tab" aria-selected={!slug} onClick={() => select('')} className={pill(!slug)}>All <span className="opacity-70">({gallery.items.length})</span></button>
          {cats.map((c) => (
            <button key={c.slug} type="button" role="tab" aria-selected={slug === c.slug} onClick={() => select(c.slug)} className={pill(slug === c.slug)}>{c.name} <span className="opacity-70">({c.count})</span></button>
          ))}
        </div>
      </div>
      {cat?.description && slug !== initial && <p className="-mt-4 mb-8 max-w-3xl text-graphite">{cat.description}</p>}
      {items.length ? <GalleryGrid key={slug || 'all'} items={items} names={slug ? {} : names} /> : (
        <div className="soft-card p-10 text-center">
          <p className="font-display text-2xl">Photos coming soon</p>
          <p className="mx-auto mt-2 max-w-md text-graphite">We are adding photos{cat ? ` of ${cat.name.toLowerCase()} projects` : ''}. Meanwhile, tell us about your space and get an estimate.</p>
          <Button href="/estimate" className="mt-6">Get Free Estimate</Button>
        </div>
      )}
    </>
  );
}
