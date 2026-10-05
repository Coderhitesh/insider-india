'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChoiceCard from '@/components/ui/ChoiceCard';
import Notice from '@/components/ui/Notice';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Swatch from '@/components/ui/Swatch';
import { Field, Input } from '@/components/ui/Field';
import { FunnelShell, StepFooter } from '@/features/funnel/FunnelShell';
import OtpVerify from '@/features/auth/OtpVerify';
import LocationStep from './LocationStep';
import FloorPlanStep from './FloorPlanStep';
import ThankYou from './ThankYou';
import { api } from '@/lib/api';
import { Icon } from '@/lib/icons';
import { normalizeMobile } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { useBookingStore } from '@/store/booking';
import { readAttribution } from '@/components/providers/Providers';

const ORDER = ['BASIC_INFO', 'REQUIREMENT', 'BUDGET', 'POSSESSION', 'OTP', 'LOCATION', 'PROPERTY_TYPE', 'BHK', 'PROJECT_TYPE', 'SERVICES', 'FLOOR_PLAN', 'REVIEW'];
const COPY = {
  BASIC_INFO: ["Let's start with you", 'We save your answers as you go, so you can pick up where you left off.'],
  REQUIREMENT: ['What are you looking for?'],
  BUDGET: ['What is your approximate interior budget?', 'A rough range is fine. It helps us suggest the right package.'],
  POSSESSION: ['When will you get possession of your property?'],
  OTP: ['Verify your mobile number', 'This keeps your request secure and lets you track it in your dashboard.'],
  LOCATION: ['Where is your property located?'],
  PROPERTY_TYPE: ['What kind of home do you own?'],
  BHK: ['What is the configuration of your home?'],
  PROJECT_TYPE: ['What type of project are you looking for?'],
  SERVICES: ['What are you looking for?', 'Select everything you would like us to look at.'],
  FLOOR_PLAN: ['Do you have a floor plan to share?'],
  REVIEW: ['Review your request', 'Check your details before you submit. You can edit any answer.'],
};
const PROPERTY_ICON = { APARTMENT: ['Building2', 'stone'], VILLA: ['Castle', 'oak'], INDEPENDENT_HOUSE: ['Home', 'terracotta'] };
const label = (opts, list, v) => opts?.[list]?.find((o) => o.value === v)?.label || v || '';

function initialDraft(step, lead, user) {
  if (!lead) return step === 'BASIC_INFO' ? { name: user?.name || '', mobile: user?.mobile || '', city: '' } : {};
  switch (step) {
    case 'BASIC_INFO': return { name: lead.name || '', mobile: lead.mobile || '', city: lead.city || '' };
    case 'REQUIREMENT': return { value: lead.requirementType };
    case 'BUDGET': return { value: lead.budgetRange };
    case 'POSSESSION': return { value: lead.possession };
    case 'PROPERTY_TYPE': return { value: lead.property?.propertyType };
    case 'BHK': return { value: lead.property?.bhk };
    case 'PROJECT_TYPE': return { value: lead.projectType };
    case 'SERVICES': return { values: (lead.services || []).map((s) => (typeof s === 'object' ? s.id : s)) };
    default: return {};
  }
}

