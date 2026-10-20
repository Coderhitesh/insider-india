'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TermsNote from '@/components/ui/TermsNote';
import Button from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import { api } from '@/lib/api';
import { normalizeMobile } from '@/lib/format';
import { useBookingStore } from '@/store/booking';
import { useAuth } from '@/store/auth';
import { readAttribution } from '@/components/providers/Providers';

// Starts the booking funnel with name + mobile; the funnel continues from the next question.
export default function ConsultationForm({ inverse = false, id = 'cta', variant = 'default' }) {
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

  if (variant === 'card') {
    const inp = 'h-11 rounded-md text-sm';
    return (
      <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
        <Field id={`${id}-name`} error={errors.name} className={user ? 'sm:col-span-2' : ''}>
          <label htmlFor={`${id}-name`} className="sr-only">Full name</label>
          <Input id={`${id}-name`} placeholder="Full name" autoComplete="name" className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        </Field>
        {!user && (
          <Field id={`${id}-mobile`} error={errors.mobile}>
            <label htmlFor={`${id}-mobile`} className="sr-only">Mobile number</label>
            <Input id={`${id}-mobile`} type="tel" inputMode="numeric" placeholder="Mobile number" autoComplete="tel-national" maxLength={14} className={inp} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} error={errors.mobile} />
          </Field>
        )}
        <Field id={`${id}-city`} className="sm:col-span-2">
          <label htmlFor={`${id}-city`} className="sr-only">City</label>
          <Input id={`${id}-city`} placeholder="City" autoComplete="address-level2" className={inp} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          {error && <Notice tone="error" className="mb-3">{error}</Notice>}
          <Button type="submit" loading={loading} className="h-11 w-full">Get a free consultation <span aria-hidden="true">→</span></Button>
          <p className="mt-2 text-center text-[0.7rem] text-graphite">We verify your number with a one-time code in the next step.</p>
          <TermsNote className="mt-1 text-center !text-[0.7rem]" />
        </div>
      </form>
    );
  }

  const labelCls = inverse ? '[&_label]:text-paper [&_p]:text-paper/85' : '';
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
        <TermsNote className="mt-1" light={inverse} />
      </div>
    </form>
  );
}
