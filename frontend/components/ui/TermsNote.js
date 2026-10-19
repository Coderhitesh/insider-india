import Link from 'next/link';
import clsx from 'clsx';

/** "By submitting this form you agree…" line shown under every public form. */
export default function TermsNote({ className, action = 'submitting this form', light = false }) {
  const a = light ? 'text-paper underline underline-offset-2' : 'text-wine underline underline-offset-2 hover:text-wine-deep';
  return (
    <p className={clsx('text-xs leading-relaxed', light ? 'text-paper/80' : 'text-graphite', className)}>
      By {action}, you agree to our <Link href="/privacy-policy" className={a} target="_blank">Privacy Policy</Link> &amp; <Link href="/terms" className={a} target="_blank">Terms and Conditions</Link>.
    </p>
  );
}
