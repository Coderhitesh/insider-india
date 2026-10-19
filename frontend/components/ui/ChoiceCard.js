'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';

/** Large selectable card backed by a native radio/checkbox (keyboard + screen-reader friendly). */
export default function ChoiceCard({ type = 'radio', name, value, checked, onChange, title, description, media, meta, className, compact = false }) {
  return (
    <label
      className={clsx(
        'group relative flex cursor-pointer flex-col rounded-xl border bg-paper transition-[border-color,box-shadow,background-color] duration-150',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine',
        checked ? 'border-wine bg-blush/50 shadow-[0_0_0_1px_var(--color-wine),0_12px_28px_-16px_rgb(154_12_34/.45)]' : 'border-stone-deep/70 shadow-[0_1px_2px_rgb(26_11_13/.04)] hover:border-wine hover:shadow-[0_10px_24px_-16px_rgb(154_12_34/.35)]',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {/* With a picture the tick sits beside the title (never on top of the image); without one it stays in the corner. */}
      {!media && <Tick checked={checked} type={type} className="absolute right-3 top-3" />}
      {media && <span className="mb-4 block overflow-hidden rounded-lg">{media}</span>}
      <span className={clsx('flex items-start justify-between gap-3 font-semibold text-charcoal', !media && 'pr-8', compact ? 'text-[0.95rem]' : 'text-lg')}>
        <span>{title}</span>
        {media && <Tick checked={checked} type={type} className="mt-0.5 shrink-0" />}
      </span>
      {description && <span className="mt-1 pr-6 text-sm text-graphite">{description}</span>}
      {meta && <span className="mt-3 text-sm text-charcoal">{meta}</span>}
    </label>
  );
}

function Tick({ checked, type, className }) {
  return (
    <span aria-hidden="true" className={clsx('flex size-6 items-center justify-center rounded-full border-2 bg-paper transition-colors', checked ? 'border-wine bg-wine text-paper' : 'border-stone-deep group-hover:border-wine', type === 'checkbox' && 'rounded-md', className)}>
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );
}
