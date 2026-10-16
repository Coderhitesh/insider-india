'use client';

import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Copy, Check, Share2, Gift, Wallet, UserPlus, ChevronDown, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Panel, PageTitle, Badge, Loading, LoadError, Empty } from '@/components/account/Bits';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { formatDate, formatINR } from '@/lib/format';

const TYPES = [['CUSTOMER', 'Existing customer'], ['FRIEND', 'Friend / family'], ['PROPERTY_DEALER', 'Property dealer'], ['BROKER', 'Broker'], ['PARTNER', 'Business partner'], ['OTHER', 'Other']];
const PROPERTY = ['Apartment / flat', 'Villa / independent house', 'Office', 'Shop / showroom', 'Restaurant / café', 'Other'];
const BADGE = {
  SUBMITTED: ['Submitted', 'neutral'], VERIFIED: ['Verified', 'neutral'], CONTACTED: ['Contacted', 'neutral'], SITE_VISIT_DONE: ['Site visit done', 'neutral'],
  QUOTATION_SHARED: ['Quotation shared', 'neutral'], AGREEMENT_SIGNED: ['Agreement signed', 'neutral'], ADVANCE_RECEIVED: ['Reward pending approval', 'action'],
  REWARD_APPROVED: ['Credit added', 'good'], REWARD_PAID: ['Reward paid', 'good'], REJECTED: ['Not eligible', 'muted'], WITHHELD: ['On hold', 'muted'],
};
const FLOW = ['SUBMITTED', 'VERIFIED', 'CONTACTED', 'SITE_VISIT_DONE', 'QUOTATION_SHARED', 'AGREEMENT_SIGNED', 'ADVANCE_RECEIVED', 'REWARD_APPROVED'];
const selectCls = 'h-13 w-full border border-stone-deep bg-paper px-4 text-base text-charcoal focus:border-wine focus:outline-none';

function useForm(initial) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const run = async (fn) => {
    setBusy(true); setMsg(null); setErrors({});
    try { const r = await fn(); setMsg({ tone: 'success', text: r?.message || 'Saved' }); return r; } catch (x) {
      setErrors(x.fieldErrors?.() || {}); setMsg({ tone: 'error', text: x.message }); return null;
    } finally { setBusy(false); }
  };
  return { form, setForm, set, errors, setErrors, msg, setMsg, busy, run };
}

export default function Referrals() {
  const { data, error, loading, reload } = useApi('/account/referrals');
  if (loading && !data) return <><PageTitle title="Refer & Earn" /><Loading /></>;
  if (error) return <><PageTitle title="Refer & Earn" /><LoadError error={error} onRetry={reload} /></>;
  const { program, referrer } = data;
  if (!program?.enabled && !referrer) return <><PageTitle title="Refer & Earn" /><Empty title="Launching soon" body="Our Refer & Earn programme is not open yet. Check back shortly." href="/refer-and-earn" cta="See how it works" /></>;
  if (!referrer) return <><PageTitle title="Refer & Earn" /><Join program={program} onDone={reload} /></>;
  return <Dashboard data={data} reload={reload} />;
}

