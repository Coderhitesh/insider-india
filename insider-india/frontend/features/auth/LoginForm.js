'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { normalizeMobile } from '@/lib/format';

export const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const m = normalizeMobile(mobile);
    if (!m) return setError('Enter a valid 10-digit mobile number');
    sessionStorage.setItem('ii-login-mobile', m);
    const next = safeNext(params.get('next'));
    router.push(`/verify-otp${next ? `?next=${encodeURIComponent(next)}` : ''}`);
    return undefined;
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-md">
      <Field id="login-mobile" label="Mobile number" error={error} hint="We will send a one-time code by SMS. No password needed.">
        <Input id="login-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} autoFocus value={mobile} onChange={(e) => { setMobile(e.target.value); setError(''); }} error={error} />
      </Field>
      <Button type="submit" size="lg" className="mt-6 w-full">Send code</Button>
    </form>
  );
}
