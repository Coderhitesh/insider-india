'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import ChoiceCard from '@/components/ui/ChoiceCard';
import { Field, Input } from '@/components/ui/Field';
import { Panel, PageTitle, Loading, LoadError } from '@/components/account/Bits';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { useBookingStore } from '@/store/booking';
import { formatDate } from '@/lib/format';

const CHANNELS = [['WHATSAPP', 'WhatsApp'], ['SMS', 'SMS'], ['CALL', 'Phone call']];

export default function Profile() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi('/account/profile');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(null);

  useEffect(() => { if (data) setForm({ name: data.profile.name, email: data.profile.email || '', city: data.profile.city, preferredChannel: data.profile.preferredChannel, marketingConsent: data.profile.marketingConsent }); }, [data]);

  if (loading || !form) return error ? <LoadError error={error} onRetry={reload} /> : <Loading />;

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name';
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Enter a valid email';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await api('/account/profile', { method: 'PATCH', body: { ...form, name: form.name.trim(), email: form.email.trim() } });
      const s = useAuth.getState();
      s.setSession({ accessToken: s.accessToken, user: { ...s.user, name: res.data.profile.name, email: res.data.profile.email } });
      setMsg({ tone: 'success', text: 'Profile saved' });
    } catch (err) { setErrors(err.fieldErrors()); setMsg({ tone: 'error', text: err.message }); } finally { setSaving(false); }
  };

  const logout = async (all) => {
    setLeaving(all ? 'all' : 'one');
    try { await api(all ? '/auth/logout-all' : '/auth/logout', { method: 'POST' }); } catch { /* signing out anyway */ }
    useAuth.getState().clear();
    useBookingStore.getState().reset();
    router.replace('/');
  };

  return (
    <>
      <PageTitle title="Profile" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <form onSubmit={save} noValidate className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="p-name" label="Full name" error={errors.name}><Input id="p-name" autoComplete="name" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field id="p-mobile" label="Mobile number" hint="Your login number. Contact us to change it."><Input id="p-mobile" prefix="+91" value={data.profile.mobile} readOnly /></Field>
              <Field id="p-email" label="Email (optional)" error={errors.email} hint="Used for quotation emails."><Input id="p-email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field id="p-city" label="City"><Input id="p-city" autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">How should we contact you?</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {CHANNELS.map(([v, l]) => <ChoiceCard key={v} name="channel" value={v} compact title={l} checked={form.preferredChannel === v} onChange={() => setForm({ ...form, preferredChannel: v })} />)}
              </div>
            </fieldset>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--color-wine)]" checked={form.marketingConsent} onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })} />
              Send me design ideas and offers occasionally. You can turn this off at any time.
            </label>
            {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
            <Button type="submit" loading={saving}>Save profile</Button>
          </form>
        </Panel>
        <Panel title="Sign out" className="h-max">
          <p className="text-sm text-graphite">Member since {formatDate(data.profile.memberSince)}.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="secondary" loading={leaving === 'one'} onClick={() => logout(false)}>Log out</Button>
            <Button variant="ghost" loading={leaving === 'all'} onClick={() => logout(true)}>Log out of all devices</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
