'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import { uploadFile } from '@/lib/api';

// Multi-file uploader. value: [{ id, name, type, url? }]
export default function MediaUploader({ purpose, accept, value, onChange, label = 'Upload files', max = 20 }) {
  const ref = useRef(null);
  const [progress, setProgress] = useState({});
  const [err, setErr] = useState('');
  const add = async (files) => {
    setErr('');
    for (const f of Array.from(files).slice(0, max - value.length)) {
      const key = `${f.name}-${f.size}`;
      setProgress((p) => ({ ...p, [key]: 0 }));
      try {
        const m = await uploadFile(f, purpose, { onProgress: (pc) => setProgress((p) => ({ ...p, [key]: pc })) });
        onChange((v) => [...v, { id: m.id, name: m.originalName, type: m.mimeType, url: m.url }]);
      } catch (x) { setErr(`${f.name}: ${x.message}`); }
      setProgress((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((m) => (
          <div key={m.id} className="relative flex size-20 items-center justify-center overflow-hidden rounded-[2px] border border-stone bg-linen text-xs">
            {m.type?.startsWith('image/') && m.url ? <img src={m.url} alt={m.name} className="size-full object-cover" /> : <span className="flex flex-col items-center gap-1 p-1 text-center"><FileText className="size-4" />{m.name?.slice(0, 14)}</span>}
            <button type="button" aria-label={`Remove ${m.name}`} onClick={() => onChange((v) => v.filter((x) => x.id !== m.id))} className="absolute right-0.5 top-0.5 rounded-full bg-charcoal/70 p-0.5 text-paper"><X className="size-3" /></button>
          </div>
        ))}
        {Object.entries(progress).map(([k, p]) => <div key={k} className="flex size-20 items-center justify-center rounded-[2px] border border-dashed border-stone-deep text-xs">{p}%</div>)}
      </div>
      <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => ref.current?.click()} disabled={value.length >= max}><Upload className="size-4" />{label}</Button>
      <input ref={ref} type="file" multiple accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      {err && <p className="mt-1 text-xs text-error">{err}</p>}
    </div>
  );
}
