'use client';

import { useEffect, useState } from 'react';

export const DEFAULT_HEADLINES = [
  { text: 'Interiors designed around the way you live.', highlight: 'designed' },
  { text: 'Crafting spaces, building stories, sometimes dreams.', highlight: 'stories, dreams.' },
];

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Hero headline that cycles through phrases. Words of the outgoing line slide up and out; the next line's words
 * rise in from below, one after another. All lines share one grid cell so the height never jumps.
 * Screen readers and search engines get the first headline as plain text.
 */
export default function RotatingHeadline({ items = DEFAULT_HEADLINES, seconds = 5, id, className }) {
  const list = items?.length ? items : DEFAULT_HEADLINES;
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(-1);
  useEffect(() => {
    if (list.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setI((n) => { setPrev(n); return (n + 1) % list.length; }), Math.max(2, seconds) * 1000);
    return () => clearInterval(t);
  }, [list.length, seconds]);

  return (
    <h1 id={id} className={className}>
      <span className="sr-only">{list[0].text}</span>
      <span aria-hidden="true" className="grid">
        {list.map((h, k) => {
          const hl = new Set(String(h.highlight || '').split(/[\s,]+/).map(norm).filter(Boolean));
          const state = k === i ? 'in' : k === prev ? 'out' : 'idle';
          return (
            <span key={k} className={`headline-line [grid-area:1/1] ${state === 'idle' ? 'invisible' : ''}`} data-state={state}>
              {h.text.split(' ').map((w, j) => (
                <span key={j} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                  <span className={`headline-word inline-block ${hl.has(norm(w)) ? 'text-wine' : ''}`} style={{ '--d': `${j * 70}ms` }}>{w}&nbsp;</span>
                </span>
              ))}
            </span>
          );
        })}
      </span>
    </h1>
  );
}