function Join({ program, onDone }) {
  const user = useAuth((s) => s.user);
  const f = useForm({ name: user?.name || '', city: '', type: 'CUSTOMER', acceptTerms: false });
  const [showTerms, setShowTerms] = useState(false);
  const top = Math.max(...program.slabs.flatMap((s) => s.rewards));
  const submit = async (e) => {
    e.preventDefault();
    if (f.form.name.trim().length < 2) return f.setErrors({ name: 'Enter your full name' });
    if (!f.form.acceptTerms) return f.setErrors({ acceptTerms: 'Please accept the terms' });
    if (await f.run(() => api('/account/referrals/join', { method: 'POST', body: { ...f.form, name: f.form.name.trim(), city: f.form.city.trim() || undefined } }))) onDone();
  };
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Panel title="Join Refer & Earn" className="xl:col-span-2">
        <p className="mb-5 text-graphite">Refer friends planning their interiors and earn up to <strong className="text-wine">{formatINR(top)}</strong> wallet credit per confirmed project — use it on your own next project with us. <Link href="/refer-and-earn" className="text-wine underline underline-offset-4">How it works</Link></p>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field id="j-name" label="Your full name" error={f.errors.name}><Input id="j-name" value={f.form.name} onChange={f.set('name')} error={f.errors.name} autoComplete="name" /></Field>
          <Field id="j-city" label="City" error={f.errors.city}><Input id="j-city" value={f.form.city} onChange={f.set('city')} autoComplete="address-level2" /></Field>
          <Field id="j-type" label="I am a" className="sm:col-span-2">
            <select id="j-type" className={selectCls} value={f.form.type} onChange={f.set('type')}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <div className="sm:col-span-2">
            <button type="button" className="flex items-center gap-1 text-sm text-wine" onClick={() => setShowTerms((v) => !v)} aria-expanded={showTerms}>Programme terms <ChevronDown className={clsx('size-4 transition-transform', showTerms && 'rotate-180')} /></button>
            {showTerms && <ol className="mt-2 max-h-64 list-decimal space-y-1.5 overflow-y-auto border border-stone p-4 pl-8 text-sm text-graphite">{program.terms.split('\n').filter(Boolean).map((t) => <li key={t}>{t}</li>)}</ol>}
            <label className="mt-3 flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 size-4 accent-wine" checked={f.form.acceptTerms} onChange={f.set('acceptTerms')} />I have read and accept the Refer & Earn terms.</label>
            {f.errors.acceptTerms && <p className="mt-1 text-caption text-error" role="alert">{f.errors.acceptTerms}</p>}
          </div>
          {f.msg?.tone === 'error' && <Notice tone="error" className="sm:col-span-2">{f.msg.text}</Notice>}
          <div className="sm:col-span-2"><Button type="submit" loading={f.busy}><UserPlus className="size-4" />Get my Referral ID</Button></div>
        </form>
      </Panel>
      <RewardsCard program={program} />
    </div>
  );
}

function RewardsCard({ program, next }) {
  return (
    <Panel title={next ? `Your next reward (referral #${next.nextLevel})` : 'Rewards'}>
      {next ? (
        <ul className="space-y-2 text-sm">{next.rewards.map((r) => <li key={r.key} className="flex justify-between gap-3 border-b border-stone pb-2 last:border-0"><span className="text-graphite">Project {r.label.charAt(0).toLowerCase() + r.label.slice(1)}</span><span className="tabular font-semibold text-wine">{formatINR(r.amount)}</span></li>)}</ul>
      ) : (
        <ul className="space-y-3 text-sm">{program.slabs.map((s) => <li key={s.key}><p className="text-graphite">Project {s.label.charAt(0).toLowerCase() + s.label.slice(1)}</p><p className="tabular font-semibold text-wine">{s.rewards.map((x) => formatINR(x)).join(' → ')}</p></li>)}</ul>
      )}
      <p className="mt-3 text-xs text-graphite">Based on final project value{program.valueBasis === 'EXCL_GST' ? ' excluding GST' : ''}. Added to your wallet as credit (not cash) after the project is confirmed and the advance is received.</p>
    </Panel>
  );
}

