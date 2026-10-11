'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Notice from '@/components/ui/Notice';

// Notification links point here; open the booking the visit belongs to.
export default function SiteVisitRedirect({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [err, setErr] = useState('');
  useEffect(() => { api(`/site-visits/${id}`).then((r) => router.replace(`/admin/bookings/${r.data.siteVisit.bookingId}`)).catch((e) => setErr(e.message)); }, [id, router]);
  return err ? <Notice tone="error">{err}</Notice> : <p className="text-graphite">Opening…</p>;
}
