'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { canAny } from '@/lib/admin';

// Cached lookups used by filters and forms.
const cache = {};
function load(key, path) {
  if (!cache[key]) cache[key] = api(path).then((r) => r.data).catch((e) => { delete cache[key]; throw e; });
  return cache[key];
}
export const invalidateRef = (key) => { delete cache[key]; };

export function useRefData() {
  const user = useAuth((s) => s.user);
  const [data, setData] = useState({ options: null, services: [], contractors: [], packages: [] });
  useEffect(() => {
    let live = true;
    const canContractors = canAny(user, ['contractors.view', 'bookings.assign', 'leads.assign']) && user.role !== 'CONTRACTOR';
    Promise.allSettled([
      load('options', '/catalog/funnel-options'),
      load('services', '/catalog/services'),
      canContractors ? load('contractors', '/admin/contractors?limit=200&active=true') : Promise.resolve({ items: [] }),
      load('packages', '/catalog/packages'),
    ]).then(([o, s, c, p]) => live && setData({
      options: o.value || null, services: s.value?.services || [], contractors: c.value?.items || [], packages: p.value?.packages || [],
    }));
    return () => { live = false; };
  }, [user]);
  return data;
}

export const opt = (list) => (list || []).map((o) => [o.value, o.label]);
export const LEAD_STATUSES = ['NEW', 'IN_PROGRESS', 'OTP_PENDING', 'VERIFIED', 'QUALIFIED', 'BOOKED', 'CONTRACTOR_ASSIGNED', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_COMPLETED', 'QUOTATION_DRAFT', 'QUOTATION_REVIEW', 'QUOTATION_SENT', 'WON', 'LOST', 'CANCELLED'];
export const BOOKING_STATUSES = ['CONFIRMED', 'CONTRACTOR_ASSIGNED', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_COMPLETED', 'QUOTATION_IN_PROGRESS', 'QUOTATION_SENT', 'QUOTATION_ACCEPTED', 'QUOTATION_REJECTED', 'PROJECT_STARTED', 'PROJECT_IN_PROGRESS', 'PROJECT_COMPLETED', 'CANCELLED'];
export const nice = (s) => String(s).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
