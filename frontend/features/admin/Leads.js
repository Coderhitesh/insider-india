'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Header, DataTable, Pill, Box, KV, Loader, Failed } from '@/components/admin/Kit';
import Filters from '@/components/admin/Filters';
import { useList } from '@/components/admin/useList';
import { useRefData, opt, LEAD_STATUSES, nice } from '@/components/admin/refData';
import { Activity, Notes, AssignContractor } from '@/components/admin/Shared';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can, downloadCsv, fmtDate, fmtDateTime, inr } from '@/lib/admin';

export function LeadsList() {
  const user = useAuth((s) => s.user);
  const ref = useRefData();
  const list = useList('/admin/leads', { limit: '25' });
  const [selected, setSelected] = useState(new Set());
  const [bulk, setBulk] = useState({ cid: '', busy: false, msg: null });
  const o = ref.options;
  const filters = [
    { name: 'status', label: 'Status', options: LEAD_STATUSES.map((s) => [s, nice(s)]) },
    { name: 'flow', label: 'Source', options: [['BOOKING', 'Booking funnel'], ['ESTIMATE', 'Estimate']] },
    { name: 'range' },
    { name: 'city', label: 'City', options: opt(o?.cities) },
    { name: 'bhk', label: 'BHK', options: opt(o?.bhkOptions) },
    { name: 'budget', label: 'Budget', options: opt(o?.budgetRanges) },
    { name: 'service', label: 'Service', options: ref.services.map((s) => [s.id, s.title]) },
    { name: 'package', label: 'Package', options: ref.packages.map((p) => [p.id, p.name]) },
    ...(user.role !== 'CONTRACTOR' ? [{ name: 'contractor', label: 'Contractor', options: [['unassigned', 'Unassigned'], ...ref.contractors.map((c) => [c.id, c.name])] }] : []),
    { name: 'verified', label: 'Verified', options: [['true', 'Verified'], ['false', 'Not verified']] },
    { name: 'abandoned', label: 'Abandoned', options: [['true', 'Abandoned only']] },
  ];
  const canAssign = can(user, 'leads.assign') && user.role !== 'CONTRACTOR';

  const bulkAssign = async () => {
    setBulk((b) => ({ ...b, busy: true, msg: null }));
    let ok = 0; const fails = [];
    for (const id of selected) {
      try { await api(`/admin/leads/${id}/assign-contractor`, { method: 'POST', body: { contractorId: bulk.cid, remarks: 'Bulk assignment' } }); ok += 1; } catch (e) { fails.push(e.message); }
    }
    setBulk({ cid: '', busy: false, msg: { tone: fails.length ? 'error' : 'success', text: `${ok} assigned${fails.length ? `, ${fails.length} failed (${[...new Set(fails)].join('; ')})` : ''}` } });
    setSelected(new Set());
    list.reload();
  };

  return (
    <>
      <Header title="Leads" subtitle="Every submitted or partially submitted funnel" />
      <Filters params={list.params} setParams={list.setParams} filters={filters} placeholder="Name, mobile or lead ID" />
      {canAssign && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[3px] border border-wine/30 bg-wine-tint px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <select aria-label="Contractor for selected" className="h-8 rounded-[3px] border border-stone-deep bg-paper px-2" value={bulk.cid} onChange={(e) => setBulk({ ...bulk, cid: e.target.value })}>
            <option value="">Assign to…</option>{ref.contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button size="sm" disabled={!bulk.cid} loading={bulk.busy} onClick={bulkAssign}>Assign</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </div>
      )}
      {bulk.msg && <Notice tone={bulk.msg.tone} className="mb-3">{bulk.msg.text}</Notice>}
      <DataTable tableId="leads" {...list} rows={list.rows} retry={list.reload}
        selectable={canAssign} selected={selected} onSelect={setSelected}
        sort={list.params.sort || '-createdAt'} onSort={(s) => list.setParams({ sort: s })} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        onExport={can(user, 'leads.view') ? () => downloadCsv(`/admin/leads${list.exportQuery}`, 'leads.csv').catch((e) => alert(e.message)) : undefined}
        rowHref={(r) => `/admin/leads/${r.id}`} empty="No leads match these filters."
        columns={[
          { key: 'leadNumber', label: 'Lead', render: (r) => r.leadNumber },
          { key: 'name', label: 'Name', sortKey: 'name', render: (r) => <><span className="block">{r.name}</span><span className="text-xs text-graphite">+91 {r.mobile}</span></> },
          { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> },
          { key: 'progress', label: 'Progress', render: (r) => (r.abandonedAt ? <span className="text-error">{r.abandonedAt}</span> : r.progress || (r.bookingId ? 'Booked' : '—')) },
          { key: 'flow', label: 'Source', render: (r) => (r.flow === 'ESTIMATE' ? 'Estimate' : 'Booking') },
          { key: 'city', label: 'City' },
          { key: 'bhk', label: 'BHK' },
          { key: 'budget', label: 'Budget' },
          { key: 'requirement', label: 'Requirement', defaultHidden: true },
          { key: 'services', label: 'Services', defaultHidden: true, render: (r) => r.services.join(', ') || '—' },
          { key: 'contractor', label: 'Contractor', render: (r) => r.assignedContractor?.name || <span className="text-graphite">Unassigned</span> },
          { key: 'utm', label: 'Campaign', defaultHidden: true, render: (r) => [r.utm?.source, r.utm?.campaign].filter(Boolean).join(' / ') || '—' },
          { key: 'createdAt', label: 'Created', sortKey: 'createdAt', render: (r) => fmtDate(r.createdAt) },
          { key: 'lastActivityAt', label: 'Last activity', sortKey: 'lastActivityAt', render: (r) => fmtDateTime(r.lastActivityAt) },
        ]} />
    </>
  );
}

