'use client';

import Link from 'next/link';
import { CalendarClock, UserRound, FileText, Hammer, Calculator, FolderOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import RangeText from '@/components/ui/RangeText';
import BudgetCard from '@/components/ui/BudgetCard';
import Timeline from '@/components/account/Timeline';
import { Badge, Panel, PageTitle, Empty, Loading, LoadError } from '@/components/account/Bits';
import { useApi } from '@/lib/useApi';
import { BOOKING_STATUS, QUOTATION_STATUS, PROJECT_STAGES } from '@/lib/status';
import { formatDate, formatINR } from '@/lib/format';
import { formatTimeIST } from './time';

export default function Dashboard() {
  const { data, error, loading, reload } = useApi('/account/summary');
  if (loading) return <Loading rows={4} />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  const { user, activeBooking: b, siteVisit, quotation, project, openLead, estimate, notifications, floorPlans, budget } = data;
  const firstName = user.name ? user.name.split(' ')[0] : null;
  const est = estimate?.results?.find((r) => r.package === estimate.selectedPackage);

  return (
    <>
      <PageTitle title={firstName ? `Hello, ${firstName}` : 'Your dashboard'} />

      {openLead && (
        <Panel className="mb-6 border-wine/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">You have an unfinished consultation request</p>
              <p className="text-sm text-graphite">Pick up where you left off. Your answers are saved.</p>
            </div>
            <Button href="/book-consultation">Continue request</Button>
          </div>
        </Panel>
      )}

      {!b && !openLead && (
        <Empty title="No consultations yet" body="Book a consultation to get a site visit and a measured, itemised quotation for your home." href="/book-consultation" cta="Book a consultation" />
      )}

      {b && (
        <div className="grid items-start gap-6 xl:grid-cols-5">
          <div className="space-y-6 xl:col-span-3">
          <Panel title="Current consultation" action={<Link href={`/account/bookings/${b.id}`} className="text-sm text-wine underline underline-offset-4">View booking</Link>}>
            <div className="flex flex-wrap items-center gap-3">
              <p className="tabular text-xl font-semibold">{b.bookingNumber}</p>
              <Badge map={BOOKING_STATUS} value={b.status} />
            </div>
            <p className="mt-2 text-sm text-graphite">{[b.labels?.requirementType, b.labels?.bhk, b.address?.city].filter(Boolean).join(', ')}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Fact icon={UserRound} label="Your expert">{b.assignedContractor?.name || siteVisit?.expert || 'Being assigned'}</Fact>
              <Fact icon={CalendarClock} label="Site visit">
                {siteVisit ? (siteVisit.status === 'COMPLETED' ? `Completed ${formatDate(siteVisit.scheduledAt)}` : `${formatDate(siteVisit.scheduledAt)}, ${formatTimeIST(siteVisit.scheduledAt)}`) : 'Not scheduled yet'}
              </Fact>
              <Fact icon={FileText} label="Quotation">
                {quotation ? <Link href={`/account/quotations/${quotation.id}`} className="underline underline-offset-4">{formatINR(quotation.grandTotal)} <span className="text-graphite">({QUOTATION_STATUS[quotation.status]?.[0] || quotation.status})</span></Link> : 'Shared after your site visit'}
              </Fact>
              <Fact icon={FolderOpen} label="Floor plans">{floorPlans ? `${floorPlans} uploaded` : b.floorPlan?.measurementAssistance?.opted ? 'Measurement assistance requested' : 'None uploaded'}</Fact>
            </dl>
            {budget && !quotation && <div className="mt-6"><BudgetCard budget={budget} compact /></div>}
            {quotation?.status === 'SENT_TO_CUSTOMER' && quotation.isLatest && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-none bg-wine-tint p-4">
                <p className="font-medium text-wine">Your quotation is ready for review.</p>
                <Button href={`/account/quotations/${quotation.id}`} size="sm">Review quotation</Button>
              </div>
            )}
          </Panel>

          {project && (
            <Panel title="Project" action={<Link href={`/account/projects/${project.id}`} className="text-sm text-wine underline underline-offset-4">Open project</Link>}>
              <div className="flex items-center gap-3"><Hammer className="size-5 text-wine" aria-hidden="true" /><p className="font-medium">{project.projectNumber}</p></div>
              <p className="mt-2 text-graphite">{project.startedAt ? `Current stage: ${PROJECT_STAGES.find(([k]) => k === project.stage)?.[1]}` : 'Your project will start shortly. We will notify you when work begins.'}</p>
            </Panel>
          )}

          {est && estimate?.source !== 'AUTO_BOOKING' && (
            <Panel title="Latest estimate" action={<Link href="/account/estimates" className="text-sm text-wine underline underline-offset-4">All estimates</Link>}>
              <div className="flex items-center gap-3"><Calculator className="size-5 text-wine" aria-hidden="true" /><p>{est.packageName}</p></div>
              <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{est.available ? <RangeText min={est.finalMin} max={est.finalMax} /> : 'Price on request'}</p>
              <p className="mt-1 text-xs text-graphite">Indicative. Created {formatDate(estimate.createdAt)}.</p>
            </Panel>
          )}
          </div>
          <Panel className="xl:col-span-2" title="Progress">
            <Timeline events={b.timeline} status={b.status} />
          </Panel>
        </div>
      )}

      {!b && est && (
        <Panel className="mt-6" title="Latest estimate">
          <p>{est.packageName}: <span className="tabular font-medium">{est.available ? <RangeText min={est.finalMin} max={est.finalMax} /> : 'Price on request'}</span></p>
        </Panel>
      )}

      <Panel className="mt-6" title="Notifications" action={<Link href="/account/notifications" className="text-sm text-wine underline underline-offset-4">View all{notifications.unread ? ` (${notifications.unread} unread)` : ''}</Link>}>
        {notifications.recent.length ? (
          <ul className="divide-y divide-stone">
            {notifications.recent.map((n) => (
              <li key={n.id} className="flex gap-3 py-3">
                {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-wine" aria-label="Unread" />}
                <div className={n.readAt ? 'pl-5' : ''}><p className="font-medium">{n.title}</p><p className="text-sm text-graphite">{n.body}</p></div>
              </li>
            ))}
          </ul>
        ) : <p className="text-graphite">Nothing new.</p>}
      </Panel>
    </>
  );
}

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-graphite" aria-hidden="true" />
      <div><dt className="text-sm text-graphite">{label}</dt><dd className="font-medium">{children}</dd></div>
    </div>
  );
}
