'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';

/**
 * Large selectable card backed by a native radio/checkbox (keyboard + screen-reader friendly).
 * `media` renders above the text (icon, swatch or image).
 */
export default function ChoiceCard({ type = 'radio', name, value, checked, onChange, title, description, media, meta, className, compact = false }) {
  return (
    <label
      className={clsx(
        'group flex cursor-pointer flex-col rounded-[3px] border bg-paper transition-[border-color,box-shadow] duration-200',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine',
        checked ? 'border-wine shadow-[inset_0_0_0_1px_var(--color-wine)]' : 'border-stone hover:border-stone-deep',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {media && <span className="mb-4 block">{media}</span>}
      <span className="flex items-start justify-between gap-3">
        <span className={clsx('font-medium text-charcoal', compact ? 'text-[0.95rem]' : 'text-lg')}>{title}</span>
        <span
          aria-hidden="true"
          className={clsx(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center border transition-colors',
            type === 'radio' ? 'rounded-full' : 'rounded-[2px]',
            checked ? 'border-wine bg-wine text-paper' : 'border-stone-deep bg-paper',
          )}
        >
          {checked && <Check className="size-3.5" strokeWidth={3} />}
        </span>
      </span>
      {description && <span className="mt-1 pr-8 text-sm text-graphite">{description}</span>}
      {meta && <span className="mt-3 text-sm text-charcoal">{meta}</span>}
    </label>
  );
}
