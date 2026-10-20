import clsx from 'clsx';

export function Section({ id, tone = 'linen', className, children, labelledBy }) {
  const tones = {
    linen: 'bg-paper', paper: 'bg-paper', blush: 'bg-blush/70', grid: 'bg-[#fdf8f7]', soft: 'bg-[#fdf8f7]',
    charcoal: 'red-panel text-paper', red: 'red-panel text-paper', stone: 'bg-[#fdf8f7]',
  };
  return (
    <section id={id} aria-labelledby={labelledBy} className={clsx(tones[tone], 'py-14 sm:py-20', className)}>
      <div className="container-x">{children}</div>
    </section>
  );
}

// Eyebrow + serif title on the left, short intro on the right (same as the home page).
export function SectionHeading({ id, title, intro, eyebrow, className, align = 'left', light = false }) {
  return (
    <div className={clsx('mb-8 grid gap-5 lg:mb-10 lg:grid-cols-12 lg:items-end', className)}>
      <div className={clsx('lg:col-span-7', align === 'center' && 'text-center lg:col-span-8 lg:col-start-3')}>
        <p className={clsx('eyebrow', light && '!text-paper/85')}>{eyebrow || ' '}</p>
        <h2 id={id} className="mt-2 text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.08]">{title}</h2>
      </div>
      {intro && <p className={clsx('max-w-md text-sm leading-relaxed lg:col-span-5 lg:pl-8', light ? 'text-paper/85' : 'text-graphite')}>{intro}</p>}
    </div>
  );
}
