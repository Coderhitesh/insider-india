'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';

/**
 * Large selectable card backed by a native radio/checkbox (keyboard + screen-reader friendly).
 * Selected state: red frame and a red corner flag with a check — like a redline mark on a drawing.
 */
export default function ChoiceCard({ type = 'radio', name, value, checked, onChange, title, description, media, meta, className, compact = false }) {
  return (
    <label
      className={clsx(
        'group relative flex cursor-pointer flex-col border bg-paper transition-[border-color,box-shadow,background-color] duration-150',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine',
        checked ? 'border-wine bg-blush/40 shadow-[inset_0_0_0_1px_var(--color-wine)]' : 'border-stone-deep hover:border-wine',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span aria-hidden="true" className={clsx('absolute right-0 top-0 flex size-7 items-center justify-center transition-colors', checked ? 'bg-wine text-paper' : 'bg-transparent')}>
        {checked ? <Check className="size-4" strokeWidth={3} /> : <span className={clsx('size-3.5 border-2 border-stone-deep group-hover:border-wine', type === 'radio' ? 'rounded-full' : '')} />}
      </span>
      {media && <span className="mb-4 block">{media}</span>}
      <span className={clsx('pr-8 font-semibold text-charcoal', compact ? 'text-[0.95rem]' : 'text-lg')}>{title}</span>
      {description && <span className="mt-1 pr-6 text-sm text-graphite">{description}</span>}
      {meta && <span className="mt-3 text-sm text-charcoal">{meta}</span>}
    </label>
  );
}
