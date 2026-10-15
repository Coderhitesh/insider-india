'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { ChevronRight, FileText } from 'lucide-react';
import { Badge, Panel, PageTitle, Empty, Loading, LoadError, Row, BackLink } from '@/components/account/Bits';
import { useApi } from '@/lib/useApi';
import { PROJECT_STAGES } from '@/lib/status';
import { formatDate, formatINR } from '@/lib/format';

export function ProjectsList() {
  const { data, error, loading, reload } = useApi('/account/projects');
  return (
    <>
      <PageTitle title="Projects" />
      {loading ? <Loading /> : error ? <LoadError error={error} onRetry={reload} /> : !data.items.length ? (
        <Empty title="No projects yet" body="A project is created when you accept a quotation. You can then follow every stage here." href="/account/quotations" cta="View quotations" />
      ) : (
        <ul className="divide-y divide-stone rounded-none border border-stone bg-paper">
          {data.items.map((p) => (
            <li key={p.id}>
              <Link href={`/account/projects/${p.id}`} className="flex items-center gap-4 p-5 hover:bg-blush/60">
                <div className="flex-1">
                  <p className="tabular font-semibold">{p.projectNumber}</p>
                  <p className="text-sm text-graphite">Booking {p.bookingNumber}. {p.startedAt ? `Stage ${p.stageIndex} of ${p.stageCount}: ${p.stageLabel}` : 'Starting soon'}</p>
                </div>
                <ChevronRight className="size-4 text-graphite" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function ProjectDetail({ id }) {
  const { data, error, loading, reload } = useApi(`/account/projects/${id}`);
  if (loading) return <Loading rows={4} />;
  if (error) return <><BackLink href="/account/projects">Projects</BackLink><LoadError error={error} onRetry={reload} /></>;
  const p = data.project;
  const current = PROJECT_STAGES.findIndex(([k]) => k === p.stage);
  const upcoming = (p.milestones || []).filter((m) => m.status !== 'DONE').sort((a, b) => new Date(a.dueDate || 8.64e15) - new Date(b.dueDate || 8.64e15));

  return (
    <>
      <BackLink href="/account/projects">Projects</BackLink>
      <PageTitle code title={p.projectNumber}>
        <Badge map={{}} value="" override={p.stage === 'COMPLETED' ? ['Completed', 'good'] : p.startedAt ? [p.stageLabel, 'action'] : ['Starting soon', 'neutral']} />
      </PageTitle>

      <Panel className="mb-6" title="Stages">
        <ol className="grid grid-cols-2 gap-y-4 sm:grid-cols-4 xl:grid-cols-8" aria-label={`Stage ${p.stageIndex} of ${p.stageCount}`}>
          {PROJECT_STAGES.map(([k, label], i) => {
            const state = !p.startedAt ? 'todo' : i < current || p.stage === 'COMPLETED' ? 'done' : i === current ? 'current' : 'todo';
            const at = p.stages.find((s) => s.stage === k);
            return (
              <li key={k} className="pr-3">
                <div className={clsx('h-1', state === 'todo' ? 'bg-stone' : 'bg-wine', state === 'current' && 'bg-[linear-gradient(90deg,var(--color-wine)_50%,var(--color-stone)_50%)]')} />
                <p className={clsx('mt-2 text-sm', state === 'todo' ? 'text-graphite' : 'font-medium')}>{label}</p>
                {at?.startedAt && <p className="text-xs text-graphite">{formatDate(at.startedAt)}</p>}
                <span className="sr-only">{state === 'done' ? 'done' : state === 'current' ? 'current stage' : 'upcoming'}</span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Progress updates">
            {p.updates.length ? (
              <ul className="divide-y divide-stone">
                {p.updates.map((u) => (
                  <li key={u.id} className="py-4">
                    <p className="text-xs text-graphite">{formatDate(u.at)}</p>
                    <p className="mt-1 whitespace-pre-line">{u.text}</p>
                    {u.media.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {u.media.map((m) => (
                          <li key={m.id}>
                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="block">
                              {m.mimeType?.startsWith('image/') ? <img src={m.url} alt={m.originalName} className="size-24 rounded-none object-cover" loading="lazy" />
                                : <span className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-none border border-stone text-xs"><FileText className="size-5" />{m.mimeType?.split('/')[1]}</span>}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-graphite">Updates and site photos from your team will appear here.</p>}
          </Panel>
          {p.documents.length > 0 && (
            <Panel title="Documents">
              <ul className="divide-y divide-stone">
                {p.documents.filter((d) => d.file).map((d) => (
                  <li key={d.file.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="flex items-center gap-2"><FileText className="size-4 text-graphite" aria-hidden="true" />{d.title || d.file.originalName}</span>
                    <a href={d.file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-wine underline underline-offset-4">Open</a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          <Panel title="Team">
            <dl>
              <Row label="Project manager">{p.projectManager?.name || 'Being assigned'}</Row>
              {p.projectManager?.mobile && <Row label="Contact"><a href={`tel:+91${p.projectManager.mobile}`} className="underline">+91 {p.projectManager.mobile}</a></Row>}
              <Row label="Expert">{p.contractor?.name || '—'}</Row>
              {p.startedAt && <Row label="Started">{formatDate(p.startedAt)}</Row>}
            </dl>
          </Panel>
          <Panel title="Upcoming milestones">
            {upcoming.length ? <dl>{upcoming.slice(0, 6).map((m) => <Row key={m._id} label={m.title}>{m.dueDate ? formatDate(m.dueDate) : 'Date to be confirmed'}</Row>)}</dl>
              : <p className="text-sm text-graphite">Your project manager will share milestones once design begins.</p>}
          </Panel>
          {p.paymentSchedule.length > 0 && (
            <Panel title="Payment schedule">
              <dl>
                {p.paymentSchedule.map((x) => (
                  <Row key={x._id || x.label} label={`${x.label}${x.percent ? ` (${x.percent}%)` : ''}`}>
                    <span className="tabular block">{formatINR(x.amount)}</span>
                    <span className={clsx('block text-xs', x.status === 'PAID' ? 'text-success' : 'text-graphite')}>{x.status === 'PAID' ? `Paid${x.paidAt ? ` ${formatDate(x.paidAt)}` : ''}` : x.dueOn ? `Due ${formatDate(x.dueOn)}` : 'Pending'}</span>
                  </Row>
                ))}
              </dl>
              {p.grandTotal ? <p className="mt-3 text-sm text-graphite">Project value {formatINR(p.grandTotal)}</p> : null}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
