'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Drawer from '@/components/admin/Drawer';
import MediaUploader from '@/components/admin/MediaUploader';
import { Header, DataTable, Pill, Box, KV, Loader, Failed } from '@/components/admin/Kit';
import { Fields } from '@/components/admin/Form';
import Filters from '@/components/admin/Filters';
import { useList } from '@/components/admin/useList';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can, isContractor, fmtDate, fmtDateTime, inr } from '@/lib/admin';

const STAGES = [['DESIGN', 'Design'], ['DESIGN_APPROVAL', 'Design approval'], ['MATERIAL_SELECTION', 'Material selection'], ['PRODUCTION', 'Production'], ['SITE_EXECUTION', 'Site execution'], ['QUALITY_CHECK', 'Quality check'], ['HANDOVER', 'Handover'], ['COMPLETED', 'Completed']];

export function ExecutionList() {
  const list = useList('/execution', { limit: '50' });
  return (
    <>
      <Header title="Projects" subtitle="Created automatically when a customer accepts a quotation" />
      <Filters params={list.params} setParams={list.setParams} search={false} filters={[{ name: 'stage', label: 'Stage', options: STAGES }]} />
      <DataTable tableId="exec" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })} rowHref={(r) => `/admin/projects/${r.id}`} empty="No projects yet."
        columns={[
          { key: 'projectNumber', label: 'Project' }, { key: 'bookingNumber', label: 'Booking' }, { key: 'customer', label: 'Customer' },
          { key: 'stage', label: 'Stage', render: (r) => (r.startedAt ? r.stageLabel : <Pill tone="amber">Not started</Pill>) },
          { key: 'projectManager', label: 'Project manager', render: (r) => r.projectManager || '—' }, { key: 'contractor', label: 'Contractor' },
          { key: 'grandTotal', label: 'Value', className: 'text-right', render: (r) => inr(r.grandTotal) }, { key: 'updatedAt', label: 'Updated', render: (r) => fmtDate(r.updatedAt) },
        ]} />
    </>
  );
}