const MANUAL_STATUSES = ['NEW', 'IN_PROGRESS', 'VERIFIED', 'QUALIFIED', 'LOST', 'CANCELLED', 'WON'];

export function LeadDetail({ id }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const ref = useRefData();
  const { data, error, loading, reload } = useApi(`/admin/leads/${id}`);
  const [status, setStatus] = useState({ value: '', reason: '', busy: false, msg: null });
  if (loading && !data) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  const { lead: l, estimate, booking, activity } = data;
  const sel = estimate?.results?.find((r) => r.package === estimate.selectedPackage);

  const saveStatus = async (e) => {
    e.preventDefault();
    setStatus((s) => ({ ...s, busy: true, msg: null }));
    try {
      await api(`/admin/leads/${id}`, { method: 'PATCH', body: { status: status.value, reason: status.reason || undefined, ...(status.value === 'LOST' ? { lostReason: status.reason } : {}) } });
      setStatus({ value: '', reason: '', busy: false, msg: { tone: 'success', text: 'Status updated' } });
      reload();
    } catch (x) { setStatus((s) => ({ ...s, busy: false, msg: { tone: 'error', text: x.message } })); }
  };
  const remove = async () => {
    const reason = window.prompt('Reason for deleting this lead?');
    if (reason === null) return;
    try { await api(`/admin/leads/${id}`, { method: 'DELETE', body: { reason } }); router.replace('/admin/leads'); } catch (x) { alert(x.message); }
  };

  return (
    <>
      <Header title={`${l.leadNumber} — ${l.name}`} subtitle={`Created ${fmtDateTime(l.createdAt)}, last activity ${fmtDateTime(l.lastActivityAt)}`} back={['/admin/leads', 'Leads']}>
        <Pill value={l.status} />
        {booking && <Button size="sm" variant="secondary" href={`/admin/bookings/${booking.id}`}>Open booking {booking.bookingNumber}</Button>}
        {!booking && can(user, 'leads.delete') && <Button size="sm" variant="ghost" onClick={remove}>Delete lead</Button>}
      </Header>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Box title="Requirement">
            {l.nextStep !== 'SUBMITTED' && l.nextStep !== 'REVIEW' && <Notice className="mb-4">Funnel stopped at step {l.nextStepIndex}: {nice(l.nextStep)}</Notice>}
            <KV rows={[
              ['Mobile', `+91 ${l.mobile}${l.verified ? ' (verified)' : ''}`], ['City', l.city], ['Source', l.flow === 'ESTIMATE' ? 'Estimate calculator' : 'Booking funnel'],
              ['Requirement', l.labels.requirementType], ['Budget', l.labels.budgetRange], ['Possession', l.labels.possession],
              ['Address', [l.property.address?.formattedAddress, l.property.address?.pincode].filter(Boolean).join(', ')],
              ['Home type', l.labels.propertyType], ['Configuration', l.labels.bhk], ['Project type', l.labels.projectType],
              ['Services', l.services.map((s) => s.title).join(', ')],
              ['Floor plan', l.floorPlan.hasFloorPlan ? `${l.floorPlan.media.length} file(s)` : l.floorPlan.measurementAssistance?.opted ? `Assistance requested (${inr(l.floorPlan.measurementAssistance.charge)})` : l.floorPlan.hasFloorPlan === false ? 'None' : null],
              ['Campaign', [l.utm?.source, l.utm?.medium, l.utm?.campaign].filter(Boolean).join(' / ')], ['Landing page', l.landingPage],
              l.lostReason && ['Lost reason', l.lostReason],
            ]} />
          </Box>
          {sel && (
            <Box title={`Estimate ${estimate.estimateNumber}`}>
              <KV rows={[['Package', sel.packageName], ['Range', sel.available ? `${inr(sel.finalMin)} – ${inr(sel.finalMax)}` : 'Price on request'],
                ['Inputs', [estimate.inputs.propertyCategory, estimate.inputs.bhk, estimate.inputs.area && `${estimate.inputs.area} sq ft`].filter(Boolean).join(', ')],
                ['Add-ons', estimate.inputs.addons.join(', ')]]} />
            </Box>
          )}
          <Notes type="leads" id={id} />
          <Box title="Activity"><Activity items={activity} /></Box>
        </div>
        <div className="space-y-6">
          {can(user, 'leads.assign') && user.role !== 'CONTRACTOR' && (
            <Box title="Contractor"><AssignContractor endpoint={`/admin/leads/${id}/assign-contractor`} contractors={ref.contractors} current={l.assignedContractor?.name} onDone={reload} />
              {l.assignment && <p className="mt-3 text-xs text-graphite">Assigned by {l.assignment.assignedBy} on {fmtDateTime(l.assignment.assignedAt)}{l.assignment.remarks ? ` — ${l.assignment.remarks}` : ''}</p>}
            </Box>
          )}
          {can(user, 'leads.edit') && (
            <Box title="Status">
              <form onSubmit={saveStatus} className="space-y-2">
                <select aria-label="New status" className="w-full rounded-[3px] border border-stone-deep bg-paper px-3 py-2 text-sm" value={status.value} onChange={(e) => setStatus({ ...status, value: e.target.value })}>
                  <option value="">Change status…</option>
                  {MANUAL_STATUSES.filter((s) => s !== l.status && (!booking || !['NEW', 'IN_PROGRESS', 'VERIFIED', 'QUALIFIED'].includes(s))).map((s) => <option key={s} value={s}>{nice(s)}</option>)}
                </select>
                <input aria-label="Reason" className="w-full rounded-[3px] border border-stone-deep bg-paper px-3 py-2 text-sm" placeholder={status.value === 'LOST' ? 'Reason (required)' : 'Reason (optional)'} value={status.reason} onChange={(e) => setStatus({ ...status, reason: e.target.value })} />
                <Button size="sm" type="submit" loading={status.busy} disabled={!status.value || (status.value === 'LOST' && !status.reason)}>Update status</Button>
                {status.msg && <Notice tone={status.msg.tone}>{status.msg.text}</Notice>}
                {booking && <p className="text-xs text-graphite">Marking a booked lead lost or cancelled also cancels its booking.</p>}
              </form>
            </Box>
          )}
        </div>
      </div>
    </>
  );
}
