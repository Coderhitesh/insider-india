'use client';

import { useEffect, useState } from 'react';
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
    ? <Link href={user?.role === 'CUSTOMER' ? '/account/dashboard' : '/admin'} className="inline-flex items-center gap-2 text-sm hover:text-wine"><UserRound className="size-4" />{user?.name?.split(' ')[0] || 'Account'}</Link>
    : <Link href="/login" className="text-sm hover:text-wine">Log in</Link>;

  return (
    <header className="sticky top-0 z-40 border-b border-stone bg-linen/95 backdrop-blur-sm supports-[backdrop-filter]:bg-linen/85">
      <div className="container-x flex h-18 items-center justify-between gap-6">
        <Logo company={company} />
        {!funnel && (
          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center gap-6 whitespace-nowrap text-[0.92rem]">
              {HEADER_NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} aria-current={pathname === n.href ? 'page' : undefined}
                    className={clsx('py-2 transition-colors hover:text-wine', pathname === n.href && 'text-wine underline decoration-brass decoration-1 underline-offset-8')}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="flex items-center gap-5">
          <div className="hidden whitespace-nowrap sm:block">{account}</div>
          {!funnel && <span className="hidden 2xl:block"><Button href="/estimate" variant="secondary" size="sm">Get free estimate</Button></span>}
          {!funnel && <span className="hidden sm:block"><Button href="/book-consultation" size="sm" className="whitespace-nowrap">Book a consultation</Button></span>}
          {!funnel && (
            <button type="button" className="-mr-2 p-2 xl:hidden" aria-label="Open menu" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(true)}>
              <Menu className="size-6" />
            </button>
          )}
          {funnel && <Link href="/" className="text-sm text-graphite hover:text-charcoal">Exit</Link>}
        </div>
      </div>

      {open && (
        <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-linen">
          <div className="container-x flex h-18 items-center justify-between border-b border-stone">
            <Logo company={company} />
            <button type="button" className="-mr-2 p-2" aria-label="Close menu" onClick={() => setOpen(false)}><X className="size-6" /></button>
          </div>
          <nav aria-label="Mobile" className="container-x flex-1 overflow-y-auto py-6">
            <ul className="divide-y divide-stone">
              {NAV.map((n) => (
                <li key={n.href}><Link href={n.href} className="block py-4 font-display text-2xl">{n.label}</Link></li>
              ))}
              <li className="py-4">{account}</li>
            </ul>
          </nav>
          <div className="container-x grid grid-cols-2 gap-3 border-t border-stone py-4">
            <Button href="/estimate" variant="secondary">Get free estimate</Button>
            <Button href="/book-consultation">Book consultation</Button>
          </div>
        </div>
      )}
    </header>
  );
}