export default function BookingFunnel() {
  const router = useRouter();
  const { status, user } = useAuth();
  const { leadId, leadToken, setLead, clearToken, reset } = useBookingStore();
  const [options, setOptions] = useState(null);
  const [services, setServices] = useState([]);
  const [lead, setLeadData] = useState(null);
  const [step, setStep] = useState(null);
  const [draft, setDraft] = useState({});
  const [booking, setBooking] = useState(null);
  const [budget, setBudget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const init = useRef(false);

  useEffect(() => {
    Promise.all([api('/catalog/funnel-options'), api('/catalog/services?context=booking')])
      .then(([o, s]) => { setOptions(o.data); setServices(s.data.services); })
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    if (init.current || status === 'idle' || status === 'loading') return;
    init.current = true;
    (async () => {
      let l = null;
      if (leadId) {
        try {
          l = (await api(`/leads/${leadId}`, { leadToken })).data.lead;
        } catch (err) {
          if (err.code === 'LEAD_AUTH_REQUIRED' && status !== 'authenticated') { router.replace('/login?next=/book-consultation'); return; }
          reset();
        }
      }
      if (!l && status === 'authenticated') {
        try { l = (await api('/leads/resume')).data.lead; if (l) setLead(l.id, null); } catch { /* none */ }
      }
      if (l && l.nextStep === 'SUBMITTED') { reset(); l = null; }
      setLeadData(l);
      setStep(l ? l.nextStep : 'BASIC_INFO');
    })();
  }, [status, leadId, leadToken, reset, setLead, router]);

  // Reset local step state whenever the step changes; move focus to the new question.
  useEffect(() => {
    if (!step) return;
    setDraft(initialDraft(step, lead, user));
    setError('');
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => document.getElementById('step-title')?.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const verified = lead?.verified;
  const move = useCallback((from, dir, l = lead) => {
    let i = ORDER.indexOf(from) + dir;
    if (ORDER[i] === 'OTP' && l?.verified) i += dir;
    setStep(ORDER[Math.max(0, Math.min(i, ORDER.length - 1))]);
  }, [lead]);
  const back = step && ORDER.indexOf(step) > 0 ? () => move(step, -1) : undefined;

  const handleError = (err) => {
    setError(err.message);
    setFieldErrors(err.fieldErrors?.() || {});
    if (err.code === 'LEAD_TOKEN_INVALID' || err.code === 'LEAD_NOT_FOUND') { reset(); setLeadData(null); setStep('BASIC_INFO'); }
    if (err.code === 'OTP_REQUIRED') setStep('OTP');
    if (err.code === 'LEAD_CLOSED') { reset(); router.push('/account/dashboard'); }
  };

  const save = async (stepKey, data) => {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const res = await api(`/leads/${lead.id}`, { method: 'PATCH', body: { step: stepKey, data }, leadToken });
      setLeadData(res.data.lead);
      move(stepKey, 1, res.data.lead);
    } catch (err) { handleError(err); } finally { setSaving(false); }
  };

  const submitBasic = async (e) => {
    e.preventDefault();
    const errs = {};
    if ((draft.name || '').trim().length < 2) errs.name = 'Enter your full name';
    if (!user && !normalizeMobile(draft.mobile)) errs.mobile = 'Enter a valid 10-digit mobile number';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    if (lead) return save('BASIC_INFO', { name: draft.name.trim(), ...(verified ? {} : { mobile: draft.mobile }), city: draft.city || undefined });
    setSaving(true);
    try {
      const res = await api('/leads', { method: 'POST', body: { flow: 'BOOKING', name: draft.name.trim(), mobile: user?.mobile || draft.mobile, city: draft.city || undefined, ...readAttribution() } });
      setLead(res.data.lead.id, res.data.leadToken);
      setLeadData(res.data.lead);
      move('BASIC_INFO', 1, res.data.lead);
    } catch (err) { handleError(err); } finally { setSaving(false); }
    return undefined;
  };

  const submitChoice = (stepKey, field) => (e) => {
    e.preventDefault();
    if (!draft.value) { setError('Choose one option to continue.'); return; }
    save(stepKey, { [field]: draft.value });
  };

  const submitBooking = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api('/bookings', { method: 'POST', body: { leadId: lead.id } });
      setBooking(res.data.booking);
      setBudget(res.data.budget || null);
      reset();
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err.code === 'INCOMPLETE_REQUEST' && err.details?.nextStep) setStep(err.details.nextStep);
      handleError(err);
    } finally { setSaving(false); }
  };

  if (booking) return <ThankYou booking={booking} budget={budget} />;
  if (loadError) return <div className="container-x max-w-3xl py-20"><Notice tone="error" action={<Button size="sm" variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}>{loadError}</Notice></div>;
  if (!step || !options) return <div className="container-x flex max-w-3xl items-center gap-3 py-24 text-graphite" role="status"><Spinner className="size-5 text-wine" />Loading your request…</div>;

  const idx = ORDER.indexOf(step);
  const [title, description] = COPY[step];
  const radioGrid = (list, { cols = 'sm:grid-cols-2', compact = true, media } = {}) => (
    <fieldset>
      <legend className="sr-only">{title}</legend>
      <div className={`grid gap-3 ${cols}`}>
        {options[list].map((o) => (
          <ChoiceCard key={o.value} name={list} value={o.value} checked={draft.value === o.value} onChange={() => setDraft({ value: o.value })}
            title={o.label} description={o.description} compact={compact} media={media?.(o)} />
        ))}
      </div>
    </fieldset>
  );
  const errorNotice = error && <Notice tone="error" className="mt-6">{error}</Notice>;

  let body;
  switch (step) {
    case 'BASIC_INFO':
      body = (
        <form onSubmit={submitBasic} noValidate className="space-y-6">
          <Field id="b-name" label="Full name" error={fieldErrors.name}>
            <Input id="b-name" autoComplete="name" value={draft.name || ''} error={fieldErrors.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field id="b-mobile" label="Mobile number" error={fieldErrors.mobile} hint={user || verified ? 'Verified number' : 'We will send a verification code to this number.'}>
            <Input id="b-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} readOnly={Boolean(user || verified)}
              value={user?.mobile || draft.mobile || ''} error={fieldErrors.mobile} onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} />
          </Field>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">City</legend>
            <div className="flex flex-wrap gap-2">
              {options.cities.map((c) => (
                <label key={c.value} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-wine ${draft.city === c.value ? 'border-wine bg-wine text-paper' : 'border-stone-deep bg-paper hover:border-wine'}`}>
                  <input type="radio" name="city" value={c.value} checked={draft.city === c.value} onChange={() => setDraft({ ...draft, city: c.value })} className="sr-only" />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          {errorNotice}
          <StepFooter loading={saving} />
        </form>
      );
      break;
    case 'REQUIREMENT':
      body = <form onSubmit={submitChoice('REQUIREMENT', 'requirementType')}>{radioGrid('requirementTypes', { cols: 'sm:grid-cols-3', compact: false, media: (o) => <Swatch tone={{ FULL_HOME: 'oak', KITCHEN_WARDROBE_STORAGE: 'charcoal', CIVIL_FULL_HOME: 'terracotta' }[o.value] || 'sand'} className="h-12 rounded-none sm:h-20" /> })}{errorNotice}<StepFooter onBack={back} loading={saving} /></form>;
      break;
    case 'BUDGET':
      body = <form onSubmit={submitChoice('BUDGET', 'budgetRange')}>{radioGrid('budgetRanges', { cols: 'grid-cols-2 sm:grid-cols-3' })}{errorNotice}<StepFooter onBack={back} loading={saving} /></form>;
      break;
    case 'POSSESSION':
      body = <form onSubmit={submitChoice('POSSESSION', 'possession')}>{radioGrid('possessionOptions', { cols: 'sm:grid-cols-2' })}{errorNotice}<StepFooter onBack={back} loading={saving} /></form>;
      break;
    case 'OTP':
      body = (
        <>
          <OtpVerify mobile={lead.mobile} leadId={lead.id} leadToken={leadToken} name={lead.name} defaultLength={options.otp?.length || 4}
            onChangeNumber={() => setStep('BASIC_INFO')}
            onVerified={(data) => { clearToken(); setLeadData(data.lead); move('OTP', 1, data.lead); }} />
          <div className="mt-8"><Button variant="ghost" onClick={back}>Back</Button></div>
        </>
      );
      break;
    case 'LOCATION':
      body = <LocationStep initial={lead.property?.address} autocomplete={options.addressAutocomplete} onSubmit={(d) => save('LOCATION', d)} onBack={back} saving={saving} fieldErrors={fieldErrors} />;
      break;
    case 'PROPERTY_TYPE':
      body = (
        <form onSubmit={submitChoice('PROPERTY_TYPE', 'propertyType')}>
          {radioGrid('propertyTypes', {
            cols: 'sm:grid-cols-3', compact: false,
            media: (o) => (o.image
              ? <img src={o.image} alt="" className="h-24 w-full rounded-none object-cover sm:h-36" />
              : <Swatch tone={PROPERTY_ICON[o.value]?.[1] || 'sand'} className="flex h-24 items-center justify-center rounded-none text-paper sm:h-36"><Icon name={PROPERTY_ICON[o.value]?.[0] || 'Home'} className="size-10" /></Swatch>),
          })}
          {errorNotice}<StepFooter onBack={back} loading={saving} />
        </form>
      );
      break;
    case 'BHK':
      body = <form onSubmit={submitChoice('BHK', 'bhk')}>{radioGrid('bhkOptions', { cols: 'grid-cols-2 sm:grid-cols-3' })}{errorNotice}<StepFooter onBack={back} loading={saving} /></form>;
      break;
    case 'PROJECT_TYPE':
      body = <form onSubmit={submitChoice('PROJECT_TYPE', 'projectType')}>{radioGrid('projectTypes', { cols: 'sm:grid-cols-3', compact: false })}{errorNotice}<StepFooter onBack={back} loading={saving} /></form>;
      break;
    case 'SERVICES': {
      const selected = new Set(draft.values || []);
      body = (
        <form onSubmit={(e) => { e.preventDefault(); if (!selected.size) { setError('Select at least one option.'); return; } save('SERVICES', { services: [...selected] }); }}>
          <fieldset>
            <legend className="sr-only">{title}</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {services.map((s) => (
                <ChoiceCard key={s.id} type="checkbox" name="services" value={s.id} checked={selected.has(s.id)} compact title={s.title}
                  media={<Icon name={s.icon} className="size-7 text-wine" />}
                  onChange={() => { const n = new Set(selected); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setDraft({ values: [...n] }); }} />
              ))}
            </div>
          </fieldset>
          <p className="mt-4 text-sm text-graphite" aria-live="polite">{selected.size} selected</p>
          {errorNotice}<StepFooter onBack={back} loading={saving} />
        </form>
      );
      break;
    }
    case 'FLOOR_PLAN':
      body = <><FloorPlanStep floorPlan={lead.floorPlan} charge={options.floorPlanAssistanceCharge} onSave={(d) => save('FLOOR_PLAN', d)} onBack={back} saving={saving} />{errorNotice}</>;
      break;
    case 'REVIEW': {
      const fp = lead.floorPlan || {};
      const rows = [
        ['BASIC_INFO', 'You', `${lead.name}, ${lead.maskedMobile}${lead.city ? `, ${lead.city}` : ''}`],
        ['REQUIREMENT', 'Requirement', label(options, 'requirementTypes', lead.requirementType)],
        ['BUDGET', 'Budget', label(options, 'budgetRanges', lead.budgetRange)],
        ['POSSESSION', 'Possession', label(options, 'possessionOptions', lead.possession)],
        ['LOCATION', 'Location', [lead.property?.address?.formattedAddress, lead.property?.address?.pincode].filter(Boolean).join(', ')],
        ['PROPERTY_TYPE', 'Home type', label(options, 'propertyTypes', lead.property?.propertyType)],
        ['BHK', 'Configuration', label(options, 'bhkOptions', lead.property?.bhk)],
        ['PROJECT_TYPE', 'Project type', label(options, 'projectTypes', lead.projectType)],
        ['SERVICES', 'Services', (lead.services || []).map((s) => s.title || services.find((x) => x.id === s)?.title).filter(Boolean).join(', ')],
        ['FLOOR_PLAN', 'Floor plan', fp.hasFloorPlan ? `${fp.media.length} file(s) uploaded` : fp.measurementAssistance?.opted ? `Expert measurement assistance (additional ₹${Number(fp.measurementAssistance.charge).toLocaleString('en-IN')})` : 'Not provided'],
      ];
      body = (
        <form onSubmit={(e) => { e.preventDefault(); submitBooking(); }}>
          <dl className="divide-y divide-stone border-y border-stone">
            {rows.map(([key, k, v]) => (
              <div key={key} className="flex items-start gap-4 py-4">
                <dt className="w-32 shrink-0 text-graphite sm:w-40">{k}</dt>
                <dd className="flex-1">{v || <span className="text-error">Missing</span>}</dd>
                <button type="button" onClick={() => setStep(key)} className="text-sm text-wine underline underline-offset-4" aria-label={`Edit ${k.toLowerCase()}`}>Edit</button>
              </div>
            ))}
          </dl>
          {errorNotice}
          <StepFooter onBack={back} loading={saving} continueLabel="Submit request" />
        </form>
      );
      break;
    }
    default: body = null;
  }

  return (
    <FunnelShell stepKey={step} stepNumber={Math.min(idx + 1, ORDER.length - 1)} total={ORDER.length - 1} progressLabel={step === 'REVIEW' ? 'Almost done' : 'Your consultation request'} title={title} description={description}>
      {body}
    </FunnelShell>
  );
}
