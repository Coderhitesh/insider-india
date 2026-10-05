'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Side panel on <dialog> (focus trap, Escape, inert background).
export default function Drawer({ open, onClose, title, children, footer, width = 'max-w-2xl' }) {
  const ref = useRef(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="drawer-title"
      className={`m-0 ml-auto h-dvh max-h-dvh w-full ${width} bg-paper p-0 text-charcoal shadow-2xl backdrop:bg-[#3a0610]/50`}>
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b-2 border-wine px-6 py-4">
            <h2 id="drawer-title" className="text-lg">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-m-2 p-2 text-graphite hover:text-charcoal"><X className="size-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-stone px-6 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
