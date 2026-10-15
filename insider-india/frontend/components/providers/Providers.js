'use client';

import { useEffect } from 'react';
import { refreshSession } from '@/lib/api';
import { useAuth } from '@/store/auth';

const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'];

export function readAttribution() {
  try { return JSON.parse(sessionStorage.getItem('ii-attr') || '{}'); } catch { return {}; }
}

export default function Providers({ children }) {
  useEffect(() => {
    // Restore session from the httpOnly refresh cookie once per page load.
    if (useAuth.getState().status === 'idle') {
      useAuth.getState().setLoading();
      refreshSession();
    }
    // Capture first-touch attribution for lead tracking.
    try {
      if (!sessionStorage.getItem('ii-attr')) {
        const p = new URLSearchParams(window.location.search);
        const utm = Object.fromEntries(UTM_KEYS.map((k) => [k, p.get(`utm_${k}`)]).filter(([, v]) => v).map(([k, v]) => [k, v.slice(0, 200)]));
        sessionStorage.setItem('ii-attr', JSON.stringify({
          utm: Object.keys(utm).length ? utm : undefined,
          referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
          landingPage: window.location.pathname.slice(0, 500),
        }));
      }
    } catch { /* storage unavailable */ }
  }, []);
  return children;
}
