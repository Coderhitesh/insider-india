'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ChoiceCard from '@/components/ui/ChoiceCard';
import Counter from '@/components/ui/Counter';
import Notice from '@/components/ui/Notice';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Swatch from '@/components/ui/Swatch';
import { Field, Input } from '@/components/ui/Field';
import { FunnelShell, StepFooter } from '@/features/funnel/FunnelShell';
import OtpVerify from '@/features/auth/OtpVerify';
import EstimateResult from './EstimateResult';
import { api } from '@/lib/api';
import { Icon } from '@/lib/icons';
import { normalizeMobile } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { useEstimateStore } from '@/store/estimate';
import { readAttribution } from '@/components/providers/Providers';

const TOTAL = 5;
const TITLES = {
  1: ['What type of property are you designing?'],
  2: ['How many of these rooms need interiors?', 'Start from your home size and adjust.'],
  3: ['Which finishing elements do you need?', 'Select all that apply. You can skip this step.'],
  4: ['Where should we send your estimate?', 'We will verify your number with a one-time code.'],
  5: ['Verify your mobile number'],
};

export default function EstimateFunnel() {
  const params = useSearchParams();
  const { status, user } = useAuth();
  const s = useEstimateStore();
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState(null);
  const [packages, setPackages] = useState([]);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const restored = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    Promise.all([api('/estimates/config'), api('/estimates/packages')])
      .then(([c, p]) => { setConfig(c.data); setPackages(p.data.packages); })
      .catch((err) => setError(err.message));
  }, []);
  useEffect(() => { const p = params.get('package'); if (p) useEstimateStore.getState().setPreferredPackage(p); }, [params]);

  // Restore a finished estimate after reload (requires the session).
  useEffect(() => {
    if (restored.current || !mounted || status !== 'authenticated' || !s.estimateId) return;
    restored.current = true;
    api(`/estimates/${s.estimateId}`).then((r) => setEstimate(r.data.estimate)).catch(() => s.setEstimate(null));
  }, [mounted, status, s]);

  useEffect(() => {
    if (!mounted) return;
    setError('');
    setFieldErrors({});
    requestAnimationFrame(() => document.getElementById('step-title')?.focus({ preventScroll: true }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [s.step, mounted]);

  const cleanInputs = () => {
    const i = s.inputs;
    const areaBased = i.propertyCategory === 'COMMERCIAL' || i.bhk === 'CUSTOM';
    return {
      propertyCategory: i.propertyCategory,
      ...(i.propertyCategory === 'RESIDENTIAL' ? { bhk: i.bhk } : {}),
      ...(areaBased ? { area: Number(i.area) } : {}),
      kitchens: i.kitchens, bedrooms: i.bedrooms, washrooms: i.washrooms, addons: i.addons,
    };
  };

  const calculate = async (leadId) => {
    setBusy(true);
    setError('');
    try {
      const pkg = packages.find((p) => p.slug === s.preferredPackage);
      const res = await api('/estimates', { method: 'POST', body: { leadId, ...cleanInputs(), ...(pkg ? { packageId: pkg.id } : {}) } });
      setEstimate(res.data.estimate);
      s.setEstimate(res.data.estimate.id);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (!mounted || (!config && !error)) return <div className="container-x flex max-w-3xl items-center gap-3 py-24 text-graphite" role="status"><Spinner className="size-5 text-wine" />Loading the calculator…</div>;
  if (!config) return <div className="container-x max-w-3xl py-20"><Notice tone="error" action={<Button size="sm" variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}>{error}</Notice></div>;
  if (estimate) return <EstimateResult estimate={estimate} config={config} onChange={setEstimate} onRestart={() => { s.reset(); setEstimate(null); }} />;

  const { step, inputs } = s;
  const next = () => s.setStep(step + 1);
  const back = step > 1 ? () => s.setStep(step - 1) : undefined;
  const errorNotice = error && <Notice tone="error" className="mt-6">{error}</Notice>;
  const counterKey = inputs.propertyCategory === 'COMMERCIAL' ? 'COMMERCIAL' : inputs.bhk;
  const setSize = (patch) => {
    const key = patch.propertyCategory === 'COMMERCIAL' ? 'COMMERCIAL' : patch.bhk;
    s.setInputs({ ...patch, ...(config.defaultCounters?.[key] || {}) });
  };

  let body;
  if (step === 1) {
    const needsArea = inputs.propertyCategory === 'COMMERCIAL' || inputs.bhk === 'CUSTOM';
    body = (
      <form noValidate onSubmit={(e) => {
        e.preventDefault();
        if (inputs.propertyCategory === 'RESIDENTIAL' && !inputs.bhk) return setError('Select your property size.');
        if (needsArea) {
          const a = Number(inputs.area);
          if (!a || a < config.areaLimits.min || a > config.areaLimits.max) return setFieldErrors({ area: `Enter an area between ${config.areaLimits.min.toLocaleString('en-IN')} and ${config.areaLimits.max.toLocaleString('en-IN')} sq ft` });
        }
        return next();
      }}>
        <fieldset>
          <legend className="sr-only">Property type</legend>
          <div className="grid grid-cols-2 gap-3">
            {config.propertyCategories.map((c) => (
              <ChoiceCard key={c.value} name="category" value={c.value} checked={inputs.propertyCategory === c.value} title={c.label}
                media={<Swatch tone={c.value === 'RESIDENTIAL' ? 'oak' : 'stone'} className="flex h-24 items-center justify-center rounded-[2px] text-paper"><Icon name={c.value === 'RESIDENTIAL' ? 'Home' : 'Store'} className="size-9" /></Swatch>}
                onChange={() => setSize({ propertyCategory: c.value, bhk: c.value === 'RESIDENTIAL' ? inputs.bhk : null })} />
            ))}
          </div>
        </fieldset>
        {inputs.propertyCategory === 'RESIDENTIAL' && (
          <fieldset className="mt-10">
            <legend className="mb-4 text-xl font-medium">Select property size</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {config.residentialSizes.map((o) => (
                <ChoiceCard key={o.value} name="size" value={o.value} compact checked={inputs.bhk === o.value} title={o.label} onChange={() => setSize({ propertyCategory: 'RESIDENTIAL', bhk: o.value })} />
              ))}
            </div>
          </fieldset>
        )}
        {needsArea && (
          <Field id="est-area" label={inputs.propertyCategory === 'COMMERCIAL' ? 'Carpet area (sq ft)' : 'Custom area (sq ft)'} error={fieldErrors.area} className="mt-8 max-w-xs">
            <Input id="est-area" inputMode="numeric" value={inputs.area} error={fieldErrors.area} onChange={(e) => s.setInputs({ area: e.target.value.replace(/\D/g, '').slice(0, 7) })} />
          </Field>
        )}
        {errorNotice}
        <StepFooter />
      </form>
    );
  } else if (step === 2) {
    const lim = config.counterLimits;
    body = (
      <form onSubmit={(e) => { e.preventDefault(); next(); }}>
        <div className="border-y border-stone">
          <Counter id="c-k" label="Modular kitchens" value={inputs.kitchens} min={lim.kitchens.min} max={lim.kitchens.max} onChange={(v) => s.setInputs({ kitchens: v })} />
          <Counter id="c-b" label="Bedrooms" value={inputs.bedrooms} min={lim.bedrooms.min} max={lim.bedrooms.max} onChange={(v) => s.setInputs({ bedrooms: v })} />
          <Counter id="c-w" label="Washrooms" value={inputs.washrooms} min={lim.washrooms.min} max={lim.washrooms.max} onChange={(v) => s.setInputs({ washrooms: v })} />
        </div>
        {counterKey && config.defaultCounters?.[counterKey] && <button type="button" className="mt-4 text-sm text-graphite underline underline-offset-4" onClick={() => s.setInputs(config.defaultCounters[counterKey])}>Reset to typical for this size</button>}
        <StepFooter onBack={back} />
      </form>
    );
  } else if (step === 3) {
    const sel = new Set(inputs.addons);
    body = (
      <form onSubmit={(e) => { e.preventDefault(); next(); }}>
        <fieldset>
          <legend className="sr-only">Finishing requirements</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {config.addons.map((a) => (
              <ChoiceCard key={a.key} type="checkbox" name="addons" value={a.key} compact checked={sel.has(a.key)} title={a.label}
                media={a.image ? <img src={a.image} alt="" className="h-20 w-full rounded-[2px] object-cover" /> : <Icon name={a.icon} className="size-7 text-wine" />}
                onChange={() => { const n = new Set(sel); n.has(a.key) ? n.delete(a.key) : n.add(a.key); s.setInputs({ addons: [...n] }); }} />
            ))}
          </div>
        </fieldset>
        <p className="mt-4 text-sm text-graphite" aria-live="polite">{sel.size ? `${sel.size} selected` : 'Nothing selected'}</p>
        <StepFooter onBack={back} continueLabel={sel.size ? 'Continue' : 'Skip'} />
      </form>
    );
  } else if (step === 4) {
    const signedIn = status === 'authenticated' && user?.role === 'CUSTOMER';
    body = (
      <form noValidate onSubmit={async (e) => {
        e.preventDefault();
        const errs = {};
        const name = (signedIn ? user.name : s.contact.name || '').trim();
        if (name.length < 2) errs.name = 'Enter your full name';
        if (!signedIn && !normalizeMobile(s.contact.mobile)) errs.mobile = 'Enter a valid 10-digit mobile number';
        setFieldErrors(errs);
        if (Object.keys(errs).length) return;
        setBusy(true);
        setError('');
        try {
          const res = await api('/leads', { method: 'POST', body: { flow: 'ESTIMATE', name, mobile: signedIn ? user.mobile : s.contact.mobile, estimateDraft: cleanInputs(), ...readAttribution() } });
          s.setLead(res.data.lead.id, res.data.leadToken);
          if (res.data.lead.verified) await calculate(res.data.lead.id);
          else next();
        } catch (err) { setError(err.message); setFieldErrors(err.fieldErrors?.() || {}); } finally { setBusy(false); }
      }} className="space-y-6">
        {signedIn ? (
          <p className="text-lg">Continuing as <strong>{user.name || 'you'}</strong> (+91 {user.mobile}).</p>
        ) : (
          <>
            <Field id="e-name" label="Full name" error={fieldErrors.name}>
              <Input id="e-name" autoComplete="name" value={s.contact.name} error={fieldErrors.name} onChange={(e) => s.setContact({ name: e.target.value })} />
            </Field>
            <Field id="e-mobile" label="Mobile number" error={fieldErrors.mobile}>
              <Input id="e-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} value={s.contact.mobile} error={fieldErrors.mobile} onChange={(e) => s.setContact({ mobile: e.target.value })} />
            </Field>
          </>
        )}
        {errorNotice}
        <StepFooter onBack={back} loading={busy} continueLabel="Get my estimate" />
      </form>
    );
  } else {
    body = busy ? (
      <div className="flex items-center gap-3 py-8 text-lg" role="status"><Spinner className="size-5 text-wine" />Calculating your estimate…</div>
    ) : (
      <>
        <OtpVerify mobile={normalizeMobile(s.contact.mobile)} leadId={s.leadId} leadToken={s.leadToken} name={s.contact.name} defaultLength={config.otpLength}
          onChangeNumber={() => s.setStep(4)}
          onVerified={async () => { s.setLead(s.leadId, null); await calculate(s.leadId); }} />
        {errorNotice}
        {error && <Button className="mt-4" variant="secondary" onClick={() => calculate(s.leadId)}>Try again</Button>}
      </>
    );
  }

  const [title, description] = TITLES[step];
  return <FunnelShell stepKey={`e${step}`} stepNumber={step} total={TOTAL} progressLabel="Budget calculator" title={title} description={description}>{body}</FunnelShell>;
}
