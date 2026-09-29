import Link from 'next/link';
import clsx from 'clsx';

export default function Logo({ company, className, inverse = false }) {
  if (company?.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <Link href="/" className={className} aria-label={`${company.name} home`}><img src={company.logoUrl} alt={company.name} className="h-9 w-auto" /></Link>;
  }
  return (
    <Link href="/" aria-label={`${company?.name || 'INSIDER INDIA LLP'} home`} className={clsx('group inline-flex items-baseline gap-2 leading-none', inverse ? 'text-paper' : 'text-charcoal', className)}>
      <span className="font-display text-[1.45rem] font-semibold tracking-[0.04em]">INSIDER&nbsp;INDIA</span>
      <span className={clsx('text-[0.65rem] tracking-[0.2em]', inverse ? 'text-stone' : 'text-graphite')}>LLP</span>
    </Link>
  );
}
