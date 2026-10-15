'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Box, Pill } from './Kit';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { fmtDateTime } from '@/lib/admin';
import { useAuth } from '@/store/auth';

const field = 'w-full rounded-none border border-stone-deep bg-paper px-3 py-2 text-sm focus:border-wine focus:outline-none';

export function Activity({ items }) {
  if (!items?.length) return <p className="text-sm text-graphite">No activity yet.</p>;
  return (
    <ol className="space-y-3 text-sm">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass" aria-hidden="true" />
          <div>
            <p><span className="font-medium">{a.type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>{a.message ? ` — ${a.message}` : ''}</p>
            <p className="text-xs text-graphite">{fmtDateTime(a.createdAt)}{a.actor ? ` by ${a.actor.name}` : ''}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// Internal notes on a lead or booking. Customers never see these.
export function Notes({ type, id }) {
  const user = useAuth((s) => s.user);
  const { data, reload, error } = useApi(`/admin/${type}/${id}/notes`);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState('STAFF');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr('');
    try { await api(`/admin/${type}/${id}/notes`, { method: 'POST', body: { text: text.trim(), visibility } }); setText(''); reload(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const remove = async (noteId) => { if (!window.confirm('Delete this note?')) return; try { await api(`/admin/${type}/${id}/notes/${noteId}`, { method: 'DELETE' }); reload(); } catch (x) { setErr(x.message); } };
  return (
    <Box title="Internal notes">
      <form onSubmit={add} className="space-y-2">
        <label htmlFor={`note-${id}`} className="sr-only">Add a note</label>
        <textarea id={`note-${id}`} rows={3} className={field} placeholder="Add a note for the team (not visible to the customer)" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex items-center justify-between gap-2">
          {user.role !== 'CONTRACTOR' ? (
            <select aria-label="Visibility" className="h-8 rounded-none border border-stone-deep bg-paper px-2 text-xs" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="STAFF">Visible to staff and assigned contractor</option><option value="ADMIN_ONLY">Admins only</option>
            </select>
          ) : <span />}
          <Button size="sm" type="submit" loading={busy} disabled={!text.trim()}>Add note</Button>
        </div>
      </form>
      {(err || error) && <Notice tone="error" className="mt-3">{err || error.message}</Notice>}
      <ul className="mt-4 divide-y divide-stone">
        {(data?.items || []).map((n) => (
          <li key={n.id} className="py-3 text-sm">
            <p className="whitespace-pre-line">{n.text}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-graphite">
              {n.createdBy?.name}, {fmtDateTime(n.createdAt)} {n.visibility === 'ADMIN_ONLY' && <Pill tone="outline">Admins only</Pill>}
              {n.createdBy?.id === user.id && <button type="button" className="ml-auto text-error hover:underline" onClick={() => remove(n.id)}>Delete</button>}
            </p>
          </li>
        ))}
      </ul>
    </Box>
  );
}

export function AssignContractor({ endpoint, contractors, current, onDone }) {
  const [cid, setCid] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!cid) return;
    setBusy(true); setMsg(null);
    try { const r = await api(endpoint, { method: 'POST', body: { contractorId: cid, remarks: remarks || undefined } }); setMsg({ tone: 'success', text: r.message }); setCid(''); setRemarks(''); onDone?.(); } catch (x) { setMsg({ tone: 'error', text: x.message }); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-sm">Current: <strong>{current || 'Unassigned'}</strong></p>
      <select aria-label="Contractor" className={field} value={cid} onChange={(e) => setCid(e.target.value)}>
        <option value="">Choose contractor…</option>
        {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ''}{typeof c.openBookings === 'number' ? ` — ${c.openBookings} open` : ''}</option>)}
      </select>
      <input className={field} placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} aria-label="Remarks" />
      <Button size="sm" type="submit" loading={busy} disabled={!cid}>{current ? 'Reassign' : 'Assign'} contractor</Button>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </form>
  );
}
