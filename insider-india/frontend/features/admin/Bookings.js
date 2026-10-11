'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import BudgetCard from '@/components/ui/BudgetCard';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Header, DataTable, Pill, Box, KV, Loader, Failed } from '@/components/admin/Kit';
import Filters from '@/components/admin/Filters';
import { useList } from '@/components/admin/useList';
import { useRefData, opt, BOOKING_STATUSES, nice } from '@/components/admin/refData';
import { Activity, Notes, AssignContractor } from '@/components/admin/Shared';
import { SiteVisitPanel } from './SiteVisits';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can, downloadCsv, fmtDate, fmtDateTime, inr } from '@/lib/admin';

export function BookingsList() {
  const user = useAuth((s) => s.user);
  const ref = useRefData();
  const list = useList('/admin/bookings', { limit: '25' });
  const o = ref.options;
  return (
    <>
      <Header title={user.role === 'CONTRACTOR' ? 'My bookings' : 'Bookings'} />
      <Filters params={list.params} setParams={list.setParams} placeholder="Booking ID, name or mobile" filters={[
        { name: 'status', label: 'Status', options: BOOKING_STATUSES.map((s) => [s, nice(s)]) },
        { name: 'range' },
        { name: 'city', label: 'City', options: opt(o?.cities) },
        { name: 'bhk', label: 'BHK', options: opt(o?.bhkOptions) },
        { name: 'budget', label: 'Budget', options: opt(o?.budgetRanges) },
        { name: 'service', label: 'Service', options: ref.services.map((s) => [s.id, s.title]) },
        { name: 'package', label: 'Package', options: ref.packages.map((p) => [p.id, p.name]) },
        ...(user.role !== 'CONTRACTOR' ? [{ name: 'contractor', label: 'Contractor', options: [['unassigned', 'Unassigned'], ...ref.contractors.map((c) => [c.id, c.name])] }] : []),
      ]} />
      <DataTable tableId="bookings" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        sort={list.params.sort || '-createdAt'} onSort={(s) => list.setParams({ sort: s })}
        onExport={() => downloadCsv(`/admin/bookings${list.exportQuery}`, 'bookings.csv').catch((e) => alert(e.message))}
        rowHref={(r) => `/admin/bookings/${r.id}`} empty="No bookings match these filters."
        columns={[
          { key: 'bookingNumber', label: 'Booking' },
          { key: 'customerName', label: 'Customer', render: (r) => <><span className="block">{r.customerName}</span><span className="text-xs text-graphite">+91 {r.mobile}</span></> },
          { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> },
          { key: 'city', label: 'City', render: (r) => r.address?.city || '—' },
          { key: 'bhk', label: 'BHK', render: (r) => r.labels?.bhk || '—' },
          { key: 'req', label: 'Requirement', render: (r) => r.labels?.requirementType || '—' },
          { key: 'budget', label: 'Budget', defaultHidden: true, render: (r) => r.labels?.budgetRange || '—' },
          { key: 'services', label: 'Services', defaultHidden: true, render: (r) => r.services.join(', ') },
          { key: 'contractor', label: 'Contractor', render: (r) => r.assignedContractor?.name || <span className="text-graphite">Unassigned</span> },
          { key: 'visit', label: 'Site visit', render: (r) => (r.siteVisitAt ? fmtDateTime(r.siteVisitAt) : '—') },
          { key: 'createdAt', label: 'Created', sortKey: 'createdAt', render: (r) => fmtDate(r.createdAt) },
        ]} />
    </>
  );
}

