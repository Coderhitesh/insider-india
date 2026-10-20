'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/**
 * Banner slider: slides move right → left, dots show how many banners there are, swipe/drag left or right,
 * click (or Enter) opens `href` (Get Free Estimate). A copy of the first slide sits at the end so the loop
 * always keeps moving in the same direction.
 */
export default function HeroSlider({ slides, interval = 4000, className = '', priority = false, href = '/estimate', label = 'Get a free estimate' }) {
  const router = useRouter();
  const count = slides.length;
  const list = count > 1 ? [...slides, slides[0]] : slides;
  const [pos, setPos] = useState(0); // index in `list`
  const [animate, setAnimate] = useState(true);
  const [drag, setDrag] = useState(0); // px while swiping
  const [paused, setPaused] = useState(false);
  const box = useRef(null);
  const start = useRef(null);
  const moved = useRef(false);

  const go = useCallback((n) => { setAnimate(true); setPos(n); }, []);
  const next = useCallback(() => go(pos + 1), [go, pos]);
  const prev = useCallback(() => {
    if (pos === 0) { setAnimate(false); setPos(count); requestAnimationFrame(() => requestAnimationFrame(() => go(count - 1))); } else go(pos - 1);
  }, [go, pos, count]);

  // Autoplay (paused while hovering, dragging or when the tab is hidden).
  useEffect(() => {
    if (count < 2 || paused) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => { if (!document.hidden) next(); }, interval);
    return () => clearInterval(t);
  }, [count, paused, interval, next]);

  // After sliding onto the copy of slide 1, jump back to the real slide 1 without animation.
  const onEnd = () => { if (pos === count && count > 1) { setAnimate(false); setPos(0); } };

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, w: box.current?.offsetWidth || 1 };
    moved.current = false;
    setPaused(true);
  };
  const onMove = (e) => {
    if (!start.current || count < 2) return;
    const dx = e.clientX - start.current.x;
    if (Math.abs(dx) > 6) moved.current = true;
    if (moved.current) { setAnimate(false); setDrag(dx); }
  };
  const onUp = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const threshold = Math.min(80, start.current.w * 0.15);
    start.current = null;
    setDrag(0);
    if (moved.current && count > 1) {
      if (dx < -threshold) next(); else if (dx > threshold) prev(); else go(pos);
    }
    setPaused(false);
  };
  const onClick = () => { if (!moved.current) router.push(href); };

  const active = count > 1 ? pos % count : 0;
  return (
    <div ref={box} role="link" tabIndex={0} aria-label={label} aria-roledescription="carousel"
      className={`group relative cursor-pointer touch-pan-y select-none overflow-hidden ${className}`}
      onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') router.push(href); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => { setPaused(false); if (start.current) onUp({ clientX: start.current.x }); }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="flex h-full w-full" onTransitionEnd={onEnd}
        style={{ transform: `translateX(calc(${-pos * 100}% + ${drag}px))`, transition: animate ? 'transform 800ms cubic-bezier(0.65, 0, 0.35, 1)' : 'none' }}>
        {list.map((s, n) => (
          <div key={n} className="relative h-full w-full shrink-0" aria-hidden={n !== pos || undefined}>
            <Image src={s.src} alt={n === count ? '' : s.alt} fill draggable={false} priority={priority && n === 0} quality={90}
              sizes="(min-width:1024px) 54vw, 100vw" className="pointer-events-none object-cover transition-transform duration-[1200ms] group-hover:scale-[1.03]" />
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {slides.map((_, n) => (
            <button key={n} type="button" aria-label={`Show banner ${n + 1} of ${count}`} aria-current={n === active || undefined} onClick={() => go(n)}
              className={`h-2 rounded-full shadow-[0_1px_4px_rgb(0_0_0/.35)] transition-all duration-300 ${n === active ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/90'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
