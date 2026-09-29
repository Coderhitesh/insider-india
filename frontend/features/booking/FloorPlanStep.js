'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { FileText, UploadCloud, X, RefreshCw, Ruler } from 'lucide-react';
import ChoiceCard from '@/components/ui/ChoiceCard';
import Notice from '@/components/ui/Notice';
import Button from '@/components/ui/Button';
import { StepFooter } from '@/features/funnel/FunnelShell';
import { api, uploadFile } from '@/lib/api';
import { formatINR } from '@/lib/format';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 15;
const MAX_FILES = 5;
const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function FloorPlanStep({ floorPlan, charge, onSave, onBack, saving }) {
  const [choice, setChoice] = useState(floorPlan?.hasFloorPlan === true ? 'yes' : floorPlan?.hasFloorPlan === false ? 'no' : null);
  const [files, setFiles] = useState(() => (floorPlan?.media || []).filter((m) => typeof m === 'object').map((m) => ({ key: m.id, id: m.id, name: m.originalName, type: m.mimeType, size: m.size, status: 'done', progress: 100 })));
  const [assist, setAssist] = useState(floorPlan?.measurementAssistance?.opted ?? null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const picker = useRef(null);
  const replaceKey = useRef(null);

  const patch = (key, p) => setFiles((fs) => fs.map((f) => (f.key === key ? { ...f, ...p } : f)));

  const add = async (list) => {
    setError('');
    const incoming = Array.from(list || []);
    const replacing = replaceKey.current;
    replaceKey.current = null;
    if (!replacing && files.length + incoming.length > MAX_FILES) { setError(`You can upload up to ${MAX_FILES} files.`); return; }
    for (const file of replacing ? incoming.slice(0, 1) : incoming) {
      if (!TYPES.includes(file.type)) { setError(`${file.name}: upload a PDF, JPG, PNG or WEBP file.`); continue; }
      if (file.size > MAX_MB * 1048576) { setError(`${file.name} is larger than ${MAX_MB} MB.`); continue; }
      const key = `${Date.now()}-${file.name}`;
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      const entry = { key, name: file.name, type: file.type, size: file.size, preview, status: 'uploading', progress: 0 };
      setFiles((fs) => (replacing ? fs.map((f) => (f.key === replacing ? entry : f)) : [...fs, entry]));
      const old = replacing ? files.find((f) => f.key === replacing) : null;
      try {
        const media = await uploadFile(file, 'FLOOR_PLAN', { onProgress: (p) => patch(key, { progress: p }) });
        patch(key, { id: media.id, status: 'done', progress: 100 });
        if (old?.id) api(`/uploads/${old.id}`, { method: 'DELETE' }).catch(() => {});
      } catch (err) {
        patch(key, { status: 'error', error: err.message });
      }
    }
  };

  const remove = async (f) => {
    setFiles((fs) => fs.filter((x) => x.key !== f.key));
    if (f.preview) URL.revokeObjectURL(f.preview);
    if (f.id) api(`/uploads/${f.id}`, { method: 'DELETE' }).catch(() => {});
  };

  const uploading = files.some((f) => f.status === 'uploading');
  const done = files.filter((f) => f.status === 'done' && f.id);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!choice) return setError('Choose whether you have a floor plan.');
    if (choice === 'yes') {
      if (!done.length) return setError('Upload your floor plan, or choose "No".');
      return onSave({ hasFloorPlan: true, mediaIds: done.map((f) => f.id) });
    }
    if (assist === null) return setError('Choose whether to add expert measurement assistance.');
    return onSave({ hasFloorPlan: false, measurementAssistance: assist });
  };

  return (
    <form onSubmit={submit} noValidate>
      <fieldset>
        <legend className="sr-only">Do you have a floor plan?</legend>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <ChoiceCard name="has-plan" value="yes" checked={choice === 'yes'} onChange={() => setChoice('yes')} title="Yes" compact />
          <ChoiceCard name="has-plan" value="no" checked={choice === 'no'} onChange={() => setChoice('no')} title="No" compact />
        </div>
      </fieldset>

      {choice === 'yes' && (
        <div className="mt-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
            className={clsx('flex flex-col items-center justify-center rounded-[3px] border-2 border-dashed px-6 py-10 text-center transition-colors', drag ? 'border-wine bg-wine-tint' : 'border-stone-deep bg-paper')}
          >
            <UploadCloud className="size-8 text-graphite" aria-hidden="true" />
            <p className="mt-3 font-medium">Drag and drop your floor plan here</p>
            <p className="mt-1 text-sm text-graphite">PDF, JPG, PNG or WEBP, up to {MAX_MB} MB each</p>
            <Button type="button" variant="secondary" size="sm" className="mt-5" onClick={() => picker.current?.click()} disabled={files.length >= MAX_FILES}>Choose files</Button>
            <input ref={picker} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
          </div>
          {files.length > 0 && (
            <ul className="mt-5 space-y-3" aria-live="polite">
              {files.map((f) => (
                <li key={f.key} className="flex items-center gap-4 rounded-[3px] border border-stone bg-paper p-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-[2px] bg-linen">
                    {f.preview ? <img src={f.preview} alt="" className="size-full object-cover" /> : <FileText className="m-auto mt-4 size-6 text-graphite" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.name}</p>
                    {f.status === 'uploading' && (
                      <div className="mt-2 h-1 w-full bg-stone" role="progressbar" aria-valuenow={f.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${f.name}`}>
                        <div className="h-full bg-wine transition-[width]" style={{ width: `${f.progress}%` }} />
                      </div>
                    )}
                    {f.status === 'done' && <p className="text-sm text-graphite">{f.size ? size(f.size) : ''} Uploaded</p>}
                    {f.status === 'error' && <p className="text-sm text-error">{f.error}</p>}
                  </div>
                  {f.status !== 'uploading' && (
                    <div className="flex gap-1">
                      <button type="button" className="p-2 text-graphite hover:text-charcoal" aria-label={`Replace ${f.name}`} onClick={() => { replaceKey.current = f.key; picker.current?.click(); }}><RefreshCw className="size-4" /></button>
                      <button type="button" className="p-2 text-graphite hover:text-error" aria-label={`Remove ${f.name}`} onClick={() => remove(f)}><X className="size-4" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {choice === 'no' && (
        <div className="mt-8 rounded-[3px] border border-stone bg-paper p-6">
          <div className="flex gap-4">
            <Ruler className="size-6 shrink-0 text-wine" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <h2 className="font-sans text-xl font-semibold tracking-normal">Don&apos;t have a floor plan?</h2>
              <p className="mt-2 text-graphite">Our expert can prepare measurements and help create the required site plan during the site visit.</p>
              <p className="mt-2">This is an additional service charge of <strong>{formatINR(charge)}</strong>, added to your quotation.</p>
            </div>
          </div>
          <fieldset className="mt-6">
            <legend className="sr-only">Expert measurement assistance</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard name="assist" value="yes" checked={assist === true} onChange={() => setAssist(true)} compact title={`Add expert measurement assistance — ${formatINR(charge)}`} description="Additional charge" />
              <ChoiceCard name="assist" value="no" checked={assist === false} onChange={() => setAssist(false)} compact title="Continue without it" description="You can share a floor plan later" />
            </div>
          </fieldset>
        </div>
      )}

      {error && <Notice tone="error" className="mt-6">{error}</Notice>}
      <StepFooter onBack={onBack} loading={saving} disabled={uploading} continueLabel="Review request" />
    </form>
  );
}
