import Link from 'next/link';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';

const TONES = {
  action: 'bg-wine text-paper',
  good: 'bg-success/10 text-success',
  neutral: 'bg-blush text-charcoal',
  muted: 'bg-transparent text-graphite border border-stone-deep',
};

export function Badge({ map, value, override }) {
  const [label, tone] = override || map[value] || [value, 'neutral'];
  return <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone])}>{label}</span>;
}

export function Panel({ title, action, children, className }) {
  return (
    <section className={clsx('border border-stone-deep bg-paper p-5 sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          {title && <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal [font-stretch:100%]"><span aria-hidden="true" className="size-2 bg-wine" />{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// `code` renders reference numbers (BK-…, QT-…) in the UI face: Bodoni's hairline hyphens vanish.
export function PageTitle({ title, code = false, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className={code ? 'tabular font-sans text-2xl font-semibold tracking-normal sm:text-3xl' : 'text-d3'}>{title}</h1>
      {children}
    </div>
  );
}

export function Empty({ title, body, href, cta }) {
  return (
    <div className="rounded-none border border-dashed border-stone-deep p-8">
      <p className="text-lg font-medium">{title}</p>
      {body && <p className="mt-1 max-w-md text-graphite">{body}</p>}
      {href && <Button href={href} className="mt-5">{cta}</Button>}
    </div>
  );
}

export function Loading({ rows = 3 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-none bg-stone/50" />)}
    </div>
  );
}

export function LoadError({ error, onRetry }) {
  return <Notice tone="error" action={onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}>{error?.message || 'This section did not load.'}</Notice>;
}

export function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-6 border-b border-stone py-2.5 text-sm last:border-b-0">
      <dt className="text-graphite">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export function BackLink({ href, children }) {
  return <Link href={href} className="mb-6 inline-block text-sm text-graphite hover:text-charcoal">← {children}</Link>;
}
