'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
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

export function BookingDetail({ id }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const ref = useRefData();
  const { data, error, loading, reload } = useApi(`/admin/bookings/${id}`);
  const versions = useApi(can(user, 'quotations.view') ? `/quotations/booking/${id}` : null);
  const measurement = useApi(can(user, 'site_visit.view') ? `/measurements/booking/${id}` : null);
  const [msg, setMsg] = useState(null);
  const [creating, setCreating] = useState(false);
  if (loading && !data) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  const { booking: b, estimate, activity } = data;
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
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Box title="Customer & property">
            <KV rows={[
              ['Mobile', <a key="m" href={`tel:+91${b.mobile}`} className="underline">+91 {b.mobile}</a>],
              ['Address', [b.address?.formattedAddress, b.address?.pincode].filter(Boolean).join(', ')],
              ['Requirement', l.requirementType], ['Home type', l.propertyType], ['Configuration', l.bhk], ['Project type', l.projectType],
              ['Budget', l.budgetRange], ['Possession', l.possession], ['Services', b.services.join(', ')],
              ['Package', b.package?.name || sel?.packageName], ['Estimate', sel?.available ? `${inr(sel.finalMin)} – ${inr(sel.finalMax)}` : null],
              ['Measurement assistance', b.floorPlan.measurementAssistance?.opted ? `Yes, ${inr(b.floorPlan.measurementAssistance.charge)}` : 'No'],
              b.cancelReason && ['Cancel reason', b.cancelReason],
            ]} />
            {b.floorPlans?.length > 0 && (
              <div className="mt-4 border-t border-stone pt-4">
                <p className="mb-2 text-xs font-medium text-graphite">Customer floor plans</p>
                <ul className="flex flex-wrap gap-2">
                  {b.floorPlans.map((f) => (
                    <li key={f.id}><a href={f.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-[3px] border border-stone px-3 py-2 text-sm hover:border-charcoal"><FileText className="size-4" />{f.originalName}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </Box>

          <SiteVisitPanel booking={b} onChange={reload} />

          {can(user, 'site_visit.view') && (
            <Box title="Measurements" action={<Button size="sm" variant={m ? 'secondary' : 'primary'} href={`/admin/bookings/${id}/measurements`}>{m ? 'Open sheet' : 'Record measurements'}</Button>}>
              {m ? <p className="text-sm">{m.rooms.length} room(s), {m.rooms.reduce((s, r) => s + r.rows.length, 0)} measurement(s). <Pill value={m.status === 'FINAL' ? 'COMPLETED' : 'DRAFT'}>{m.status === 'FINAL' ? 'Final' : 'Draft'}</Pill></p>
                : <p className="text-sm text-graphite">Not recorded yet. Measurements are required before a quotation can be created.</p>}
            </Box>
          )}

          {can(user, 'quotations.view') && (
            <Box title="Quotations" action={!latest && can(user, 'quotations.create') && <Button size="sm" loading={creating} onClick={createQuotation} disabled={m?.status !== 'FINAL'}>Create quotation</Button>}>
              {versions.data?.items?.length ? (
                <ul className="divide-y divide-stone text-sm">
                  {versions.data.items.map((q) => (
                    <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <a href={`/admin/quotations/${q.id}`} className="font-medium underline-offset-4 hover:underline">{q.displayNumber}</a>
                      <span className="flex items-center gap-3"><span className="tabular">{inr(q.grandTotal)}</span><Pill value={q.isLatest ? q.status : 'SUPERSEDED'} tone={q.isLatest ? undefined : 'outline'} /></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-graphite">{m?.status === 'FINAL' ? 'No quotation yet.' : 'Finalise measurements to create a quotation.'}</p>}
            </Box>
          )}

          <Notes type="bookings" id={id} />
          <Box title="Activity"><Activity items={activity} /></Box>
        </div>
        <div className="space-y-6">
          {can(user, 'bookings.assign') && user.role !== 'CONTRACTOR' && (
            <Box title="Contractor">
              <AssignContractor endpoint={`/admin/bookings/${id}/assign-contractor`} contractors={ref.contractors} current={b.assignedContractor?.name} onDone={reload} />
              {b.assignmentHistory?.length > 1 && (
                <details className="mt-3 text-xs text-graphite"><summary className="cursor-pointer">Assignment history</summary>
                  <ul className="mt-2 space-y-1">{b.assignmentHistory.map((h, i) => <li key={i}>{h.contractor} — {fmtDateTime(h.assignedAt)} by {h.assignedBy}{h.unassignedAt ? `, until ${fmtDate(h.unassignedAt)}` : ''}</li>)}</ul>
                </details>
              )}
            </Box>
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
