'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { MapPin, Search } from 'lucide-react';
import { Field, Input, Textarea } from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import Spinner from '@/components/ui/Spinner';
import { StepFooter } from '@/features/funnel/FunnelShell';
import { api } from '@/lib/api';

const newToken = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

export default function LocationStep({ initial, autocomplete, onSubmit, onBack, saving, fieldErrors = {} }) {
  const [manual, setManual] = useState(!autocomplete);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [notice, setNotice] = useState('');
  const [addr, setAddr] = useState({
    formattedAddress: initial?.formattedAddress || '', placeId: initial?.placeId || '', lat: initial?.lat, lng: initial?.lng,
    city: initial?.city || '', state: initial?.state || '', country: initial?.country || 'India', pincode: initial?.pincode || '',
  });
  const [errors, setErrors] = useState({});
  const session = useRef(newToken());
  const ctrl = useRef(null);

  useEffect(() => {
    if (manual || query.trim().length < 3 || query === addr.formattedAddress) { setSuggestions([]); return undefined; }
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      setSearching(true);
      try {
        const res = await api(`/geo/autocomplete?${new URLSearchParams({ q: query.trim(), sessionToken: session.current })}`, { signal: ctrl.current.signal });
        setSuggestions(res.data.suggestions);
        setOpen(true);
        setActive(-1);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setNotice(err.message);
        setManual(true);
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, manual, addr.formattedAddress]);

  const choose = async (s) => {
    setOpen(false);
    setQuery(s.text);
    setResolving(true);
    try {
      const res = await api(`/geo/place/${encodeURIComponent(s.placeId)}?sessionToken=${session.current}`);
      const p = res.data.place;
      setAddr((a) => ({ ...a, ...p, pincode: p.pincode || a.pincode, formattedAddress: p.formattedAddress || s.text }));
      setQuery(p.formattedAddress || s.text);
    } catch (err) {
      setAddr((a) => ({ ...a, formattedAddress: s.text, placeId: s.placeId }));
      setNotice(`${err.message} You can correct the details below.`);
    } finally {
      session.current = newToken();
      setResolving(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if ((addr.formattedAddress || '').trim().length < 5) errs.formattedAddress = 'Enter your property address';
    if (!/^[1-9]\d{5}$/.test(addr.pincode || '')) errs.pincode = 'Enter a valid 6-digit pincode';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit({
      formattedAddress: addr.formattedAddress.trim(), pincode: addr.pincode,
      ...(addr.placeId ? { placeId: addr.placeId, sessionToken: session.current } : {}),
      ...(typeof addr.lat === 'number' ? { lat: addr.lat, lng: addr.lng } : {}),
      ...(addr.city ? { city: addr.city } : {}), ...(addr.state ? { state: addr.state } : {}), country: addr.country || 'India',
    });
  };

  const err = { ...fieldErrors, ...errors };
  const listId = 'address-suggestions';

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {notice && <Notice>{notice}</Notice>}
      {!manual ? (
        <Field id="addr-search" label="Search for your building, society or street" error={err.formattedAddress}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-graphite" aria-hidden="true" />
            <input
              id="addr-search" role="combobox" aria-expanded={open && suggestions.length > 0} aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `sugg-${active}` : undefined} autoComplete="off" value={query}
              onChange={(e) => { setQuery(e.target.value); setAddr((a) => ({ ...a, formattedAddress: '', placeId: '' })); }}
              onKeyDown={(e) => {
                if (!open || !suggestions.length) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(suggestions[active]); }
                if (e.key === 'Escape') setOpen(false);
              }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className={clsx('h-13 w-full rounded-[3px] border bg-paper pl-12 pr-10 text-base focus:border-charcoal focus:outline-none', err.formattedAddress ? 'border-error' : 'border-stone-deep')}
              placeholder="e.g. Tower B, Sector 150, Noida"
            />
            {(searching || resolving) && <Spinner className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-graphite" />}
            {open && suggestions.length > 0 && (
              <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[3px] border border-stone-deep bg-paper py-1 shadow-lg">
                {suggestions.map((s, i) => (
                  <li key={s.placeId} id={`sugg-${i}`} role="option" aria-selected={i === active}
                    onMouseDown={(e) => { e.preventDefault(); choose(s); }}
                    className={clsx('flex cursor-pointer gap-3 px-4 py-3', i === active ? 'bg-linen' : 'hover:bg-linen')}>
                    <MapPin className="mt-0.5 size-4 shrink-0 text-graphite" aria-hidden="true" />
                    <span><span className="block font-medium">{s.mainText || s.text}</span>{s.secondaryText && <span className="block text-sm text-graphite">{s.secondaryText}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={() => setManual(true)} className="mt-2 self-start text-sm text-wine underline underline-offset-4">Enter address manually</button>
        </Field>
      ) : (
        <Field id="addr-manual" label="Property address" error={err.formattedAddress}>
          <Textarea id="addr-manual" rows={3} autoComplete="street-address" value={addr.formattedAddress} error={err.formattedAddress}
            onChange={(e) => setAddr({ ...addr, formattedAddress: e.target.value, placeId: '' })} placeholder="Flat / house no., building, street, locality" />
          {autocomplete && <button type="button" onClick={() => { setManual(false); setNotice(''); }} className="mt-2 self-start text-sm text-wine underline underline-offset-4">Search for my address instead</button>}
        </Field>
      )}

      {addr.formattedAddress && !manual && (
        <p className="flex gap-2 rounded-[3px] bg-paper p-4 text-sm"><MapPin className="size-4 shrink-0 text-wine" aria-hidden="true" />{addr.formattedAddress}</p>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="addr-pin" label="Pincode" error={err.pincode} hint={addr.placeId && addr.pincode ? 'Filled from your address — correct it if needed' : undefined}>
          <Input id="addr-pin" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={addr.pincode} error={err.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <Field id="addr-city" label="City">
          <Input id="addr-city" autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
        </Field>
        <Field id="addr-state" label="State">
          <Input id="addr-state" autoComplete="address-level1" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
        </Field>
      </div>
      <StepFooter onBack={onBack} loading={saving} disabled={resolving} />
    </form>
  );
}
