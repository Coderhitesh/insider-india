'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Drawer from '@/components/admin/Drawer';
import MediaUploader from '@/components/admin/MediaUploader';
import { Box, Pill, Header, DataTable } from '@/components/admin/Kit';
import { Fields } from '@/components/admin/Form';
import Filters from '@/components/admin/Filters';
import { useList } from '@/components/admin/useList';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can, fmtDateTime } from '@/lib/admin';

const CONDITIONS = [['BARE_SHELL', 'Bare shell'], ['SEMI_FURNISHED', 'Semi-furnished'], ['FURNISHED', 'Furnished'], ['UNDER_CONSTRUCTION', 'Under construction'], ['RENOVATION_REQUIRED', 'Renovation required'], ['OTHER', 'Other']];
const IMG = 'image/jpeg,image/png,image/webp';

function CompleteForm({ visit, onDone }) {
  const [f, setF] = useState({ siteCondition: '', siteConditionNotes: '', notes: visit.notes || '' });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    if (!f.siteCondition) return setErr('Select the site condition.');
    setBusy(true); setErr('');
    try {
      await api(`/site-visits/${visit.id}/complete`, { method: 'POST', body: { ...f, images: images.map((m) => m.id), videos: videos.map((m) => m.id), documents: docs.map((m) => m.id), floorPlans: plans.map((m) => m.id) } });
      onDone();
    } catch (x) { setErr(x.message); setBusy(false); }
    return undefined;
  };
  return (
    <div className="space-y-5">
      <Fields value={f} onChange={setF} fields={[
        { name: 'siteCondition', label: 'Site condition', type: 'select', options: CONDITIONS.map(([value, label]) => ({ value, label })) },
        { name: 'siteConditionNotes', label: 'Condition notes' },
        { name: 'notes', label: 'Visit notes', type: 'textarea' },
      ]} />
      <div><p className="mb-1 text-xs font-medium text-graphite">Site photos</p><MediaUploader purpose="SITE_IMAGE" accept={IMG} value={images} onChange={setImages} label="Add photos" /></div>
      <div><p className="mb-1 text-xs font-medium text-graphite">Floor plan / sketches</p><MediaUploader purpose="SITE_DOCUMENT" accept={`application/pdf,${IMG}`} value={plans} onChange={setPlans} label="Add floor plan" /></div>
      <div><p className="mb-1 text-xs font-medium text-graphite">Site documents</p><MediaUploader purpose="SITE_DOCUMENT" accept={`application/pdf,${IMG}`} value={docs} onChange={setDocs} label="Add documents" /></div>
      <div><p className="mb-1 text-xs font-medium text-graphite">Videos (if enabled in settings)</p><MediaUploader purpose="SITE_VIDEO" accept="video/mp4,video/webm,video/quicktime" value={videos} onChange={setVideos} label="Add videos" max={5} /></div>
      {err && <Notice tone="error">{err}</Notice>}
      <Button onClick={submit} loading={busy}>Mark visit complete</Button>
    </div>
  );
}