function Dashboard({ data, reload }) {
  const { referrer, referrals, stats, program, next, shareUrl, wallet } = data;
  const [copied, setCopied] = useState(null);
  const copy = async (text, key) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); } catch { /* clipboard blocked */ } };
  const wa = `https://wa.me/?text=${encodeURIComponent(`Planning your home interiors? I recommend INSIDER INDIA. Book a free consultation here: ${shareUrl}`)}`;
  const suspended = referrer.status !== 'ACTIVE';
  return (
    <>
      <PageTitle title="Refer & Earn" />
      {suspended && <Notice tone="error" className="mb-6">Your Refer & Earn account is suspended{referrer.suspendedReason ? `: ${referrer.suspendedReason}` : ''}. Please contact us.</Notice>}
      {!program.enabled && <Notice className="mb-6">New referrals are paused right now. Referrals already submitted continue as normal.</Notice>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[['Referrals', stats.total], ['In progress', stats.inProgress], ['Successful', stats.successful], ['Wallet credit', formatINR(wallet?.available || 0)]].map(([l, v]) => (
          <div key={l} className="soft-card p-4"><p className="text-xs text-graphite">{l}</p><p className="tabular mt-1 text-2xl font-semibold">{v}</p></div>
        ))}
      </div>
      {stats.pending > 0 && <p className="mt-3 flex items-center gap-2 text-sm text-wine"><Wallet className="size-4" aria-hidden="true" />{formatINR(stats.pending)} in rewards awaiting approval — added to your wallet once approved</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Your Referral ID">
            <div className="flex flex-wrap items-center gap-3">
              <span className="tabular rounded-lg bg-blush px-4 py-2 text-xl font-semibold tracking-wider text-wine">{referrer.code}</span>
              <Button size="sm" variant="secondary" onClick={() => copy(referrer.code, 'code')}>{copied === 'code' ? <Check className="size-4" /> : <Copy className="size-4" />}{copied === 'code' ? 'Copied' : 'Copy ID'}</Button>
            </div>
            <p className="mt-4 text-sm text-graphite">Share your link. When a friend books a consultation through it, the referral is added to your account automatically.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={shareUrl} aria-label="Your referral link" className="h-11 min-w-0 flex-1 border border-stone-deep bg-linen px-3 text-sm" onFocus={(e) => e.target.select()} />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="h-11" onClick={() => copy(shareUrl, 'link')}>{copied === 'link' ? <Check className="size-4" /> : <Copy className="size-4" />}{copied === 'link' ? 'Copied' : 'Copy'}</Button>
                <Button size="sm" className="h-11" href={wa} target="_blank" rel="noopener noreferrer"><Share2 className="size-4" />WhatsApp</Button>
              </div>
            </div>
          </Panel>
          {!suspended && program.enabled && <SubmitForm onDone={reload} />}
          <Panel title="My referrals">
            {referrals.length ? <ul className="divide-y divide-stone">{referrals.map((r) => <RefRow key={r.id} r={r} />)}</ul>
              : <p className="text-sm text-graphite">No referrals yet. Share your link or add a referral above.</p>}
          </Panel>
        </div>
        <div className="space-y-6">
          {next && <RewardsCard program={program} next={next} />}
          <WalletPanel wallet={wallet} />
          <Panel title="Account">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-graphite">Name</dt><dd>{referrer.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-graphite">Mobile</dt><dd className="tabular">{referrer.mobile}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-graphite">Joined</dt><dd>{formatDate(referrer.createdAt)}</dd></div>
            </dl>
            <Link href="/refer-and-earn" className="mt-3 inline-block text-sm text-wine underline underline-offset-4">Programme terms</Link>
          </Panel>
        </div>
      </div>
    </>
  );
}

