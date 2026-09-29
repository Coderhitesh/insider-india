import clsx from 'clsx';
import { TIMELINE_EXPECTED } from '@/lib/status';
import { formatDate } from '@/lib/format';

// Completed events (with dates) followed by the milestones still ahead.
export default function Timeline({ events = [], status }) {
  const order = TIMELINE_EXPECTED.map(([k]) => k);
  const reached = events.reduce((max, e) => Math.max(max, order.indexOf(e.event)), -1);
  const closed = ['CANCELLED', 'QUOTATION_REJECTED', 'PROJECT_COMPLETED'].includes(status);
  const upcoming = closed ? [] : TIMELINE_EXPECTED.slice(reached + 1).filter(([k]) => !events.some((e) => e.event === k));
  const items = [
    ...events.map((e, i) => ({ key: `${e.event}-${i}`, label: e.label, at: e.at, state: i === events.length - 1 ? 'current' : 'done' })),
    ...upcoming.map(([k, label]) => ({ key: k, label, state: 'todo' })),
  ];
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <li key={it.key} className="relative flex gap-4 pb-6 last:pb-0">
          {i < items.length - 1 && <span aria-hidden="true" className={clsx('absolute left-[7px] top-4 h-full w-px', it.state === 'todo' ? 'bg-stone' : 'bg-wine/40')} />}
          <span aria-hidden="true" className={clsx('relative mt-1 size-[15px] shrink-0 rounded-full border-2',
            it.state === 'current' && 'border-wine bg-wine ring-4 ring-wine/15',
            it.state === 'done' && 'border-wine bg-paper',
            it.state === 'todo' && 'border-stone-deep bg-paper')} />
          <div className={clsx(it.state === 'todo' && 'text-graphite')}>
            <p className={clsx('font-medium', it.state === 'todo' && 'font-normal')}>{it.label}</p>
            {it.at && <p className="text-sm text-graphite"><time dateTime={it.at}>{formatDate(it.at)}</time></p>}
            <span className="sr-only">{it.state === 'todo' ? '(upcoming)' : it.state === 'current' ? '(latest)' : '(done)'}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