// Used on the booking page.
export function SiteVisitPanel({ booking, onChange }) {
  const user = useAuth((s) => s.user);
  const { data, reload } = useApi(`/site-visits?bookingId=${booking.id}`);
  const [schedule, setSchedule] = useState(null);
  const [complete, setComplete] = useState(null);
  const [msg, setMsg] = useState(null);
  const manage = can(user, 'site_visit.manage');
  const visits = data?.items || [];
  const open = visits.find((v) => v.status === 'SCHEDULED');
  const refresh = () => { reload(); onChange?.(); };

  const saveSchedule = async () => {
    setMsg(null);
    try {
      if (schedule.id) await api(`/site-visits/${schedule.id}`, { method: 'PATCH', body: { scheduledAt: schedule.scheduledAt, contactPerson: schedule.contactPerson, notes: schedule.notes, reason: schedule.reason } });
      else await api('/site-visits', { method: 'POST', body: { bookingId: booking.id, scheduledAt: schedule.scheduledAt, contactPerson: schedule.contactPerson, notes: schedule.notes } });
      setSchedule(null); refresh();
    } catch (x) { setMsg({ tone: 'error', text: x.message }); }
  };
  const cancel = async (v) => {
    const reason = window.prompt('Reason for cancelling this visit?');
    if (!reason) return;
    try { await api(`/site-visits/${v.id}/cancel`, { method: 'POST', body: { reason } }); refresh(); } catch (x) { setMsg({ tone: 'error', text: x.message }); }
  };

  return (
    <Box title="Site visits" action={manage && booking.assignedContractor && !open && <Button size="sm" onClick={() => setSchedule({ scheduledAt: '', contactPerson: { name: booking.customerName, mobile: booking.mobile }, notes: '' })}>Schedule visit</Button>}>
      {!booking.assignedContractor && <p className="text-sm text-graphite">Assign a contractor before scheduling a visit.</p>}
      {msg && <Notice tone={msg.tone} className="mb-3">{msg.text}</Notice>}
      {visits.length ? (
        <ul className="divide-y divide-stone">
          {visits.map((v) => (
            <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{fmtDateTime(v.scheduledAt)} <Pill value={v.status} /></p>
                <p className="text-graphite">{v.contactPerson?.name}{v.contactPerson?.mobile ? `, +91 ${v.contactPerson.mobile}` : ''}{v.rescheduleCount ? `, rescheduled ${v.rescheduleCount}×` : ''}</p>
                {v.siteCondition && <p className="text-graphite">Condition: {CONDITIONS.find(([k]) => k === v.siteCondition)?.[1]}{v.mediaCount ? `, ${v.mediaCount} file(s)` : ''}</p>}
                {v.cancelReason && <p className="text-graphite">Cancelled: {v.cancelReason}</p>}
              </div>
              {manage && v.status === 'SCHEDULED' && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => setComplete(v)}>Complete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSchedule({ id: v.id, scheduledAt: v.scheduledAt, contactPerson: v.contactPerson, notes: v.notes || '', reason: '' })}>Reschedule</Button>
                  <Button size="sm" variant="ghost" onClick={() => cancel(v)}>Cancel</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : booking.assignedContractor ? <p className="text-sm text-graphite">No visits yet.</p> : null}

      <Drawer open={Boolean(schedule)} onClose={() => setSchedule(null)} title={schedule?.id ? 'Reschedule visit' : 'Schedule site visit'}
        footer={<><Button variant="ghost" onClick={() => setSchedule(null)}>Cancel</Button><Button onClick={saveSchedule} disabled={!schedule?.scheduledAt}>Save and notify customer</Button></>}>
        {schedule && <Fields value={schedule} onChange={setSchedule} fields={[
          { name: 'scheduledAt', label: 'Date and time', type: 'datetime' },
          { name: 'contactPerson.name', label: 'Contact person' },
          { name: 'contactPerson.mobile', label: 'Contact mobile', type: 'tel' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
          ...(schedule.id ? [{ name: 'reason', label: 'Reason for rescheduling' }] : []),
        ]} />}
        {msg && <Notice tone={msg.tone} className="mt-4">{msg.text}</Notice>}
      </Drawer>
      <Drawer open={Boolean(complete)} onClose={() => setComplete(null)} title="Complete site visit">
        {complete && <CompleteForm visit={complete} onDone={() => { setComplete(null); refresh(); }} />}
      </Drawer>
    </Box>
  );
}

export function SiteVisitsList() {
  const list = useList('/site-visits', { upcoming: 'true', limit: '50' });
  return (
    <>
      <Header title="Site visits" subtitle="Scheduled and completed visits" />
      <Filters params={list.params} setParams={list.setParams} search={false} filters={[
        { name: 'upcoming', label: 'Show', options: [['true', 'Upcoming only']] },
        { name: 'status', label: 'Status', options: [['SCHEDULED', 'Scheduled'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']] },
        { name: 'range' },
      ]} />
      <DataTable tableId="visits" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        rowHref={(r) => `/admin/bookings/${r.bookingId}`} empty="No visits."
        columns={[
          { key: 'scheduledAt', label: 'When', render: (r) => fmtDateTime(r.scheduledAt) },
          { key: 'bookingNumber', label: 'Booking' },
          { key: 'customerName', label: 'Customer' },
          { key: 'contractor', label: 'Contractor', render: (r) => r.contractor?.name || '—' },
          { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> },
          { key: 'address', label: 'Contact', render: (r) => r.contactPerson?.mobile ? `+91 ${r.contactPerson.mobile}` : '—' },
        ]} />
    </>
  );
}
