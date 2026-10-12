'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Menu, X, UserRound } from 'lucide-react';
import Logo from './Logo';
import Button from '@/components/ui/Button';
import { NAV, HEADER_NAV } from '@/lib/content';
import { useAuth } from '@/store/auth';

export default function Header({ company }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { status, user } = useAuth();
  const funnel = pathname.startsWith('/book-consultation') || pathname.startsWith('/estimate');

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const account = status === 'authenticated'
    ? <Link href={user?.role === 'CUSTOMER' ? '/account/dashboard' : '/admin'} aria-label="Your account" className="inline-flex items-center gap-2 text-sm hover:text-wine"><UserRound className="size-[18px]" /><span className="hidden 2xl:inline">{user?.name?.split(' ')[0] || 'Account'}</span></Link>
    : <Link href="/login" aria-label="Log in" className="inline-flex items-center gap-2 text-sm hover:text-wine"><UserRound className="size-[18px]" /><span className="hidden 2xl:inline">Log in</span></Link>;

  // Rendered into <body>: the header's backdrop-blur makes it the containing block for `position: fixed`
  // children, which squeezed the menu into the 72px header strip on phones.
  const menu = open && typeof document !== 'undefined' && createPortal(
    <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" className="site-skin fixed inset-0 z-[60] flex flex-col bg-paper">
      <div className="container-x flex h-[72px] shrink-0 items-center justify-between border-b border-stone">
        <Logo company={company} />
        <button type="button" className="-mr-2 p-2" aria-label="Close menu" onClick={() => setOpen(false)}><X className="size-6" /></button>
      </div>
      <nav aria-label="Mobile" className="container-x flex-1 overflow-y-auto py-4">
        <ul className="divide-y divide-stone">
          {[{ href: '/', label: 'Home' }, ...NAV, { href: '/about', label: 'About' }, { href: '/contact', label: 'Contact' }].map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={pathname === n.href ? 'page' : undefined}
                className={clsx('flex items-center justify-between py-3.5 font-display text-[1.6rem] leading-tight hover:text-wine', pathname === n.href && 'text-wine')}>
                {n.label}<span aria-hidden="true" className="text-lg text-wine">→</span>
              </Link>
            </li>
          ))}
          <li className="py-4">{account}</li>
        </ul>
      </nav>
      <div className="container-x grid shrink-0 grid-cols-2 gap-3 border-t border-stone py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button href="/estimate" variant="secondary" className="whitespace-nowrap px-2 text-[0.8rem] min-[380px]:text-sm">Free estimate</Button>
        <Button href="/book-consultation" className="whitespace-nowrap px-2 text-[0.8rem] min-[380px]:text-sm">Book consultation</Button>
      </div>
    </div>,
    document.body,
  );

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-stone bg-paper/95 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/90">
      <div className="container-x flex h-[72px] items-center justify-between gap-2">
        <Logo company={company} />
        {!funnel && (
          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center gap-7 whitespace-nowrap text-[0.9rem]">
              {HEADER_NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} aria-current={pathname === n.href ? 'page' : undefined}
                    className={clsx('relative py-2 transition-colors hover:text-wine', pathname === n.href ? 'font-medium text-wine after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-wine' : 'text-charcoal/80')}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden whitespace-nowrap sm:block">{account}</div>
          {!funnel && <span className="hidden lg:block"><Button href="/estimate" variant="secondary" size="sm" className="h-10 whitespace-nowrap border-[1.5px] px-4">Get Free Estimate</Button></span>}
          {!funnel && <span className="hidden sm:block"><Button href="/book-consultation" size="sm" className="h-10 whitespace-nowrap px-4">Book a Consultation</Button></span>}
          {!funnel && (
            <button type="button" className="-mr-2 p-2 xl:hidden" aria-label="Open menu" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(true)}>
              <Menu className="size-6" />
            </button>
          )}
          {funnel && <Link href="/" className="text-sm text-graphite hover:text-charcoal">Exit</Link>}
        </div>
      </div>

    </header>
    {menu}
    </>
  );
}
