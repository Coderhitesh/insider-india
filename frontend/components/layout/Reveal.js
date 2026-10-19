'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SKIP = ['/book-consultation', '/estimate', '/account', '/login', '/verify-otp'];
const TARGETS = 'main section .container-x > *, main section ul > li, main section ol > li, main .soft-card';

/**
 * Scroll animations: content below the fold fades/slides in as it enters the screen (staggered in lists).
 * Progressive — elements are only hidden once JS is running, and never for reduced-motion users.
 */
export default function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (SKIP.some((p) => pathname.startsWith(p))) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    const t = setTimeout(() => {
      const seen = new Set();
      document.querySelectorAll(TARGETS).forEach((el) => {
        if (seen.has(el) || el.closest('[data-no-reveal], form, [role=dialog], header') || el.querySelector('[data-reveal]')) return;
        // Skip anything already on screen when the page loads (no flash), and nested targets.
        if (el.parentElement?.closest('[data-reveal]')) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) return;
        seen.add(el);
        const idx = el.tagName === 'LI' ? [...el.parentElement.children].indexOf(el) : 0;
        el.style.setProperty('--reveal-delay', `${Math.min(idx, 6) * 70}ms`);
        el.setAttribute('data-reveal', '');
        io.observe(el);
      });
    }, 60);
    return () => { clearTimeout(t); io.disconnect(); document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => el.classList.add('is-in')); };
  }, [pathname]);
  return null;
}
