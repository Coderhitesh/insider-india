import Link from 'next/link';
import clsx from 'clsx';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-wine text-paper hover:bg-wine-deep active:bg-wine-deep disabled:bg-wine/50',
  secondary: 'border border-charcoal text-charcoal hover:bg-charcoal hover:text-paper disabled:opacity-50',
  light: 'bg-paper text-charcoal hover:bg-linen disabled:opacity-60',
  ghost: 'text-charcoal hover:bg-stone/40 disabled:opacity-50',
  link: 'text-wine underline decoration-1 underline-offset-4 hover:decoration-2 px-0 py-0 h-auto',
};
const SIZES = { sm: 'h-9 px-4 text-sm', md: 'h-12 px-6 text-[0.95rem]', lg: 'h-14 px-8 text-base' };

export default function Button({ href, variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }) {
  const cls = clsx(
    'inline-flex items-center justify-center gap-2 rounded-[3px] font-medium transition-colors duration-200 select-none disabled:cursor-not-allowed',
    VARIANTS[variant], variant !== 'link' && SIZES[size], className,
  );
  if (href) return <Link href={href} className={cls} {...props}>{children}</Link>;
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
