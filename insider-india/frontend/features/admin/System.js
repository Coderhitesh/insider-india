'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import CrudResource from '@/components/admin/CrudResource';
import Drawer from '@/components/admin/Drawer';
import { Header, DataTable, Pill, Tabs, Box } from '@/components/admin/Kit';
import Filters, { RANGES } from '@/components/admin/Filters';
import { useList } from '@/components/admin/useList';
import { api } from '@/lib/api';
import { downloadCsv, fmtDateTime, qs } from '@/lib/admin';

// ── Notifications ────────────────────────────────────────────
const EVENTS = ['OTP', 'BOOKING_CREATED', 'NEW_BOOKING_STAFF', 'CONTRACTOR_ASSIGNED', 'CONTRACTOR_NEW_ASSIGNMENT', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_REMINDER', 'QUOTATION_SUBMITTED', 'QUOTATION_RETURNED', 'QUOTATION_READY', 'QUOTATION_REVISED', 'QUOTATION_ACCEPTED', 'QUOTATION_REJECTED', 'QUOTATION_REVISION_REQUESTED', 'PROJECT_STATUS_UPDATED', 'PROJECT_UPDATE_POSTED'];
const CH = [['IN_APP', 'In-app'], ['WHATSAPP', 'WhatsApp'], ['SMS', 'SMS'], ['EMAIL', 'Email']];

function SendForm() {
  const [f, setF] = useState({ userIds: '', title: '', body: '', link: '' });
  const [msg, setMsg] = useState(null);
  const send = async () => {
    setMsg(null);
    try { const r = await api('/admin/notifications/send', { method: 'POST', body: { userIds: f.userIds.split(/[\s,]+/).filter(Boolean), title: f.title, body: f.body, link: f.link || undefined } }); setMsg({ tone: 'success', text: r.message }); } catch (x) { setMsg({ tone: 'error', text: x.message }); }
  };
  const inp = 'w-full rounded-none border border-stone-deep bg-paper px-3 py-2 text-sm';
  return (
    <Box title="Send an in-app message">
      <div className="grid gap-3">
        <label className="text-xs text-graphite">User IDs (comma separated; copy from customer/staff pages)<textarea rows={2} className={inp} value={f.userIds} onChange={(e) => setF({ ...f, userIds: e.target.value })} /></label>
        <label className="text-xs text-graphite">Title<input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label className="text-xs text-graphite">Message<textarea rows={3} className={inp} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
        <label className="text-xs text-graphite">Link inside the site (optional)<input className={inp} placeholder="/account/quotations" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></label>
        <div><Button onClick={send} disabled={!f.userIds || !f.title || !f.body}>Send</Button></div>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>
    </Box>
  );
}

function DeliveryLog() {
  const list = useList('/admin/notifications/log', { limit: '50' });
  return (
    <>
      <Filters params={list.params} setParams={list.setParams} search={false} filters={[
        { name: 'channel', label: 'Channel', options: CH }, { name: 'status', label: 'Status', options: [['SENT', 'Sent'], ['FAILED', 'Failed'], ['SKIPPED', 'Skipped']] }, { name: 'event', label: 'Event', options: EVENTS.map((e) => [e, e]) },
      ]} />
      <DataTable tableId="nlog" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        columns={[
          { key: 'createdAt', label: 'When', render: (r) => fmtDateTime(r.createdAt) }, { key: 'event', label: 'Event' },
          { key: 'channel', label: 'Channel' }, { key: 'user', label: 'Recipient', render: (r) => r.user?.name || r.to || '—' },
          { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> }, { key: 'provider', label: 'Provider' },
          { key: 'error', label: 'Error', render: (r) => <span className="text-error">{r.error || ''}</span> },
        ]} />
    </>
  );
}

export function NotificationsAdmin() {
  const [tab, setTab] = useState('templates');
  return (
    <>
      <Header title="Notifications" subtitle="Message templates per event and channel, delivery log and manual messages" />
      <Tabs tabs={[['templates', 'Templates'], ['log', 'Delivery log'], ['send', 'Send message']]} value={tab} onChange={setTab} />
      {tab === 'templates' && (
        <>
          <Notice className="mb-4">WhatsApp and DLT SMS messages only deliver when the provider template name/ID and variable order match what is approved with your provider. Use {'{{variable}}'} placeholders, e.g. {'{{name}}'}, {'{{bookingNumber}}'}, {'{{link}}'}, {'{{company}}'}.</Notice>
          <CrudResource embedded endpoint="/admin/notification-templates" title="Templates" managePerm="notifications.send" listDefaults={{ limit: '200' }}
            filters={[{ name: 'event', label: 'Event', options: EVENTS.map((e) => [e, e]) }, { name: 'channel', label: 'Channel', options: CH }]}
            columns={[
              { key: 'event', label: 'Event' }, { key: 'channel', label: 'Channel' },
              { key: 'provider', label: 'Provider template', render: (r) => r.providerTemplateName || r.providerTemplateId || '—' },
              { key: 'body', label: 'Body', render: (r) => <span className="line-clamp-2 max-w-md">{r.body}</span> },
              { key: 'isActive', label: 'Status', render: (r) => <Pill value={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
            ]}
            defaults={{ event: 'BOOKING_CREATED', channel: 'IN_APP', title: '', body: '', providerTemplateName: '', providerTemplateId: '', language: 'en', variableOrder: [], otpButton: false, isActive: true }}
            toForm={({ id, createdAt, updatedAt, ...r }) => r}
            fromForm={({ event, channel, ...rest }) => rest}
            fields={[
              { name: 'event', label: 'Event', type: 'select', options: EVENTS, placeholder: false, hint: 'Fixed after creation' },
              { name: 'channel', label: 'Channel', type: 'select', options: CH.map(([value, label]) => ({ value, label })), placeholder: false },
              { name: 'name', label: 'Internal name' }, { name: 'title', label: 'Title / email subject' },
              { name: 'body', label: 'Body', type: 'textarea', rows: 5 },
              { name: 'providerTemplateName', label: 'Provider template name (WhatsApp)' }, { name: 'providerTemplateId', label: 'Provider template ID (DLT / Twilio Content SID / Gupshup)' },
              { name: 'language', label: 'Language code' }, { name: 'variableOrder', label: 'Variable order for provider templates', type: 'tags', hint: 'e.g. name, bookingNumber, link' },
              { name: 'otpButton', label: 'OTP button', type: 'switch', help: 'WhatsApp authentication template with copy-code button' }, { name: 'isActive', label: 'Active', type: 'switch', help: 'Active' },
            ]} />
        </>
      )}
      {tab === 'log' && <DeliveryLog />}
      {tab === 'send' && <SendForm />}
    </>
  );
}

// ── Uploads ──────────────────────────────────────────────────
export function Uploads() {
  const list = useList('/admin/uploads', { limit: '50' });
  return (
    <>
      <Header title="Uploads" subtitle="All stored files. Private files open through short-lived signed links." />
      <Filters params={list.params} setParams={list.setParams} search={false} filters={[
        { name: 'purpose', label: 'Purpose', options: ['FLOOR_PLAN', 'SITE_IMAGE', 'SITE_DOCUMENT', 'SITE_VIDEO', 'QUOTATION_ITEM_IMAGE', 'QUOTATION_PDF', 'CONTENT_IMAGE', 'AVATAR', 'PROJECT_UPDATE'].map((p) => [p, p.replace(/_/g, ' ').toLowerCase()]) },
        { name: 'provider', label: 'Provider', options: [['CLOUDINARY', 'Cloudinary'], ['S3', 'AWS S3']] },
        { name: 'deleted', label: 'Deleted', options: [['true', 'Deleted only']] },
      ]} />
      <DataTable tableId="uploads" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        columns={[
          { key: 'originalName', label: 'File', render: (r) => (r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{r.originalName}</a> : r.originalName) },
          { key: 'purpose', label: 'Purpose' }, { key: 'provider', label: 'Stored on' }, { key: 'size', label: 'Size', render: (r) => `${Math.max(1, Math.round(r.size / 1024))} KB` },
          { key: 'owner', label: 'Uploaded by', render: (r) => r.owner?.name || '—' }, { key: 'isPrivate', label: 'Access', render: (r) => (r.isPrivate ? 'Private' : 'Public') },
          { key: 'createdAt', label: 'Uploaded', render: (r) => fmtDateTime(r.createdAt) },
        ]} />
    </>
  );
}

// ── Audit logs ───────────────────────────────────────────────
export function AuditLogs() {
  const list = useList('/admin/audit-logs', { limit: '50' });
  const [open, setOpen] = useState(null);
  return (
    <>
      <Header title="Audit logs" subtitle="Price edits, discounts, role and permission changes, settings, assignments, deletions and logins" />
      <Filters params={list.params} setParams={list.setParams} search={false} filters={[
        { name: 'entityType', label: 'Entity', options: ['Quotation', 'Booking', 'Lead', 'User', 'Role', 'Setting', 'Package', 'EstimateRule', 'Service', 'ExecutionProject', 'SiteVisit', 'Media'].map((e) => [e, e]) },
        { name: 'action', label: 'Action starts with', options: ['QUOTATION', 'CONTRACTOR', 'ROLE', 'PERMISSIONS', 'SETTINGS', 'PACKAGE', 'STAFF_LOGIN', 'CUSTOMER', 'LEAD', 'BOOKING'].map((a) => [a, a.toLowerCase()]) },
        { name: 'range' },
      ]} />
      <DataTable tableId="audit" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        columns={[
          { key: 'createdAt', label: 'When', render: (r) => fmtDateTime(r.createdAt) }, { key: 'action', label: 'Action', render: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { key: 'entityType', label: 'Entity' }, { key: 'actor', label: 'By', render: (r) => (r.actor ? `${r.actor.name} (${r.role?.toLowerCase()})` : 'System') },
          { key: 'reason', label: 'Reason', render: (r) => r.reason || '—' }, { key: 'ip', label: 'IP', defaultHidden: true },
          { key: 'd', label: '', className: 'text-right', render: (r) => (r.before || r.after || r.meta ? <Button size="sm" variant="ghost" onClick={() => setOpen(r)}>Details</Button> : null) },
        ]} />
      <Drawer open={Boolean(open)} onClose={() => setOpen(null)} title={open?.action || ''}>
        {open && ['before', 'after', 'meta'].filter((k) => open[k]).map((k) => (
          <div key={k} className="mb-4"><p className="mb-1 text-xs font-medium text-graphite">{k}</p><pre className="overflow-x-auto rounded-none bg-blush/50 p-3 text-xs">{JSON.stringify(open[k], null, 2)}</pre></div>
        ))}
        {open && <p className="text-xs text-graphite">{open.userAgent}</p>}
      </Drawer>
    </>
  );
}

// ── Reports ──────────────────────────────────────────────────
export function Reports() {
  const [range, setRange] = useState({ range: '30d', from: '', to: '' });
  const [msg, setMsg] = useState(null);
  const run = (path, name) => downloadCsv(`${path}${qs(range)}`, `${name}-${range.range}.csv`).then(() => setMsg(null)).catch((e) => setMsg(e.message));
  const cls = 'h-9 rounded-none border border-stone-deep bg-paper px-2.5 text-sm';
  return (
    <>
      <Header title="Reports" subtitle="CSV exports for the chosen period. Charts are on the dashboard." />
      <Box>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-graphite">Period<select className={`${cls} block`} value={range.range} onChange={(e) => setRange({ range: e.target.value, from: '', to: '' })}>{RANGES.filter(([v]) => v).map(([v, l]) => <option key={v} value={v}>{l}</option>)}<option value="all">All time</option></select></label>
          {range.range === 'custom' && <>
            <label className="text-xs text-graphite">From<input type="date" className={`${cls} block`} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
            <label className="text-xs text-graphite">To<input type="date" className={`${cls} block`} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          </>}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['/admin/leads', 'leads', 'Leads', 'Every lead with status, funnel progress, campaign'], ['/admin/bookings', 'bookings', 'Bookings', 'Requirements, contractor, status'], ['/admin/quotations', 'quotations', 'Quotations', 'Contractor vs final totals, adjustments'], ['/admin/customers', 'customers', 'Customers', 'Contact details, leads and bookings count']].map(([p, n, l, d]) => (
            <div key={p} className="rounded-none border border-stone p-4"><p className="font-medium">{l}</p><p className="mt-1 text-sm text-graphite">{d}</p><Button size="sm" variant="secondary" className="mt-3" onClick={() => run(p, n)}>Download CSV</Button></div>
          ))}
        </div>
        {msg && <Notice tone="error" className="mt-4">{msg}</Notice>}
      </Box>
    </>
  );
}
