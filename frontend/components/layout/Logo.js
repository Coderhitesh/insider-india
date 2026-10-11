import Link from 'next/link';
import clsx from 'clsx';

// Monogram tile + wordmark. Replaced by company.logoUrl when set in Admin.
export default function Logo({ company, className, inverse = false }) {
  if (company?.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <Link href="/" className={className} aria-label={`${company.name} home`}><img src={company.logoUrl} alt={company.name} className="h-9 w-auto" /></Link>;
  }
  return (
    <Link href="/" aria-label={`${company?.name || 'INSIDER INDIA LLP'} home`} className={clsx('group inline-flex items-center gap-2.5 leading-none', className)}>
      <span aria-hidden="true" className={clsx('flex size-9 items-center justify-center rounded-[4px] text-[0.95rem] font-bold tracking-[-0.06em]', inverse ? 'bg-paper text-wine' : 'bg-wine text-paper')}>
        <span className="border-l-2 border-current pl-[3px] leading-none">II</span>
      </span>
      <span className={clsx('flex flex-col', inverse ? 'text-paper' : 'text-charcoal')}>
        <span className="text-[1.02rem] font-extrabold tracking-[0.01em]">INSIDER INDIA</span>
        <span className={clsx('mt-[3px] text-[0.6rem] font-medium tracking-[0.2em]', inverse ? 'text-paper/75' : 'text-graphite')}>INTERIORS LLP</span>
      </span>
    </Link>
  );
}
