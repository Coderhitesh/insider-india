'use client';

import { useRef } from 'react';
import clsx from 'clsx';

export default function OtpInput({ length = 4, value, onChange, onComplete, disabled, error }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const set = (next) => {
    const v = next.replace(/\D/g, '').slice(0, length);
    onChange(v);
    if (v.length === length) onComplete?.(v);
    refs.current[Math.min(v.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-3" role="group" aria-label={`Enter ${length}-digit code`}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          maxLength={length}
          disabled={disabled}
          autoFocus={i === 0}
          value={d}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const input = e.target.value.replace(/\D/g, '');
            if (input.length > 1) return set(input); // paste / SMS autofill
            const arr = digits.slice();
            arr[i] = input;
            const joined = arr.join('').slice(0, length);
            onChange(joined);
            if (input && i < length - 1) refs.current[i + 1]?.focus();
            if (joined.length === length && !arr.includes('')) onComplete?.(joined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
          }}
          className={clsx(
            'tabular size-14 rounded-[3px] border bg-paper text-center font-display text-3xl focus:border-charcoal focus:outline-none sm:size-16',
            error ? 'border-error' : 'border-stone-deep',
          )}
        />
      ))}
    </div>
  );
}