function RefRow({ r }) {
  const [open, setOpen] = useState(false);
  const stop = ['REJECTED', 'WITHHELD'].includes(r.status);
  const reached = new Set(r.timeline.map((t) => t.status));
  const at = Object.fromEntries(r.timeline.map((t) => [t.status, t.at]));
  return (
    <li className="py-3">
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="min-w-0">
          <span className="block truncate font-medium">{r.customer.name} <span className="tabular text-xs font-normal text-graphite">{r.customer.mobile}</span></span>
          <span className="block text-xs text-graphite">{r.referralNumber} · {formatDate(r.createdAt)}{r.source === 'LINK' ? ' · via your link' : ''}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {r.rewardAmount != null && !stop && <span className="tabular text-sm font-semibold text-wine">{formatINR(r.rewardAmount)}</span>}
          <Badge map={BADGE} value={r.status} />
          <ChevronDown className={clsx('size-4 text-graphite transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="mt-3 rounded-lg bg-linen p-4 text-sm">
          {stop ? (
            <p className="text-graphite">{r.status === 'REJECTED' ? `Not eligible: ${r.rejectReason || 'did not meet the programme terms.'}` : `On hold: ${r.withheldReason || 'under review.'}`}</p>
          ) : (
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {FLOW.map((s) => (
                <li key={s} className={clsx('flex items-center gap-2', reached.has(s) ? 'text-charcoal' : 'text-mist')}>
                  <span className={clsx('size-2 shrink-0 rounded-full', reached.has(s) ? 'bg-wine' : 'bg-stone-deep')} aria-hidden="true" />
                  {BADGE[s][0]}{at[s] ? <span className="text-xs text-graphite">· {formatDate(at[s])}</span> : null}
                </li>
              ))}
            </ol>
          )}
          {r.rewardAmount != null && (
            <p className="mt-3 border-t border-stone pt-3 text-graphite">
              Referral #{r.level}{r.slabLabel ? ` · project ${r.slabLabel.charAt(0).toLowerCase() + r.slabLabel.slice(1)}` : ''} · reward <strong className="text-charcoal">{formatINR(r.rewardAmount)}</strong>
              {r.status === 'REWARD_APPROVED' ? ` · added to your wallet${r.approvedAt ? ` on ${formatDate(r.approvedAt)}` : ''}` : r.status === 'ADVANCE_RECEIVED' ? ' · awaiting approval' : ''}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function SubmitForm({ onDone }) {
  const blank = { name: '', mobile: '', city: '', propertyType: '', budget: '', notes: '', consent: false };
  const f = useForm(blank);
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.form.name.trim().length < 2) errs.name = 'Enter their name';
    if (!/^(\+?91)?[6-9]\d{9}$/.test(f.form.mobile.replace(/[\s-]/g, ''))) errs.mobile = 'Enter a valid 10-digit mobile number';
    if (!f.form.consent) errs.consent = 'Please confirm they agreed to be contacted';
    if (Object.keys(errs).length) return f.setErrors(errs);
    const body = Object.fromEntries(Object.entries(f.form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || undefined : v]));
    const r = await f.run(() => api('/account/referrals', { method: 'POST', body }));
    if (r) { f.setForm(blank); onDone(); }
  };
  return (
    <Panel title="Refer someone">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field id="r-name" label="Their name" error={f.errors.name}><Input id="r-name" value={f.form.name} onChange={f.set('name')} error={f.errors.name} /></Field>
        <Field id="r-mobile" label="Their mobile" error={f.errors.mobile}><Input id="r-mobile" inputMode="tel" value={f.form.mobile} onChange={f.set('mobile')} error={f.errors.mobile} /></Field>
        <Field id="r-city" label="City / location"><Input id="r-city" value={f.form.city} onChange={f.set('city')} /></Field>
        <Field id="r-prop" label="Property type">
          <select id="r-prop" className={selectCls} value={f.form.propertyType} onChange={f.set('propertyType')}><option value="">Select</option>{PROPERTY.map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
        <Field id="r-notes" label="Requirement (optional)" className="sm:col-span-2"><Textarea id="r-notes" rows={2} value={f.form.notes} onChange={f.set('notes')} placeholder="e.g. 3BHK full interiors, modular kitchen" /></Field>
        <div className="sm:col-span-2">
          <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 size-4 accent-wine" checked={f.form.consent} onChange={f.set('consent')} />They know about this referral and agreed to be contacted by INSIDER INDIA.</label>
          {f.errors.consent && <p className="mt-1 text-caption text-error" role="alert">{f.errors.consent}</p>}
        </div>
        {f.msg && <Notice tone={f.msg.tone} className="sm:col-span-2">{f.msg.text}</Notice>}
        <div className="sm:col-span-2"><Button type="submit" loading={f.busy}><Gift className="size-4" />Submit referral</Button></div>
      </form>
    </Panel>
  );
}

function WalletPanel({ wallet }) {
  const w = wallet || { available: 0, balance: 0, credited: 0, used: 0, entries: [] };
  return (
    <Panel title="My wallet">
      <p className="text-xs text-graphite">Available credit</p>
      <p className={clsx('tabular text-3xl font-semibold', w.balance < 0 ? 'text-wine' : 'text-charcoal')}>{formatINR(w.balance < 0 ? w.balance : w.available)}</p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-graphite">Total earned</dt><dd className="tabular">{formatINR(w.credited)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-graphite">Used on projects</dt><dd className="tabular">{formatINR(w.used)}</dd></div>
      </dl>
      <p className="mt-3 flex gap-2 rounded-lg bg-blush/60 p-3 text-xs text-charcoal"><Info className="mt-0.5 size-3.5 shrink-0 text-wine" aria-hidden="true" /><span>Credit is not paid in cash. Use it on your own next project with us — it is deducted from the project amount and you pay the rest. Apply it from your project’s Payments section{w.available > 0 ? <> (<Link href="/account/projects" className="text-wine underline">My projects</Link>)</> : null}.</span></p>
      {w.balance < 0 && <p className="mt-3 text-xs text-wine">A reward you already used was reversed (the referred project was cancelled or refunded). The amount will be adjusted in your project balance.</p>}
      {w.entries.length > 0 && (
        <ul className="mt-4 divide-y divide-stone border-t border-stone text-sm">
          {w.entries.slice(0, 8).map((e) => (
            <li key={`${e.type}-${e.ref}`} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0"><span className="block truncate">{e.label}</span><span className="block text-xs text-graphite">{e.ref}{e.at ? ` · ${formatDate(e.at)}` : ''}</span></span>
              <span className={clsx('tabular shrink-0 font-medium', e.amount > 0 ? 'text-success' : 'text-charcoal')}>{e.amount > 0 ? '+' : '−'}{formatINR(Math.abs(e.amount))}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
