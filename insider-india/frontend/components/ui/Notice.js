import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const TONES = {
  error: { cls: 'border-error/40 bg-error/5 text-error', Icon: AlertCircle },
  success: { cls: 'border-success/40 bg-success/5 text-success', Icon: CheckCircle2 },
  info: { cls: 'border-stone-deep bg-paper text-charcoal', Icon: Info },
};

export default function Notice({ tone = 'info', children, action, className }) {
  const { cls, Icon } = TONES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('flex items-start gap-3 rounded-none border px-4 py-3 text-sm', cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}
