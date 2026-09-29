'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Field, Input } from '@/components/ui/Field';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { can } from '@/lib/admin';
import { navFor } from '@/components/admin/AdminShell';

export default function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Enter your email and password.');
    setBusy(true);
    setError('');
    try {
      const res = await api('/auth/staff/login', { method: 'POST', body: form });
      useAuth.getState().setSession(res.data);
      const next = params.get('next');
      const user = res.data.user;
      const home = can(user, 'dashboard.view') ? '/admin' : navFor(user)[0]?.[1][0]?.[0] || '/admin';
      router.replace(next && next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : home);
    } catch (err) { setError(err.message); setBusy(false); }
    return undefined;
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden bg-charcoal p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <p className="font-display text-2xl tracking-[0.04em]">INSIDER INDIA</p>
        <p className="max-w-sm text-stone">Operations console for leads, site visits, quotations and projects.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} noValidate className="w-full max-w-sm space-y-5">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">Staff sign in</h1>
          <Field id="a-email" label="Email"><Input id="a-email" type="email" autoComplete="username" autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field id="a-pass" label="Password"><Input id="a-pass" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
          <p className="text-xs text-graphite">After 5 wrong attempts the account is locked for 15 minutes.</p>
        </form>
      </div>
    </div>
  );
}
