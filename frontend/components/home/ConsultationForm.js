'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import { api } from '@/lib/api';
import { normalizeMobile } from '@/lib/format';
import { useBookingStore } from '@/store/booking';
import { useAuth } from '@/store/auth';
import { readAttribution } from '@/components/providers/Providers';

// Starts the booking funnel with name + mobile; the funnel continues from the next question.
export default function ConsultationForm({ inverse = false, id = 'cta' }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const setLead = useBookingStore((s) => s.setLead);
  const [form, setForm] = useState({ name: '', mobile: '', city: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name';
    if (!user && !normalizeMobile(form.mobile)) errs.mobile = 'Enter a valid 10-digit mobile number';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setError('');
    try {
      const res = await api('/leads', { method: 'POST', body: { flow: 'BOOKING', name: form.name.trim(), mobile: user?.mobile || form.mobile, city: form.city || undefined, ...readAttribution() } });
      setLead(res.data.lead.id, res.data.leadToken);
      router.push('/book-consultation');
    } catch (err) {
      setErrors(err.fieldErrors?.() || {});
      setError(err.message);
      setLoading(false);
    }
  };

  const labelCls = inverse ? '[&_label]:text-paper [&_p]:text-stone' : '';
  return (
    <form onSubmit={submit} noValidate className={`grid gap-4 sm:grid-cols-3 ${labelCls}`}>
      <Field id={`${id}-name`} label="Full name" error={errors.name}>
        <Input id={`${id}-name`} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
      </Field>
      {!user && (
        <Field id={`${id}-mobile`} label="Mobile number" error={errors.mobile}>
          <Input id={`${id}-mobile`} type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} error={errors.mobile} />
        </Field>
      )}
      <Field id={`${id}-city`} label="City (optional)">
        <Input id={`${id}-city`} autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </Field>
      <div className="sm:col-span-3">
        {error && <Notice tone="error" className="mb-4">{error}</Notice>}
        <Button type="submit" size="lg" loading={loading} variant={inverse ? 'light' : 'primary'}>Continue to consultation</Button>
        <p className={`mt-3 text-sm ${inverse ? 'text-stone' : 'text-graphite'}`}>We will verify your number with a one-time code in the next steps.</p>
      </div>
    </form>
  );
}
