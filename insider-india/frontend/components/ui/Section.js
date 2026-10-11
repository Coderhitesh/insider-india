import clsx from 'clsx';

export function Section({ id, tone = 'linen', className, children, labelledBy }) {
  const tones = {
    linen: 'bg-paper', paper: 'bg-paper', blush: 'bg-blush', grid: 'grid-paper',
    charcoal: 'bg-wine text-paper', red: 'bg-wine text-paper', stone: 'bg-blush',
  };
  return (
    <section id={id} aria-labelledby={labelledBy} className={clsx(tones[tone], 'py-20 sm:py-28', className)}>
      <div className="container-x">{children}</div>
    </section>
  );
}

// Heading with a red dimension rule above it: a short measured line with end ticks.
export function SectionHeading({ id, title, intro, className, align = 'left' }) {
  return (
    <div className={clsx('mb-12 sm:mb-16', className)}>
      <div aria-hidden="true" className="mb-5 flex items-center gap-0 text-current opacity-80">
        <span className="h-3 w-px bg-current" /><span className="h-px w-16 bg-current" /><span className="h-3 w-px bg-current" />
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <h2 id={id} className={clsx('text-d2 lg:col-span-7', align === 'center' && 'text-center lg:col-start-3')}>{title}</h2>
        {intro && <p className="measure self-end text-lg opacity-80 lg:col-span-4 lg:col-start-9">{intro}</p>}
      </div>
    </div>
  );
}
