'use client';

import { useEffect } from 'react';
import { refreshSession } from '@/lib/api';
import { useAuth } from '@/store/auth';

const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'];

const REF_KEY = 'ii-ref';
const REF_DAYS = 30;

/** Refer & Earn code from a share link (?ref=II-XXXXXX), kept for 30 days on this device. */
export function readReferralCode() {
  try {
    const r = JSON.parse(localStorage.getItem(REF_KEY) || 'null');
    return r && r.exp > Date.now() ? r.code : undefined;
  } catch { return undefined; }
}

export function readAttribution() {
  let attr = {};
  try { attr = JSON.parse(sessionStorage.getItem('ii-attr') || '{}'); } catch { /* storage unavailable */ }
  const referralCode = readReferralCode();
  return referralCode ? { ...attr, referralCode } : attr;
}

export default function Providers({ children }) {
  useEffect(() => {
    // Restore session from the httpOnly refresh cookie once per page load.
    if (useAuth.getState().status === 'idle') {
      useAuth.getState().setLoading();
      refreshSession();
    }
    // Referral link: the first referrer's code is kept (a later link does not replace it while valid).
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref && /^II-[A-Z0-9]{6}$/i.test(ref) && !readReferralCode()) localStorage.setItem(REF_KEY, JSON.stringify({ code: ref.toUpperCase(), exp: Date.now() + REF_DAYS * 864e5 }));
    } catch { /* storage unavailable */ }
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
