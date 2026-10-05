import Link from 'next/link';
import clsx from 'clsx';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-wine text-paper hover:bg-wine-deep active:bg-wine-deep disabled:bg-wine/45',
  secondary: 'border-2 border-wine text-wine hover:bg-wine hover:text-paper disabled:opacity-50',
  light: 'bg-paper text-wine hover:bg-blush disabled:opacity-60',
  outlineLight: 'border-2 border-paper text-paper hover:bg-paper hover:text-wine',
  ghost: 'text-charcoal hover:bg-blush hover:text-wine disabled:opacity-50',
  link: 'text-wine underline decoration-2 underline-offset-4 hover:text-wine-deep px-0 py-0 h-auto',
};
const SIZES = { sm: 'h-9 px-4 text-sm', md: 'h-12 px-6 text-[0.95rem]', lg: 'h-14 px-8 text-base' };

export default function Button({ href, variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }) {
  const cls = clsx(
    'inline-flex items-center justify-center gap-2 font-semibold tracking-[0.01em] transition-colors duration-150 select-none disabled:cursor-not-allowed',
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
