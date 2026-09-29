'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Native <dialog>: focus trapping, Escape and inert background for free.
export default function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="dialog-title"
      className="m-auto w-[min(92vw,34rem)] rounded-[3px] bg-paper p-0 text-charcoal shadow-2xl backdrop:bg-charcoal/50">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="dialog-title" className="text-2xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-2 p-2 text-graphite hover:text-charcoal"><X className="size-5" /></button>
        </div>
        <div className="mt-5">{open && children}</div>
      </div>
    </dialog>
  );
}
