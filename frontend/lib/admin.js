'use client';

import { PUBLIC_API_URL } from './config';
import { useAuth } from '@/store/auth';
import { refreshSession } from './api';

export const can = (user, perm) => Boolean(user && (user.permissions?.includes('*') || user.permissions?.includes(perm)));
export const canAny = (user, perms) => perms.some((p) => can(user, p));
export const isContractor = (user) => user?.role === 'CONTRACTOR';

// Authenticated CSV download (the API needs the bearer token, so a plain link won't do).
export async function downloadCsv(path, filename) {
  const go = () => fetch(`${PUBLIC_API_URL}/api/v1${path}${path.includes('?') ? '&' : '?'}format=csv`, {
    credentials: 'include', headers: { Authorization: `Bearer ${useAuth.getState().accessToken}` },
  });
  let res = await go();
  if (res.status === 401 && (await refreshSession())) res = await go();
  if (!res.ok) throw new Error('Export failed. Try a smaller date range.');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const titleCase = (s) => String(s || '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const inr2 = (v) => { const n = Number(v || 0); return `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };
