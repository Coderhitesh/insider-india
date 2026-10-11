'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, Inbox, CalendarCheck, CalendarClock, FileText, Hammer, Users, HardHat, ShieldCheck, KeyRound, Package, Wrench,
  Calculator, Images, Bell, Settings, ScrollText, FolderOpen, BarChart3, Menu, X, LogOut,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';
import { can, canAny, isContractor } from '@/lib/admin';

const GROUPS = [
  ['Operations', [
    ['/admin', 'Dashboard', LayoutDashboard, ['dashboard.view']],
    ['/admin/leads', 'Leads', Inbox, ['leads.view']],
    ['/admin/bookings', 'Bookings', CalendarCheck, ['bookings.view']],
    ['/admin/site-visits', 'Site visits', CalendarClock, ['site_visit.view']],
    ['/admin/quotations', 'Quotations', FileText, ['quotations.view']],
    ['/admin/projects', 'Projects', Hammer, ['bookings.view']],
  ]],
  ['People', [
    ['/admin/customers', 'Customers', Users, ['customers.view']],
    ['/admin/contractors', 'Contractors', HardHat, ['contractors.view']],
    ['/admin/users', 'Staff users', ShieldCheck, ['users.view']],
    ['/admin/roles', 'Roles & permissions', KeyRound, ['roles.manage']],
  ]],
  ['Catalogue', [
    ['/admin/packages', 'Packages', Package, ['packages.view']],
    ['/admin/services', 'Services', Wrench, ['packages.view']],
    ['/admin/estimate-rules', 'Estimate rules', Calculator, ['packages.view']],
    ['/admin/content', 'Website content', Images, ['content.manage']],
  ]],
  ['System', [
    ['/admin/notifications', 'Notifications', Bell, ['notifications.send']],
    ['/admin/settings', 'Settings', Settings, ['settings.view']],
    ['/admin/uploads', 'Uploads', FolderOpen, ['settings.view']],
    ['/admin/audit-logs', 'Audit logs', ScrollText, ['audit_logs.view']],
    ['/admin/reports', 'Reports', BarChart3, ['reports.view']],
  ]],
];

export function navFor(user) {
  return GROUPS.map(([g, items]) => [g, items.filter(([, , , perms]) => canAny(user, perms))]).filter(([, items]) => items.length);
}

export default function AdminShell({ children }) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isLogin = pathname === '/admin/login';

  useEffect(() => { if (!isLogin && status === 'anonymous') router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`); }, [status, isLogin, pathname, router]);
  useEffect(() => setOpen(false), [pathname]);

  if (isLogin) return children;
  if (status !== 'authenticated') return <div className="flex min-h-dvh items-center justify-center gap-3 text-graphite" role="status"><Spinner className="size-5 text-wine" />Loading console…</div>;
  if (user.role === 'CUSTOMER') {
    return <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center"><h1 className="text-d3">Staff only</h1><p className="text-graphite">This console is for INSIDER INDIA staff and contractors.</p><Link href="/account/dashboard" className="text-wine underline">Go to your dashboard</Link></div>;
  }

  const groups = navFor(user);
  const active = (href) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    useAuth.getState().clear();
    router.replace('/admin/login');
  };

  const nav = (
    <nav aria-label="Console" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/20 px-5">
        <span aria-hidden="true" className="flex size-8 items-center justify-center bg-paper font-display text-sm text-wine">II</span>
        <Link href={groups[0]?.[1][0]?.[0] || '/admin'} className="flex flex-col leading-none text-paper">
          <span className="whitespace-nowrap font-display text-[0.85rem]">INSIDER INDIA</span>
          <span className="mt-1 text-[0.6rem] font-semibold tracking-[0.2em] text-paper/75">{isContractor(user) ? 'CONTRACTOR' : 'CONSOLE'}</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map(([g, items]) => (
          <div key={g} className="mb-5">
            <p className="px-2 pb-1.5 text-[0.68rem] font-semibold tracking-[0.12em] text-paper/60">{g.toUpperCase()}</p>
            <ul>
              {items.map(([href, label, Icon]) => (
                <li key={href}>
                  <Link href={href} aria-current={active(href) ? 'page' : undefined}
                    className={clsx('flex items-center gap-3 px-2 py-2 text-sm font-medium', active(href) ? 'bg-paper text-wine' : 'text-paper/85 hover:bg-white/10 hover:text-paper')}>
                    <Icon className="size-4" aria-hidden="true" />{label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/20 p-4 text-sm text-paper/80">
        <p className="truncate text-paper">{user.name}</p>
        <p className="truncate text-xs">{user.email || `+91 ${user.mobile}`} · {user.role.replace('_', ' ').toLowerCase()}</p>
        <button type="button" onClick={logout} className="mt-3 inline-flex items-center gap-2 hover:text-paper"><LogOut className="size-4" />Log out</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#fbf6f6] lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden bg-wine lg:sticky lg:top-0 lg:block lg:h-dvh">{nav}</aside>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-wine px-4 text-paper lg:hidden">
        <span className="font-display text-sm">INSIDER INDIA</span>
        <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="size-6" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-charcoal/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-wine">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-4 text-paper"><X className="size-5" /></button>
            {nav}
          </aside>
        </div>
      )}
      <main id="main" className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}

export function Guard({ perm, anyOf, children }) {
  const user = useAuth((s) => s.user);
  const ok = perm ? can(user, perm) : anyOf ? canAny(user, anyOf) : true;
  if (!ok) return <div className="border-2 border-wine bg-paper p-8"><p className="text-lg font-medium">You don&apos;t have access to this page</p><p className="mt-1 text-graphite">Ask a Super Admin to grant the permission you need.</p></div>;
  return children;
}