export function ExecutionDetail({ id }) {
  const user = useAuth((s) => s.user);
  const { data, error, loading, reload } = useApi(`/execution/${id}`);
  const staff = useApi(!isContractor(user) && can(user, 'users.view') ? '/admin/users?limit=100' : null);
  const [stage, setStage] = useState({ value: '', note: '' });
  const [plan, setPlan] = useState(null);
  const [post, setPost] = useState({ text: '', visibleToCustomer: true, media: [] });
  const [msg, setMsg] = useState(null);
  if (loading && !data) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  const p = data.project;
  const edit = can(user, 'bookings.edit') && !isContractor(user);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); setMsg({ tone: 'success', text: ok }); reload(); } catch (x) { setMsg({ tone: 'error', text: x.message }); } };

  return (
    <>
      <Header title={p.projectNumber} subtitle={`Booking ${p.bookingNumber}`} back={['/admin/projects', 'Projects']}>
        <Pill tone={p.startedAt ? 'green' : 'amber'}>{p.startedAt ? p.stageLabel : 'Not started'}</Pill>
        <Button size="sm" variant="ghost" href={`/admin/bookings/${p.bookingId}`}>Booking</Button>
        {edit && !p.startedAt && <Button size="sm" onClick={() => run(() => api(`/execution/${id}/start`, { method: 'POST' }), 'Project started and customer notified')}>Start project</Button>}
        {edit && <Button size="sm" variant="secondary" onClick={() => setPlan({ projectManager: '', milestones: p.milestones.map((m) => ({ ...m, dueDate: m.dueDate?.slice(0, 10) || null })), paymentSchedule: p.paymentSchedule.map((x) => ({ ...x, dueOn: x.dueOn?.slice(0, 10) || null })), reason: '' })}>Edit plan & payments</Button>}
      </Header>
      {msg && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Box title="Stages">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAGES.map(([k, l], i) => {
                const idx = STAGES.findIndex(([x]) => x === p.stage);
                const st = !p.startedAt ? 'todo' : i < idx || p.stage === 'COMPLETED' ? 'done' : i === idx ? 'now' : 'todo';
                return <li key={k} className={`rounded-none border px-3 py-2 text-sm ${st === 'now' ? 'border-wine bg-wine-tint' : st === 'done' ? 'border-stone bg-blush/50' : 'border-stone text-graphite'}`}>{l}</li>;
              })}
            </ol>
            {edit && p.startedAt && p.stage !== 'COMPLETED' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <select aria-label="Move to stage" className="h-9 rounded-none border border-stone-deep bg-paper px-2 text-sm" value={stage.value} onChange={(e) => setStage({ ...stage, value: e.target.value })}>
                  <option value="">Move to stage…</option>{STAGES.filter(([k]) => k !== p.stage).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input aria-label="Note" className="h-9 flex-1 rounded-none border border-stone-deep bg-paper px-3 text-sm" placeholder="Note (internal)" value={stage.note} onChange={(e) => setStage({ ...stage, note: e.target.value })} />
                <Button size="sm" disabled={!stage.value} onClick={() => run(() => api(`/execution/${id}/stage`, { method: 'POST', body: { stage: stage.value, note: stage.note || undefined } }), 'Stage updated; customer notified').then(() => setStage({ value: '', note: '' }))}>Update</Button>
              </div>
            )}
          </Box>
          <Box title="Post a progress update">
            <textarea aria-label="Update" rows={3} className="w-full rounded-none border border-stone-deep bg-paper px-3 py-2 text-sm" placeholder="What happened on site?" value={post.text} onChange={(e) => setPost({ ...post, text: e.target.value })} />
            <MediaUploader purpose="SITE_IMAGE" accept="image/jpeg,image/png,image/webp" value={post.media} onChange={(fn) => setPost((x) => ({ ...x, media: typeof fn === 'function' ? fn(x.media) : fn }))} label="Add site photos" />
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={post.visibleToCustomer} onChange={(e) => setPost({ ...post, visibleToCustomer: e.target.checked })} className="accent-[var(--color-wine)]" />Visible to customer</label>
              <Button size="sm" disabled={!post.text.trim()} onClick={() => run(() => api(`/execution/${id}/updates`, { method: 'POST', body: { text: post.text.trim(), visibleToCustomer: post.visibleToCustomer, media: post.media.map((m) => m.id) } }), 'Update posted').then(() => setPost({ text: '', visibleToCustomer: true, media: [] }))}>Post update</Button>
            </div>
            <ul className="mt-5 divide-y divide-stone">
              {p.updates.map((u) => (
                <li key={u.id} className="py-3 text-sm">
                  <p className="whitespace-pre-line">{u.text}</p>
                  {u.media.length > 0 && <div className="mt-2 flex gap-2">{u.media.map((m) => <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"><img src={m.url} alt="" className="size-16 rounded-none object-cover" /></a>)}</div>}
                  <p className="mt-1 text-xs text-graphite">{fmtDateTime(u.at)}{u.visibleToCustomer ? '' : ' (internal)'}</p>
                </li>
              ))}
            </ul>
          </Box>
        </div>
        <div className="space-y-6">
          <Box title="Team"><KV rows={[['Project manager', p.projectManager?.name], ['Contractor', p.contractor?.name], ['Started', fmtDate(p.startedAt)], ['Value', inr(p.grandTotal)]]} /></Box>
          <Box title="Milestones">{p.milestones.length ? <ul className="space-y-1 text-sm">{p.milestones.map((m) => <li key={m._id} className="flex justify-between gap-2"><span>{m.title}</span><span className={m.status === 'DONE' ? 'text-success' : 'text-graphite'}>{m.status === 'DONE' ? 'Done' : fmtDate(m.dueDate)}</span></li>)}</ul> : <p className="text-sm text-graphite">None yet.</p>}</Box>
          <Box title="Payments">{p.paymentSchedule.length ? <ul className="space-y-1 text-sm">{p.paymentSchedule.map((x) => <li key={x._id} className="flex justify-between gap-2"><span>{x.label}</span><span className="tabular">{inr(x.amount)} <Pill value={x.status === 'PAID' ? 'COMPLETED' : 'SCHEDULED'}>{x.status === 'PAID' ? 'Paid' : 'Pending'}</Pill></span></li>)}</ul> : <p className="text-sm text-graphite">No schedule.</p>}</Box>
        </div>
      </div>
      <Drawer open={Boolean(plan)} onClose={() => setPlan(null)} title="Plan & payments"
        footer={<><Button variant="ghost" onClick={() => setPlan(null)}>Cancel</Button><Button onClick={() => run(() => api(`/execution/${id}`, { method: 'PATCH', body: {
          ...(plan.projectManager ? { projectManager: plan.projectManager } : {}),
          milestones: plan.milestones.map(({ _id, title, dueDate, status }) => ({ ...(_id ? { _id } : {}), title, dueDate: dueDate || null, status })),
          paymentSchedule: plan.paymentSchedule.map(({ _id, label, percent, amount, dueOn, status, reference }) => ({ ...(_id ? { _id } : {}), label, percent: percent || undefined, amount: Number(amount) || 0, dueOn: dueOn || null, status, reference: reference || undefined })),
          reason: plan.reason || undefined } }), 'Saved').then(() => setPlan(null))}>Save</Button></>}>
        {plan && <Fields value={plan} onChange={setPlan} fields={[
          { name: 'projectManager', label: 'Project manager', type: 'select', options: (staff.data?.items || []).map((u) => ({ value: u.id, label: u.name })), hint: staff.data ? 'Leave to keep current' : 'Requires permission to view staff' },
          { name: 'milestones', label: 'Milestones', type: 'rows', addLabel: 'Add milestone', newRow: { title: '', dueDate: null, status: 'PENDING' }, fields: [{ name: 'title', label: 'Title' }, { name: 'dueDate', label: 'Due', type: 'date' }, { name: 'status', label: 'Status', type: 'select', placeholder: false, options: ['PENDING', 'DONE'] }] },
          { name: 'paymentSchedule', label: 'Payment schedule', type: 'rows', addLabel: 'Add payment', newRow: { label: '', amount: 0, status: 'PENDING' }, fields: [{ name: 'label', label: 'Milestone' }, { name: 'amount', label: 'Amount ₹', type: 'number' }, { name: 'dueOn', label: 'Due', type: 'date' }, { name: 'status', label: 'Status', type: 'select', placeholder: false, options: ['PENDING', 'PAID'] }, { name: 'reference', label: 'Payment reference' }] },
          { name: 'reason', label: 'Reason (audit log)' },
        ]} />}
      </Drawer>
    </>
  );
}
