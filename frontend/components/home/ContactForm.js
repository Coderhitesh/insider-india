'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import { api } from '@/lib/api';
import { normalizeMobile } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { readAttribution } from '@/components/providers/Providers';

const TOPICS = [
  ['GENERAL', 'General enquiry'], ['NEW_PROJECT', 'New interior project'], ['COMMERCIAL', 'Office / commercial space'],
  ['EXISTING_PROJECT', 'About my ongoing project'], ['PARTNERSHIP', 'Vendor / partnership'], ['CAREERS', 'Careers'], ['FEEDBACK', 'Feedback / complaint'], ['OTHER', 'Something else'],
];
const CONTACT = [['CALL', 'Phone call'], ['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email']];
const selectCls = 'h-13 w-full border border-stone-deep bg-paper px-4 text-base text-charcoal focus:border-wine focus:outline-none';

/** Contact page: a plain enquiry that lands in Admin → Enquiries. */
export default function ContactForm() {
  const user = useAuth((s) => s.user);
  const blank = { name: user?.name || '', mobile: '', email: '', city: '', topic: 'GENERAL', message: '', preferredContact: 'CALL', consent: false, website: '' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    const mobile = user?.mobile || form.mobile;
    if (form.name.trim().length < 2) errs.name = 'Enter your name';
    if (!normalizeMobile(mobile)) errs.mobile = 'Enter a valid 10-digit mobile number';
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    if (form.preferredContact === 'EMAIL' && !form.email.trim()) errs.email = 'Add your email so we can reply';
    if (form.message.trim().length < 10) errs.message = 'Please write a few words (at least 10 characters)';
    if (!form.consent) errs.consent = 'Please agree to be contacted';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true); setError('');
    try {
      const { utm } = readAttribution();
      const res = await api('/enquiries', { method: 'POST', body: { ...form, mobile, name: form.name.trim(), email: form.email.trim(), city: form.city.trim() || undefined, message: form.message.trim(), page: window.location.pathname, utm } });
      setDone({ number: res.data.enquiryNumber, message: res.message });
    } catch (err) {
      setErrors(err.fieldErrors?.() || {}); setError(err.message);
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="py-6 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
        <p className="mt-4 font-display text-2xl">Message sent</p>
        <p className="mx-auto mt-2 max-w-md text-graphite">{done.message}</p>
        {done.number && <p className="mt-3 text-sm">Reference: <strong className="tabular">{done.number}</strong></p>}
        <Button variant="secondary" className="mt-6" onClick={() => { setDone(null); setForm(blank); }}>Send another message</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field id="c-name" label="Your name" error={errors.name}><Input id="c-name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} /></Field>
      <Field id="c-mobile" label="Mobile number" error={errors.mobile} hint={user ? 'Your account number' : undefined}>
        <Input id="c-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} readOnly={Boolean(user)} value={user?.mobile || form.mobile} onChange={set('mobile')} error={errors.mobile} />
      </Field>
      <Field id="c-email" label="Email (optional)" error={errors.email}><Input id="c-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} /></Field>
      <Field id="c-city" label="City (optional)"><Input id="c-city" autoComplete="address-level2" value={form.city} onChange={set('city')} /></Field>
      <Field id="c-topic" label="What is it about?" className="sm:col-span-2">
        <select id="c-topic" className={selectCls} value={form.topic} onChange={set('topic')}>{TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </Field>
      <Field id="c-msg" label="Your message" error={errors.message} className="sm:col-span-2">
        <Textarea id="c-msg" rows={5} maxLength={3000} value={form.message} onChange={set('message')} error={errors.message} placeholder="Tell us how we can help…" />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium">How should we reply?</legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT.map(([v, l]) => (
            <label key={v} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-wine ${form.preferredContact === v ? 'border-wine bg-wine text-paper' : 'border-stone-deep bg-paper hover:border-wine'}`}>
              <input type="radio" name="pref" value={v} checked={form.preferredContact === v} onChange={set('preferredContact')} className="sr-only" />{l}
            </label>
          ))}
        </div>
      </fieldset>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label></div>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 size-4 accent-wine" checked={form.consent} onChange={set('consent')} />I agree to be contacted by INSIDER INDIA about my enquiry.</label>
        {errors.consent && <p className="mt-1 text-caption text-error" role="alert">{errors.consent}</p>}
      </div>
      {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
      <div className="sm:col-span-2"><Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">Send message</Button></div>
    </form>
  );
}