// Where this job is in the workflow, and exactly what to do next.
function WorkflowGuide({ booking: b, visits, measurement: m, latest, onJump }) {
  const visitDone = visits.some((v) => v.status === 'COMPLETED');
  const sentStates = ['SENT_TO_CUSTOMER', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED'];
  const projectStates = ['PROJECT_STARTED', 'PROJECT_IN_PROGRESS', 'PROJECT_COMPLETED'];
  const steps = [
    { key: 'assign', label: 'Assign contractor', done: Boolean(b.assignedContractor), how: 'Pick a contractor in the Contractor box on the right and click Assign. The customer and contractor are notified.', action: ['Go to contractor', () => onJump('contractor-box')] },
    { key: 'schedule', label: 'Schedule site visit', done: visits.some((v) => ['SCHEDULED', 'COMPLETED'].includes(v.status)), how: 'In Site visits click Schedule visit, choose date & time. The customer gets the visit details.', action: ['Go to site visits', () => onJump('site-visits')] },
    { key: 'visit', label: 'Complete site visit', done: visitDone, how: 'After visiting the home click Complete, choose the site condition and upload photos.', action: ['Go to site visits', () => onJump('site-visits')] },
    { key: 'measure', label: 'Finalise measurements', done: m?.status === 'FINAL', how: 'Open the measurement sheet, add each room and its measurements, then click Save and finalise.', action: ['Open measurement sheet', `/admin/bookings/${b.id}/measurements`] },
    { key: 'quote', label: 'Create quotation', done: Boolean(latest), how: 'Click Create quotation. In the editor use “Add from measurements” to get every room and size, then enter rates (material + labour) and Save.', action: ['Go to quotations', () => onJump('quotations')] },
    { key: 'submit', label: 'Submit for admin review', done: Boolean(latest && latest.status !== 'DRAFT'), how: 'When all items have rates, the contractor (or an admin) clicks Submit for admin review in the quotation editor.', action: latest ? ['Open quotation', `/admin/quotations/${latest.id}`] : null },
    { key: 'send', label: 'Approve & send to customer', done: Boolean(latest && sentStates.includes(latest.status)), how: 'Admin checks every price, edits if needed (a reason is required), adds discounts or payment schedule, previews the PDF, then clicks Approve & send. The customer gets WhatsApp + dashboard notification with the PDF.', action: latest ? ['Open quotation', `/admin/quotations/${latest.id}`] : null },
    { key: 'accept', label: 'Customer accepts', done: Boolean(latest && latest.status === 'ACCEPTED') || projectStates.includes(b.status), how: latest?.status === 'REVISION_REQUESTED' ? 'The customer asked for changes. Open the quotation and click Create revision, update it, then Approve & send again.' : latest?.status === 'REJECTED' ? 'The customer declined. Call them; if they want changes, Create revision and send again.' : 'Waiting for the customer to accept, request a revision or decline from their dashboard.', action: latest ? ['Open quotation', `/admin/quotations/${latest.id}`] : null },
    { key: 'project', label: 'Start project', done: projectStates.includes(b.status), how: 'A project is created automatically on acceptance. Open Projects → Start project, then move it through the stages.', action: ['Open projects', '/admin/projects'] },
  ];
  if (b.status === 'CANCELLED') return null;
  const next = steps.find((x) => !x.done);
  return (
    <section className="border-2 border-wine bg-paper" aria-labelledby="wf-title">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-wine px-5 py-3 text-paper">
        <h2 id="wf-title" className="text-base">Workflow</h2>
        <span className="text-sm font-semibold">{steps.filter((x) => x.done).length} of {steps.length} done</span>
      </div>
      <ol className="grid grid-cols-3 gap-px bg-stone-deep sm:grid-cols-9">
        {steps.map((x, i) => (
          <li key={x.key} className={`flex flex-col gap-1 bg-paper px-2.5 py-2 text-xs ${next?.key === x.key ? 'bg-blush font-semibold text-wine' : x.done ? 'text-charcoal' : 'text-graphite'}`}>
            {x.done ? <CheckCircle2 className="size-4 text-success" aria-label="Done" /> : <Circle className={`size-4 ${next?.key === x.key ? 'text-wine' : 'text-stone-deep'}`} aria-label={next?.key === x.key ? 'Next' : 'To do'} />}
            <span>{i + 1}. {x.label}</span>
          </li>
        ))}
      </ol>
      {next ? (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="max-w-2xl"><p className="font-semibold">Next: {next.label}</p><p className="mt-1 text-sm text-graphite">{next.how}</p></div>
          {next.action && (typeof next.action[1] === 'string'
            ? <Button size="sm" href={next.action[1]}>{next.action[0]}<ArrowRight className="size-4" /></Button>
            : <Button size="sm" onClick={next.action[1]}>{next.action[0]}<ArrowRight className="size-4" /></Button>)}
        </div>
      ) : <p className="px-5 py-4 text-sm font-semibold text-success">All steps complete.</p>}
    </section>
  );
}

export function BookingDetail({ id }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const ref = useRefData();
  const { data, error, loading, reload } = useApi(`/admin/bookings/${id}`);
  const versions = useApi(can(user, 'quotations.view') ? `/quotations/booking/${id}` : null);
  const measurement = useApi(can(user, 'site_visit.view') ? `/measurements/booking/${id}` : null);
  const visitsList = useApi(can(user, 'site_visit.view') ? `/site-visits?bookingId=${id}` : null);
  const [msg, setMsg] = useState(null);
  const [creating, setCreating] = useState(false);
  if (loading && !data) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  const { booking: b, estimate, activity, budget } = data;
  const jump = (anchor) => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const refreshAll = () => { reload(); versions.reload(); measurement.reload(); visitsList.reload(); };
  const l = b.labels || {};
  const latest = versions.data?.items?.find((q) => q.isLatest);
  const m = measurement.data?.measurement;
  const sel = estimate?.results?.find((r) => r.package === estimate.selectedPackage);

  const setStatus = async (status) => {
    const note = window.prompt(status === 'CANCELLED' ? 'Cancellation reason (required)' : 'Note (optional)');
    if (note === null || (status === 'CANCELLED' && !note.trim())) return;
    try { await api(`/admin/bookings/${id}/status`, { method: 'PATCH', body: { status, note: note || undefined } }); reload(); } catch (x) { setMsg({ tone: 'error', text: x.message }); }
  };
  const createQuotation = async () => {
    setCreating(true); setMsg(null);
    try { const r = await api('/quotations', { method: 'POST', body: { bookingId: id, sections: [] } }); router.push(`/admin/quotations/${r.data.quotation.id}`); } catch (x) {
      if (x.details?.id) router.push(`/admin/quotations/${x.details.id}`); else setMsg({ tone: 'error', text: x.message });
      setCreating(false);
    }
  };

  return (
    <>
      <Header title={`${b.bookingNumber} — ${b.customerName}`} subtitle={`Submitted ${fmtDateTime(b.createdAt)}`} back={['/admin/bookings', 'Bookings']}>
        <Pill value={b.status} />
        {can(user, 'leads.view') && <Button size="sm" variant="ghost" href={`/admin/leads/${b.leadId}`}>Lead</Button>}
        {can(user, 'bookings.edit') && user.role !== 'CONTRACTOR' && (b.status === 'CANCELLED'
          ? <Button size="sm" variant="secondary" onClick={() => setStatus('CONFIRMED')}>Reopen booking</Button>
          : <Button size="sm" variant="ghost" onClick={() => setStatus('CANCELLED')}>Cancel booking</Button>)}
      </Header>
      {msg && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      <div className="mb-6"><WorkflowGuide booking={b} visits={visitsList.data?.items || []} measurement={m} latest={latest} onJump={jump} /></div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {budget && <BudgetCard budget={budget} title={budget.source === 'AUTO_BOOKING' ? 'Indicative budget (auto, from booking answers)' : 'Indicative budget (customer estimate)'} showPackages />}
          <Box title="Customer & property">
            <KV rows={[
              ['Mobile', <a key="m" href={`tel:+91${b.mobile}`} className="underline">+91 {b.mobile}</a>],
              ['Address', [b.address?.formattedAddress, b.address?.pincode].filter(Boolean).join(', ')],
              ['Requirement', l.requirementType], ['Home type', l.propertyType], ['Configuration', l.bhk], ['Project type', l.projectType],
              ['Budget', l.budgetRange], ['Possession', l.possession], ['Services', b.services.join(', ')],
              ['Package (indicative)', b.package?.name || sel?.packageName],
              ['Measurement assistance', b.floorPlan.measurementAssistance?.opted ? `Yes, ${inr(b.floorPlan.measurementAssistance.charge)}` : 'No'],
              b.cancelReason && ['Cancel reason', b.cancelReason],
            ]} />
            {b.floorPlans?.length > 0 && (
              <div className="mt-4 border-t border-stone pt-4">
                <p className="mb-2 text-xs font-medium text-graphite">Customer floor plans</p>
                <ul className="flex flex-wrap gap-2">
                  {b.floorPlans.map((f) => (
                    <li key={f.id}><a href={f.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-none border border-stone px-3 py-2 text-sm hover:border-wine"><FileText className="size-4" />{f.originalName}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </Box>

          <div id="site-visits"><SiteVisitPanel booking={b} onChange={refreshAll} /></div>

          {can(user, 'site_visit.view') && (
            <Box title="Measurements" action={<Button size="sm" variant={m ? 'secondary' : 'primary'} href={`/admin/bookings/${id}/measurements`}>{m ? 'Open sheet' : 'Record measurements'}</Button>}>
              {m ? <p className="text-sm">{m.rooms.length} room(s), {m.rooms.reduce((s, r) => s + r.rows.length, 0)} measurement(s). <Pill value={m.status === 'FINAL' ? 'COMPLETED' : 'DRAFT'}>{m.status === 'FINAL' ? 'Final' : 'Draft'}</Pill></p>
                : <p className="text-sm text-graphite">Not recorded yet. Measurements are required before a quotation can be created.</p>}
            </Box>
          )}

          {can(user, 'quotations.view') && (
            <div id="quotations"><Box title="Quotations" action={!latest && can(user, 'quotations.create') && <Button size="sm" loading={creating} onClick={createQuotation} disabled={m?.status !== 'FINAL'}>Create quotation</Button>}>
              {versions.data?.items?.length ? (
                <ul className="divide-y divide-stone text-sm">
                  {versions.data.items.map((q) => (
                    <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <a href={`/admin/quotations/${q.id}`} className="font-medium underline-offset-4 hover:underline">{q.displayNumber}</a>
                      <span className="flex items-center gap-3"><span className="tabular">{inr(q.grandTotal)}</span><Pill value={q.isLatest ? q.status : 'SUPERSEDED'} tone={q.isLatest ? undefined : 'outline'} /></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-graphite">{m?.status === 'FINAL' ? 'No quotation yet. Click Create quotation, then use “Add from measurements” in the editor.' : 'Finalise measurements to create a quotation.'}</p>}
            </Box></div>
          )}

          <Notes type="bookings" id={id} />
          <Box title="Activity"><Activity items={activity} /></Box>
        </div>
        <div className="space-y-6">
          {can(user, 'bookings.assign') && user.role !== 'CONTRACTOR' && (
            <div id="contractor-box"><Box title="Contractor">
              <AssignContractor endpoint={`/admin/bookings/${id}/assign-contractor`} contractors={ref.contractors} current={b.assignedContractor?.name} onDone={refreshAll} />
              {b.assignmentHistory?.length > 1 && (
                <details className="mt-3 text-xs text-graphite"><summary className="cursor-pointer">Assignment history</summary>
                  <ul className="mt-2 space-y-1">{b.assignmentHistory.map((h, i) => <li key={i}>{h.contractor} — {fmtDateTime(h.assignedAt)} by {h.assignedBy}{h.unassignedAt ? `, until ${fmtDate(h.unassignedAt)}` : ''}</li>)}</ul>
                </details>
              )}
            </Box></div>
          )}
          <Box title="Timeline">
            <ol className="space-y-3 text-sm">
              {b.timeline.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${t.visibleToCustomer ? 'bg-wine' : 'bg-stone-deep'}`} aria-hidden="true" />
                  <div><p>{t.label}{!t.visibleToCustomer && <span className="text-xs text-graphite"> (internal)</span>}</p><p className="text-xs text-graphite">{fmtDateTime(t.at)}</p></div>
                </li>
              ))}
            </ol>
          </Box>
        </div>
      </div>
    </>
  );
}
