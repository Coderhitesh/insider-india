import Link from 'next/link';
import clsx from 'clsx';

// Monogram block + expanded wordmark. Replaced by company.logoUrl when set in Admin.
export default function Logo({ company, className, inverse = false }) {
  if (company?.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <Link href="/" className={className} aria-label={`${company.name} home`}><img src={company.logoUrl} alt={company.name} className="h-9 w-auto" /></Link>;
  }
  return (
    <Link href="/" aria-label={`${company?.name || 'INSIDER INDIA LLP'} home`} className={clsx('group inline-flex items-center gap-2.5 leading-none', className)}>
      <span aria-hidden="true" className={clsx('flex size-9 items-center justify-center font-display text-[0.95rem] tracking-[-0.04em]', inverse ? 'bg-paper text-wine' : 'bg-wine text-paper')}>II</span>
      <span className={clsx('flex flex-col', inverse ? 'text-paper' : 'text-charcoal')}>
        <span className="font-display text-[1.05rem] tracking-[-0.01em]">INSIDER INDIA</span>
        <span className={clsx('mt-0.5 text-[0.6rem] font-semibold tracking-[0.32em]', inverse ? 'text-paper/80' : 'text-wine')}>INTERIORS · LLP</span>
      </span>
    </Link>
  );
}
