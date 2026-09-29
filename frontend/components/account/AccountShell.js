'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LayoutDashboard, CalendarCheck, FileText, Hammer, Calculator, FolderOpen, Bell, UserRound } from 'lucide-react';
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
    <div className="container-x grid gap-8 py-8 lg:grid-cols-[13rem_1fr] lg:gap-12 lg:py-12">
      <nav aria-label="Account" className="-mx-5 overflow-x-auto border-b border-stone px-5 lg:mx-0 lg:overflow-visible lg:border-0 lg:px-0">
        <p className="mb-4 hidden text-sm text-graphite lg:block">Signed in as<br /><span className="text-charcoal">{user.name || `+91 ${user.mobile}`}</span></p>
        <ul className="flex gap-1 lg:flex-col">
          {NAV.map(([href, label, Icon]) => (
            <li key={href}>
              <Link href={href} aria-current={isActive(href) ? 'page' : undefined}
                className={clsx('flex items-center gap-3 whitespace-nowrap px-3 py-2.5 text-sm transition-colors lg:rounded-[3px]',
                  isActive(href) ? 'border-b-2 border-wine text-wine lg:border-b-0 lg:bg-paper lg:shadow-[inset_2px_0_0_var(--color-wine)]' : 'text-graphite hover:text-charcoal')}>
                <Icon className="size-4" aria-hidden="true" />{label}
                {href === '/account/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-wine px-1.5 text-[0.7rem] text-paper" aria-label={`${unread} unread`}>{unread}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
