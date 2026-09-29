'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Plus, Trash2, ArrowUp, ArrowDown, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import { uploadFile } from '@/lib/api';

export const getIn = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
export function setIn(obj, path, value) {
  const keys = path.split('.');
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  let o = out;
  keys.slice(0, -1).forEach((k) => { o[k] = Array.isArray(o[k]) ? [...o[k]] : { ...(o[k] || {}) }; o = o[k]; });
  o[keys[keys.length - 1]] = value;
  return out;
}

const inputCls = (err) => clsx('w-full rounded-[3px] border bg-paper px-3 py-2 text-sm focus:border-charcoal focus:outline-none', err ? 'border-error' : 'border-stone-deep');

function ImageField({ value, onChange, purpose = 'CONTENT_IMAGE' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState('');
  return (
    <div className="flex items-center gap-3">
      {value ? <img src={value} alt="" className="size-14 rounded-[2px] object-cover" /> : <div className="size-14 rounded-[2px] bg-stone/60" />}
      <div className="flex-1 space-y-1">
        <input className={inputCls()} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="ghost" loading={busy > 0} onClick={() => ref.current?.click()}><Upload className="size-4" />{busy ? `${busy}%` : 'Upload'}</Button>
          {err && <span className="text-xs text-error">{err}</span>}
        </div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          setErr(''); setBusy(1);
          try { const m = await uploadFile(f, purpose, { onProgress: (p) => setBusy(Math.max(1, p)) }); onChange(m.url, m); } catch (x) { setErr(x.message); } finally { setBusy(0); }
        }} />
      </div>
    </div>
  );
}

/**
 * Renders fields from a config. Field types:
 * text, email, password, number, textarea, switch, select(options), multiselect(options), tags, image, date, datetime, rows(fields), json
 */
export function Fields({ fields, value, onChange, errors = {}, prefix = '' }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.filter((f) => !f.hideIf?.(value)).map((f) => {
        const path = prefix ? `${prefix}.${f.name}` : f.name;
        const v = getIn(value, f.name);
        const err = errors[path];
        const set = (nv) => onChange(setIn(value, f.name, nv));
        const id = `f-${path.replace(/\./g, '-')}`;
        const wide = f.wide || ['textarea', 'rows', 'tags', 'image', 'multiselect', 'json'].includes(f.type);
        let control;
        switch (f.type) {
          case 'textarea': control = <textarea id={id} rows={f.rows || 4} className={inputCls(err)} value={v ?? ''} onChange={(e) => set(e.target.value)} />; break;
          case 'number': control = <input id={id} type="number" step={f.step || 'any'} min={f.min} max={f.max} className={inputCls(err)} value={v ?? ''} onChange={(e) => set(e.target.value === '' ? (f.nullable ? null : '') : Number(e.target.value))} />; break;
          case 'switch': control = (
            <label className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} className="size-4 accent-[var(--color-wine)]" />{f.help || 'Enabled'}</label>
          ); break;
          case 'select': control = (
            <select id={id} className={inputCls(err)} value={v ?? ''} onChange={(e) => set(e.target.value === '' ? (f.nullable ? null : '') : e.target.value)}>
              {f.placeholder !== false && <option value="">{f.placeholder || 'Select…'}</option>}
              {(f.options || []).map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
            </select>
          ); break;
          case 'multiselect': control = (
            <div className="grid max-h-64 gap-1 overflow-y-auto rounded-[3px] border border-stone p-2 sm:grid-cols-2">
              {(f.options || []).map((o) => {
                const ov = o.value ?? o; const on = (v || []).includes(ov);
                return (
                  <label key={ov} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5 accent-[var(--color-wine)]" checked={on} onChange={() => set(on ? v.filter((x) => x !== ov) : [...(v || []), ov])} />
                    <span>{o.label ?? o}{o.hint && <span className="block text-xs text-graphite">{o.hint}</span>}</span>
                  </label>
                );
              })}
            </div>
          ); break;
          case 'tags': control = <input id={id} className={inputCls(err)} value={(v || []).join(', ')} placeholder="Comma separated" onChange={(e) => set(e.target.value.split(',').map((s) => s.trimStart()).filter((s, i, a) => s || i === a.length - 1))} onBlur={(e) => set(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />; break;
          case 'image': control = <ImageField value={v} purpose={f.purpose} onChange={(url, media) => { let nv = setIn(value, f.name, url); if (f.idField && media) nv = setIn(nv, f.idField, media.id); onChange(nv); }} />; break;
          case 'date': control = <input id={id} type="date" className={inputCls(err)} value={v ? String(v).slice(0, 10) : ''} onChange={(e) => set(e.target.value || null)} />; break;
          case 'datetime': control = <input id={id} type="datetime-local" className={inputCls(err)} value={v ? toLocal(v) : ''} onChange={(e) => set(e.target.value ? new Date(e.target.value).toISOString() : null)} />; break;
          case 'rows': control = <RowsField field={f} value={v || []} onChange={set} errors={errors} path={path} />; break;
          case 'json': control = <JsonField id={id} value={v} onChange={set} />; break;
          default: control = <input id={id} type={f.type || 'text'} autoComplete={f.autoComplete || 'off'} className={inputCls(err)} value={v ?? ''} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />;
        }
        return (
          <div key={f.name} className={clsx('flex flex-col gap-1', wide && 'sm:col-span-2')}>
            {f.type !== 'switch' || f.label ? <label htmlFor={id} className="text-xs font-medium text-graphite">{f.label}</label> : null}
            {control}
            {err ? <p className="text-xs text-error" role="alert">{err}</p> : f.hint ? <p className="text-xs text-graphite">{f.hint}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

const toLocal = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function RowsField({ field, value, onChange, errors, path }) {
  const move = (i, d) => { const n = [...value]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={row._id || row.value || i} className="rounded-[3px] border border-stone bg-linen/40 p-3">
          <Fields fields={field.fields} value={row} onChange={(nv) => onChange(value.map((r, j) => (j === i ? nv : r)))} errors={errors} prefix={`${path}.${i}`} />
          <div className="mt-2 flex justify-end gap-1">
            {field.sortable !== false && <><Button type="button" size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="size-3.5" /></Button>
            <Button type="button" size="sm" variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="size-3.5" /></Button></>}
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-3.5" /></Button>
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...value, { ...(field.newRow || {}) }])}><Plus className="size-4" />{field.addLabel || 'Add row'}</Button>
    </div>
  );
}

function JsonField({ id, value, onChange }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [err, setErr] = useState('');
  return (
    <>
      <textarea id={id} rows={10} className={clsx(inputCls(err), 'font-mono text-xs')} value={text} onChange={(e) => {
        setText(e.target.value);
        try { onChange(JSON.parse(e.target.value)); setErr(''); } catch { setErr('Invalid JSON'); }
      }} />
      {err && <p className="text-xs text-error">{err}</p>}
    </>
  );
}
