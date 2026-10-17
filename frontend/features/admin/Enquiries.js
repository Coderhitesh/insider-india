'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Drawer from '@/components/admin/Drawer';
import { Header, DataTable, Pill, KV, Stat } from '@/components/admin/Kit';
import Filters from '@/components/admin/Filters';
import { Guard } from '@/components/admin/AdminShell';
import { useList } from '@/components/admin/useList';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { can, fmtDateTime } from '@/lib/admin';

const TOPIC = {
  GENERAL: 'General', NEW_PROJECT: 'New project', COMMERCIAL: 'Commercial space', EXISTING_PROJECT: 'Ongoing project',
  PARTNERSHIP: 'Vendor / partnership', CAREERS: 'Careers', FEEDBACK: 'Feedback / complaint', OTHER: 'Other',
};
const STATUS = { NEW: ['New', 'amber'], IN_PROGRESS: ['In progress', 'grey'], RESOLVED: ['Resolved', 'green'], SPAM: ['Spam', 'outline'] };
const CONTACT = { CALL: 'Phone call', WHATSAPP: 'WhatsApp', EMAIL: 'Email' };
const StatusPill = ({ s }) => <Pill tone={STATUS[s]?.[1]}>{STATUS[s]?.[0] || s}</Pill>;

export default function Enquiries() {
  const user = useAuth((s) => s.user);
  const sp = useSearchParams();
  const list = useList('/admin/enquiries', { limit: '25' });
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const manage = can(user, 'enquiries.manage');
  const counts = list.data?.counts || {};

  // Opened from a notification link (?open=<id>).
  useEffect(() => {
    const id = sp.get('open');
    if (id) api(`/admin/enquiries/${id}`).then((r) => setOpen(r.data.enquiry)).catch(() => {});
  }, [sp]);

  const update = async (body, ok) => {
    setBusy(true); setMsg(null);
    try { const r = await api(`/admin/enquiries/${open.id}`, { method: 'PATCH', body }); setOpen(r.data.enquiry); setNote(''); setMsg({ tone: 'success', text: ok }); list.reload(); } catch (x) { setMsg({ tone: 'error', text: x.message }); } finally { setBusy(false); }
  };

  return (
    <Guard perm="enquiries.view">
      <Header title="Enquiries" subtitle="Messages from the website Contact page" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(STATUS).map(([k, [l]]) => (
          <button key={k} type="button" className="text-left" onClick={() => list.setParams({ status: list.params.status === k ? '' : k })}><Stat label={l} value={counts[k] || 0} /></button>
        ))}
      </div>
      <Filters params={list.params} setParams={list.setParams} placeholder="Name, mobile, email or message"
        filters={[{ name: 'status', label: 'Status', options: Object.entries(STATUS).map(([k, [l]]) => [k, l]) }, { name: 'topic', label: 'Topic', options: Object.entries(TOPIC) }]} />
      <DataTable tableId="enquiries" {...list} rows={list.rows} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        empty="No enquiries yet."
        columns={[
          { key: 'enquiryNumber', label: 'Enquiry', render: (r) => <><span className="block">{r.enquiryNumber}</span><span className="text-xs text-graphite">{fmtDateTime(r.createdAt)}</span></> },
          { key: 'name', label: 'From', render: (r) => <><span className="block">{r.name}</span><span className="text-xs text-graphite">+91 {r.mobile}{r.city ? ` · ${r.city}` : ''}</span></> },
          { key: 'topic', label: 'Topic', render: (r) => TOPIC[r.topic] || r.topic },
          { key: 'message', label: 'Message', render: (r) => <span className="line-clamp-2 max-w-md">{r.message}</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusPill s={r.status} /> },
          { key: '_open', label: '', render: (r) => <Button size="sm" variant="ghost" onClick={() => { setMsg(null); setNote(''); setOpen(r); }}>Open</Button> },
        ]} />

      <Drawer open={Boolean(open)} onClose={() => setOpen(null)} title={open ? `${open.enquiryNumber} — ${open.name}` : ''} width="max-w-xl"
        footer={<Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>}>
        {open && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2"><StatusPill s={open.status} /><span className="text-sm text-graphite">{TOPIC[open.topic]}</span></div>
            <KV rows={[
              ['Mobile', <a key="m" className="text-wine underline" href={`tel:+91${open.mobile}`}>+91 {open.mobile}</a>],
              ['WhatsApp', <a key="w" className="text-wine underline" href={`https://wa.me/91${open.mobile}`} target="_blank" rel="noopener noreferrer">Open chat</a>],
              ['Email', open.email ? <a key="e" className="text-wine underline" href={`mailto:${open.email}`}>{open.email}</a> : null],
              ['City', open.city], ['Prefers', CONTACT[open.preferredContact]], ['Received', fmtDateTime(open.createdAt)],
              open.utm?.source && ['Campaign', [open.utm.source, open.utm.campaign].filter(Boolean).join(' / ')],
            ]} />
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-graphite">Message</p>
            <p className="mt-1 whitespace-pre-wrap border border-stone bg-paper p-3 text-sm">{open.message}</p>
            {manage && (
              <div className="mt-5 flex flex-wrap gap-2">
                {open.status !== 'IN_PROGRESS' && open.status !== 'RESOLVED' && <Button size="sm" variant="secondary" loading={busy} onClick={() => update({ status: 'IN_PROGRESS' }, 'Marked in progress')}>Mark in progress</Button>}
                {open.status !== 'RESOLVED' && <Button size="sm" loading={busy} onClick={() => update({ status: 'RESOLVED', note: note || undefined }, 'Marked resolved')}>Mark resolved</Button>}
                {open.status === 'RESOLVED' && <Button size="sm" variant="secondary" loading={busy} onClick={() => update({ status: 'IN_PROGRESS' }, 'Reopened')}>Reopen</Button>}
                {open.status !== 'SPAM' && <Button size="sm" variant="ghost" loading={busy} onClick={() => update({ status: 'SPAM' }, 'Marked as spam')}>Spam</Button>}
              </div>
            )}
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-graphite">Notes</p>
            {open.notes.length ? (
              <ul className="mt-2 space-y-2 text-sm">{[...open.notes].reverse().map((n, i) => <li key={i} className="border-l-2 border-stone pl-3"><p>{n.text}</p><p className="text-xs text-graphite">{n.by} · {fmtDateTime(n.at)}</p></li>)}</ul>
            ) : <p className="mt-2 text-sm text-graphite">No notes yet.</p>}
            {manage && (
              <div className="mt-3 flex gap-2">
                <input aria-label="Add a note" className="h-10 flex-1 border border-stone-deep bg-paper px-3 text-sm" placeholder="e.g. Called, will visit showroom Saturday" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button size="sm" className="h-10" disabled={!note.trim()} loading={busy} onClick={() => update({ note: note.trim() }, 'Note added')}>Add note</Button>
              </div>
            )}
            {msg && <Notice tone={msg.tone} className="mt-3">{msg.text}</Notice>}
          </>
        )}
      </Drawer>
    </Guard>
  );
}
