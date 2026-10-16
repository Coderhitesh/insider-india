'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LayoutDashboard, CalendarCheck, FileText, Hammer, Calculator, FolderOpen, Bell, UserRound, Gift } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';

const NAV = [
  ['/account/dashboard', 'Dashboard', LayoutDashboard],
  ['/account/bookings', 'Bookings', CalendarCheck],
  ['/account/quotations', 'Quotations', FileText],
  ['/account/projects', 'Projects', Hammer],
  ['/account/estimates', 'Estimates', Calculator],
  ['/account/documents', 'Documents', FolderOpen],
  ['/account/referrals', 'Refer & Earn', Gift],
  ['/account/notifications', 'Notifications', Bell],
  ['/account/profile', 'Profile', UserRound],
];

export default function AccountShell({ children }) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  useEffect(() => {
    if (status !== 'authenticated' || user?.role !== 'CUSTOMER') return;
    api('/notifications?unread=true&limit=1').then((r) => setUnread(r.data.unread)).catch(() => {});
  }, [status, user, pathname]);

  if (status !== 'authenticated') {
    return <div className="container-x flex min-h-[60vh] items-center gap-3 text-graphite" role="status"><Spinner className="size-5 text-wine" />Loading your account…</div>;
  }
  if (user.role !== 'CUSTOMER') {
    return (
      <div className="container-x min-h-[60vh] py-20">
        <h1 className="text-d3">This is the customer dashboard</h1>
        <p className="mt-3 text-graphite">You are signed in with a staff account.</p>
        <Button href="/admin" className="mt-6">Go to the admin panel</Button>
      </div>
    );
  }

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <div className="bg-[#fdf8f7]">
    <div className="container-x grid gap-6 py-8 lg:grid-cols-[15rem_1fr] lg:gap-10 lg:py-12">
      <nav aria-label="Account" className="-mx-5 overflow-x-auto border-b border-stone px-5 lg:sticky lg:top-24 lg:mx-0 lg:h-max lg:overflow-visible lg:rounded-2xl lg:border-0 lg:bg-paper lg:p-3 lg:shadow-[0_8px_24px_-12px_rgb(154_12_34/.15)]">
        <div className="mb-3 hidden items-center gap-3 rounded-xl bg-blush/70 p-3 lg:flex">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-wine text-sm font-semibold text-paper">{(user.name || 'U').trim().charAt(0).toUpperCase()}</span>
          <span className="min-w-0 text-xs text-graphite">Signed in as<br /><span className="block truncate text-sm font-medium text-charcoal">{user.name || `+91 ${user.mobile}`}</span></span>
        </div>
        <ul className="flex gap-1 lg:flex-col">
          {NAV.map(([href, label, Icon]) => (
            <li key={href}>
              <Link href={href} aria-current={isActive(href) ? 'page' : undefined}
                className={clsx('flex items-center gap-3 whitespace-nowrap px-3 py-2.5 text-sm transition-colors lg:rounded-lg',
                  isActive(href) ? 'border-b-2 border-wine font-medium text-wine lg:border-b-0 lg:bg-wine lg:text-paper' : 'text-graphite hover:bg-blush/60 hover:text-wine')}>
                <Icon className="size-4" aria-hidden="true" />{label}
                {href === '/account/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-wine px-1.5 text-[0.7rem] text-paper ring-1 ring-paper" aria-label={`${unread} unread`}>{unread}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
    </div>
  );
}
