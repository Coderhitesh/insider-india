import clsx from 'clsx';

export function Section({ id, tone = 'linen', className, children, labelledBy }) {
  const tones = { linen: 'bg-linen', paper: 'bg-paper', charcoal: 'bg-charcoal text-paper', stone: 'bg-stone/60' };
  return (
    <section id={id} aria-labelledby={labelledBy} className={clsx(tones[tone], 'py-20 sm:py-28', className)}>
      <div className="container-x">{children}</div>
    </section>
  );
}

export function SectionHeading({ id, title, intro, className, align = 'left' }) {
  return (
    <div className={clsx('mb-12 grid gap-5 sm:mb-16 lg:grid-cols-12', className)}>
      <h2 id={id} className={clsx('text-d2 lg:col-span-7', align === 'center' && 'lg:col-start-3 text-center')}>{title}</h2>
      {intro && <p className="measure self-end text-lg text-current/75 lg:col-span-4 lg:col-start-9">{intro}</p>}
    </div>
  );
}
