'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Timeline from '@/components/account/Timeline';
import Button from '@/components/ui/Button';
import BudgetCard from '@/components/ui/BudgetCard';
import { Badge, Panel, PageTitle, Empty, Loading, LoadError, Row, BackLink } from '@/components/account/Bits';
import { useApi } from '@/lib/useApi';
import { BOOKING_STATUS, QUOTATION_STATUS } from '@/lib/status';
import { formatDate, formatINR } from '@/lib/format';
import { formatDateTime } from './time';

export function BookingsList() {
  const { data, error, loading, reload } = useApi('/bookings/mine?limit=50');
  return (
    <>
      <PageTitle title="Bookings"><Button href="/book-consultation" variant="secondary" size="sm">New consultation</Button></PageTitle>
      {loading ? <Loading /> : error ? <LoadError error={error} onRetry={reload} /> : !data.items.length ? (
        <Empty title="No bookings yet" body="Your consultation requests will appear here." href="/book-consultation" cta="Book a consultation" />
      ) : (
        <ul className="divide-y divide-stone rounded-none border border-stone bg-paper">
          {data.items.map((b) => (
            <li key={b.id}>
              <Link href={`/account/bookings/${b.id}`} className="flex items-center gap-4 p-5 hover:bg-blush/60">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3"><span className="tabular font-semibold">{b.bookingNumber}</span><Badge map={BOOKING_STATUS} value={b.status} /></div>
                  <p className="mt-1 truncate text-sm text-graphite">{[b.labels?.requirementType, b.labels?.bhk, b.address?.formattedAddress].filter(Boolean).join(', ')}</p>
                </div>
                <span className="hidden text-sm text-graphite sm:block">{formatDate(b.createdAt)}</span>
                <ChevronRight className="size-4 text-graphite" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function BookingDetail({ id }) {
  const { data, error, loading, reload } = useApi(`/bookings/${id}`);
  if (loading) return <Loading rows={4} />;
  if (error) return <><BackLink href="/account/bookings">Bookings</BackLink><LoadError error={error} onRetry={reload} /></>;
  const { booking: b, siteVisit, quotations = [], project, budget } = data;
  const l = b.labels || {};
  return (
    <>
      <BackLink href="/account/bookings">Bookings</BackLink>
      <PageTitle code title={b.bookingNumber}><Badge map={BOOKING_STATUS} value={b.status} /></PageTitle>
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          {budget && !quotations.length && <BudgetCard budget={budget} showPackages />}
          {siteVisit && (
            <Panel title="Site visit">
              <p className="text-lg">{siteVisit.status === 'COMPLETED' ? 'Completed' : 'Scheduled for'} {formatDateTime(siteVisit.scheduledAt)}</p>
              {siteVisit.expert && <p className="mt-1 text-graphite">With {siteVisit.expert}</p>}
            </Panel>
          )}
          {quotations.length > 0 && (
            <Panel title="Quotations">
              <ul className="divide-y divide-stone">
                {quotations.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <Link href={`/account/quotations/${q.id}`} className="tabular font-medium underline underline-offset-4">{q.displayNumber}</Link>
                      <p className="text-sm text-graphite">Sent {formatDate(q.sentAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular">{formatINR(q.grandTotal)}</span>
                      <Badge map={QUOTATION_STATUS} value={q.status} override={!q.isLatest ? ['Earlier version', 'muted'] : undefined} />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {project && (
            <Panel title="Project" action={<Link href={`/account/projects/${project.id}`} className="text-sm text-wine underline underline-offset-4">Open project</Link>}>
              <p>{project.projectNumber}</p>
            </Panel>
          )}
          <Panel title="Request details">
            <dl>
              <Row label="Name">{b.customerName}</Row>
              <Row label="Location">{[b.address?.formattedAddress, b.address?.pincode].filter(Boolean).join(', ')}</Row>
              <Row label="Requirement">{l.requirementType}</Row>
              <Row label="Home type">{l.propertyType}</Row>
              <Row label="Configuration">{l.bhk}</Row>
              <Row label="Project type">{l.projectType}</Row>
              <Row label="Services">{b.services.join(', ')}</Row>
              <Row label="Budget">{l.budgetRange}</Row>
              <Row label="Possession">{l.possession}</Row>
              <Row label="Floor plan">{b.floorPlan.hasFloorPlan ? `${b.floorPlan.files} file(s) — see Documents` : b.floorPlan.measurementAssistance?.opted ? `Expert measurement assistance (${formatINR(b.floorPlan.measurementAssistance.charge)})` : 'Not provided'}</Row>
              <Row label="Expert">{b.assignedContractor?.name || 'Being assigned'}</Row>
              <Row label="Submitted">{formatDate(b.createdAt)}</Row>
            </dl>
          </Panel>
        </div>
        <Panel className="h-max xl:col-span-2" title="Timeline"><Timeline events={b.timeline} status={b.status} /></Panel>
      </div>
    </>
  );
}
