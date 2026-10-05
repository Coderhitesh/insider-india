import clsx from 'clsx';

export function Field({ id, label, hint, error, children, className }) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={id} className="text-sm font-medium text-charcoal">{label}</label>}
      {children}
      {error ? <p id={`${id}-error`} className="text-caption text-error" role="alert">{error}</p>
        : hint ? <p id={`${id}-hint`} className="text-caption text-graphite">{hint}</p> : null}
    </div>
  );
}

export function Input({ id, error, className, prefix, ...props }) {
  const input = (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={clsx(
        'h-13 w-full rounded-none border bg-paper px-4 text-base text-charcoal placeholder:text-mist transition-colors',
        'focus:border-wine focus:shadow-[inset_0_0_0_1px_var(--color-wine)] focus:outline-none focus-visible:outline-none',
        error ? 'border-error' : 'border-stone-deep',
        prefix && 'pl-14',
        className,
      )}
      {...props}
    />
  );
  if (!prefix) return input;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-wine">{prefix}</span>
      {input}
    </div>
  );
}

export function Textarea({ id, error, className, ...props }) {
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      className={clsx('min-h-24 w-full rounded-none border bg-paper px-4 py-3 text-base focus:border-wine focus:shadow-[inset_0_0_0_1px_var(--color-wine)] focus:outline-none', error ? 'border-error' : 'border-stone-deep', className)}
      {...props}
    />
  );
}
