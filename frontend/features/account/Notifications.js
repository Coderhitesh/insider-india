'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { PageTitle, Empty, Loading, LoadError } from '@/components/account/Bits';
import { api } from '@/lib/api';
import { formatDateTime } from './time';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [unread, setUnread] = useState(0);
  const [state, setState] = useState({ loading: true, error: null });

  const load = useCallback(async (p) => {
    setState({ loading: true, error: null });
    try {
      const res = await api(`/notifications?page=${p}&limit=20`);
      setItems((prev) => (p === 1 ? res.data.items : [...prev, ...res.data.items]));
      setUnread(res.data.unread);
      setMeta(res.meta);
      setState({ loading: false, error: null });
    } catch (error) { setState({ loading: false, error }); }
  }, []);
  useEffect(() => { load(page); }, [page, load]);

  const markRead = (n) => {
    if (n.readAt) return;
    setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
  };
  const markAll = async () => {
    await api('/notifications/read-all', { method: 'POST' }).catch(() => {});
    setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <>
      <PageTitle title="Notifications">{unread > 0 && <Button size="sm" variant="secondary" onClick={markAll}>Mark all as read</Button>}</PageTitle>
      {state.error && !items.length ? <LoadError error={state.error} onRetry={() => load(page)} /> : state.loading && !items.length ? <Loading /> : !items.length ? (
        <Empty title="No notifications" body="Updates about your booking, site visit, quotation and project will appear here." />
      ) : (
        <>
          <ul className="divide-y divide-stone rounded-[3px] border border-stone bg-paper">
            {items.map((n) => {
              const inner = (
                <div className="flex gap-3 p-5">
                  <span className={clsx('mt-2 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-wine')} aria-hidden="true" />
                  <div className="flex-1">
                    <p className={clsx(!n.readAt && 'font-semibold')}>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-graphite">{n.body}</p>}
                    <p className="mt-1 text-xs text-graphite">{formatDateTime(n.createdAt)}{!n.readAt && <span className="sr-only"> (unread)</span>}</p>
                  </div>
                </div>
              );
              const safeLink = n.link && n.link.startsWith('/') && !n.link.startsWith('//') ? n.link : null;
              return (
                <li key={n.id}>
                  {safeLink ? <Link href={safeLink} onClick={() => markRead(n)} className="block hover:bg-linen/60">{inner}</Link>
                    : <button type="button" onClick={() => markRead(n)} className="block w-full text-left hover:bg-linen/60">{inner}</button>}
                </li>
              );
            })}
          </ul>
          {meta && meta.page < meta.pages && <Button variant="secondary" className="mt-6" loading={state.loading} onClick={() => setPage((p) => p + 1)}>Load more</Button>}
        </>
      )}
    </>
  );
}
