'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Drawer from '@/components/admin/Drawer';
import { Header, DataTable, Pill, Box, KV, Stat, Loader, Failed } from '@/components/admin/Kit';
import Filters from '@/components/admin/Filters';
import { Fields } from '@/components/admin/Form';
import { Guard } from '@/components/admin/AdminShell';
import { useList } from '@/components/admin/useList';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can, fmtDate, fmtDateTime, inr } from '@/lib/admin';

export const REF_LABEL = {
  SUBMITTED: 'Submitted', VERIFIED: 'Verified', CONTACTED: 'Contacted', SITE_VISIT_DONE: 'Site visit done', QUOTATION_SHARED: 'Quotation shared',
  AGREEMENT_SIGNED: 'Agreement signed', ADVANCE_RECEIVED: 'Pending approval', REWARD_APPROVED: 'Credited to wallet', REWARD_PAID: 'Paid (legacy)', REJECTED: 'Rejected', WITHHELD: 'On hold',
};
const REF_TONE = { SUBMITTED: 'amber', ADVANCE_RECEIVED: 'wine', REWARD_APPROVED: 'green', REWARD_PAID: 'green', REJECTED: 'red', WITHHELD: 'outline' };
const TYPE = { CUSTOMER: 'Customer', FRIEND: 'Friend / family', PROPERTY_DEALER: 'Property dealer', BROKER: 'Broker', PARTNER: 'Partner', OTHER: 'Other' };
const RefPill = ({ s }) => <Pill tone={REF_TONE[s] || 'grey'}>{REF_LABEL[s] || s}</Pill>;

export function ReferralsList() {
  const list = useList('/admin/referrals', { limit: '25' });
  const sum = list.data?.summary;
  const filters = [
    { name: 'status', label: 'Status', options: Object.entries(REF_LABEL) },
    { name: 'flag', label: 'Flag', options: [['duplicate', 'Possible duplicate'], ['recovery', 'Recovery review'], ['due', 'Credited']] },
  ];
  return (
    <Guard perm="referrals.view">
      <Header title="Referrals" subtitle="Refer & Earn — verify, track and approve rewards (credited to the referrer’s wallet for their next project)">
        <Button size="sm" variant="secondary" href="/admin/referrers">Referrers</Button>
        <Button size="sm" variant="ghost" href="/admin/settings">Programme settings</Button>
      </Header>
      {sum && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button type="button" className="text-left" onClick={() => list.setParams({ status: 'SUBMITTED', flag: '' })}><Stat label="To verify" value={sum.toVerify} /></button>
          <button type="button" className="text-left" onClick={() => list.setParams({ status: 'ADVANCE_RECEIVED', flag: '' })}><Stat label="Pending approval" value={sum.pendingApproval} /></button>
          <button type="button" className="text-left" onClick={() => list.setParams({ flag: 'due', status: '' })}><Stat label="Credit issued" value={inr(sum.creditIssued)} hint={`${sum.creditIssuedCount} referral(s) · ${inr(sum.creditUsed)} used on projects`} /></button>
          <button type="button" className="text-left" onClick={() => list.setParams({ flag: 'recovery', status: '' })}><Stat label="Recovery review" value={sum.recovery} hint="Reversed after credit was used" /></button>
        </div>
      )}
      <Filters params={list.params} setParams={list.setParams} filters={filters} placeholder="Referral no., customer name or mobile" />
      <DataTable tableId="referrals" {...list} rows={list.rows} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        rowHref={(r) => `/admin/referrals/${r.id}`} empty="No referrals match these filters."
        columns={[
          { key: 'referralNumber', label: 'Referral', render: (r) => <><span className="block">{r.referralNumber}</span><span className="text-xs text-graphite">{fmtDate(r.createdAt)} · {r.source === 'LINK' ? 'Link' : 'Form'}</span></> },
          { key: 'customer', label: 'Customer', render: (r) => <><span className="block">{r.customer.name}</span><span className="text-xs text-graphite">+91 {r.customer.mobile}</span></> },
          { key: 'referrer', label: 'Referrer', render: (r) => <><span className="block">{r.referrer?.name}</span><span className="text-xs text-graphite">{r.referrer?.code}</span></> },
          { key: 'status', label: 'Status', render: (r) => <span className="flex flex-wrap gap-1"><RefPill s={r.status} />{r.checks?.duplicate && r.status === 'SUBMITTED' && <Pill tone="red">Duplicate?</Pill>}{r.recoveryReview && <Pill tone="red">Recovery</Pill>}</span> },
          { key: 'booking', label: 'Booking', render: (r) => r.bookingNumber || '—' },
          { key: 'value', label: 'Project value', render: (r) => (r.projectValue ? inr(r.projectValue) : '—') },
          { key: 'reward', label: 'Reward', render: (r) => (r.rewardAmount != null ? <><span className="block">{inr(r.rewardAmount)}</span><span className="text-xs text-graphite">Slab {r.slabKey} · #{r.level}</span></> : '—') },
        ]} />
    </Guard>
  );
}

const ACTIONS = {
  verify: { title: 'Verify referral', button: 'Verify', fields: [{ name: 'note', label: 'Note', type: 'textarea', rows: 2 }], init: { note: '', override: false } },
  contacted: { title: 'Mark contacted', button: 'Mark contacted', fields: [{ name: 'note', label: 'Note (optional)', type: 'textarea', rows: 2 }], init: { note: '' } },
  reject: { title: 'Reject referral', button: 'Reject', fields: [{ name: 'reason', label: 'Reason (shown to the referrer)', type: 'textarea', rows: 3 }], init: { reason: '' } },
  withhold: { title: 'Put on hold', button: 'Put on hold', fields: [{ name: 'reason', label: 'Reason (shown to the referrer)', type: 'textarea', rows: 3 }], init: { reason: '' } },
  reopen: { title: 'Reopen referral', button: 'Reopen', fields: [{ name: 'reason', label: 'Reason', type: 'textarea', rows: 2 }], init: { reason: '' } },
  'recovery-reviewed': { title: 'Close recovery review', button: 'Close review', fields: [{ name: 'reason', label: 'What was done (recovered / adjusted / waived)', type: 'textarea', rows: 3 }], init: { reason: '' } },
  link: { title: 'Link booking manually', button: 'Link', fields: [{ name: 'bookingNumber', label: 'Booking number', hint: 'e.g. BK-2026-000123 — use when the customer booked with a different number' }, { name: 'reason', label: 'Reason (audited)', type: 'textarea', rows: 2 }], init: { bookingNumber: '', reason: '' } },
  approve: { title: 'Approve & credit wallet', button: 'Approve & credit', fields: [{ name: 'amount', label: 'Reward amount (₹)', type: 'number', min: 0 }, { name: 'note', label: 'Note (required if you change the amount)', type: 'textarea', rows: 2 }] },
};

export function ReferralDetail({ id }) {
  const user = useAuth((s) => s.user);
  const { data, error, loading, reload } = useApi(`/admin/referrals/${id}`);
  const [act, setAct] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  const r = data.referral;
  const now = data.checksNow || { hard: [], soft: [] };
  const manage = can(user, 'referrals.manage');
  const inProgress = ['VERIFIED', 'CONTACTED', 'SITE_VISIT_DONE', 'QUOTATION_SHARED', 'AGREEMENT_SIGNED'].includes(r.status);

  const open = (key) => {
    setErrors({}); setMsg(null); setAct(key);
    if (key === 'approve') setForm({ amount: r.rewardAmount, note: '' });
    else setForm({ ...ACTIONS[key].init });
  };
  const submit = async () => {
    setBusy(true); setErrors({}); setMsg(null);
    const body = { ...form };
    if (act === 'approve' && (form.amount === '' || form.amount == null)) delete body.amount;
    try { const res = await api(`/admin/referrals/${id}/${act}`, { method: 'POST', body }); setAct(null); setMsg({ tone: 'success', text: res.message }); reload(); } catch (x) {
      setErrors(x.fieldErrors?.() || {}); setMsg({ tone: 'error', text: x.message, code: x.code });
    } finally { setBusy(false); }
  };

  const buttons = [
    manage && r.status === 'SUBMITTED' && ['verify', 'Verify', 'primary'],
    manage && r.status === 'VERIFIED' && ['contacted', 'Mark contacted', 'secondary'],
    manage && inProgress && !r.bookingId && ['link', 'Link booking', 'secondary'],
    manage && r.status === 'ADVANCE_RECEIVED' && ['approve', 'Approve reward', 'primary'],
    manage && ['REJECTED', 'WITHHELD'].includes(r.status) && ['reopen', 'Reopen', 'secondary'],
    manage && r.recoveryReview && ['recovery-reviewed', 'Close recovery review', 'secondary'],
    manage && !['REWARD_PAID', 'REJECTED', 'WITHHELD'].includes(r.status) && ['withhold', 'Hold', 'ghost'],
    manage && !['REWARD_PAID', 'REJECTED'].includes(r.status) && ['reject', 'Reject', 'ghost'],
  ].filter(Boolean);
  const cfg = act && ACTIONS[act];
  const needOverride = act === 'verify' && now.soft.length > 0;

  return (
    <Guard perm="referrals.view">
      <Header title={r.referralNumber} subtitle={`${r.customer.name} · referred by ${r.referrer?.name} (${r.referrer?.code})`} back={['/admin/referrals', 'Referrals']}>
        <RefPill s={r.status} />
        {buttons.map(([k, l, v]) => <Button key={k} size="sm" variant={v} onClick={() => open(k)}>{l}</Button>)}
      </Header>
      {msg && !act && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      {r.recoveryReview && <Notice tone="error" className="mb-4">The reward was taken back (project cancelled / advance refunded) but the referrer had already used the credit — their wallet is negative. Recover it from their project balance or decide as per policy, then close the review.</Notice>}
      {r.status === 'SUBMITTED' && now.hard.length > 0 && <Notice tone="error" className="mb-4"><ShieldAlert className="mr-1 inline size-4" />Not eligible: {now.hard.join(' ')}</Notice>}
      {r.status === 'SUBMITTED' && !now.hard.length && now.soft.length > 0 && <Notice className="mb-4"><AlertTriangle className="mr-1 inline size-4" />Possible duplicate: {now.soft.join(' ')} Check before verifying.</Notice>}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Box title="Referred customer">
            <KV rows={[
              ['Name', r.customer.name], ['Mobile', `+91 ${r.customer.mobile}`], ['City', r.customer.city], ['Property type', r.customer.propertyType],
              ['Budget', r.customer.budget], ['Requirement', r.customer.notes], ['Source', r.source === 'LINK' ? 'Referral link (customer booked via link)' : 'Submitted by referrer'],
              ['Consent', r.consentAt ? `Confirmed ${fmtDateTime(r.consentAt)}` : r.source === 'LINK' ? 'Customer came through the link' : '—'],
            ]} />
          </Box>
          <Box title="Project & reward">
            <KV rows={[
              ['Lead', r.leadId ? <Link className="text-wine underline" href={`/admin/leads/${r.leadId}`}>Open lead</Link> : '—'],
              ['Booking', r.bookingId ? <Link className="text-wine underline" href={`/admin/bookings/${r.bookingId}`}>{r.bookingNumber || 'Open booking'}</Link> : 'Not linked yet'],
              ['Project', r.projectId ? <Link className="text-wine underline" href={`/admin/projects/${r.projectId}`}>Open project</Link> : '—'],
              r.linkedManually && ['Linked', 'Manually by staff (see timeline)'],
              ['Project value', r.projectValue ? `${inr(r.projectValue)} ${r.valueBasis === 'EXCL_GST' ? '(excl. GST)' : '(incl. GST)'}` : '—'],
              ['Slab / level', r.slabKey ? `${r.slabKey} — ${r.slabLabel} · referral #${r.level}` : '—'],
              ['Calculated reward', r.rewardCalculated != null ? inr(r.rewardCalculated) : '—'],
              ['Credited to wallet', r.approvedAt ? `${inr(r.rewardAmount)} on ${fmtDate(r.approvedAt)}${r.approvalNote ? ` — ${r.approvalNote}` : ''}` : '—'],
              ['Qualified', r.qualifiedAt ? fmtDateTime(r.qualifiedAt) : '—'],
              r.rejectReason && ['Rejected', r.rejectReason], r.withheldReason && ['On hold', r.withheldReason],
            ]} />
            {inProgress && <p className="mt-4 text-xs text-graphite">Status moves automatically from the customer’s booking, quotation and payments. The reward is locked when the quotation is accepted and the qualifying advance is received.</p>}
          </Box>
          <Box title="Timeline">
            <ol className="space-y-3 border-l-2 border-stone pl-4 text-sm">
              {[...r.timeline].reverse().map((t, i) => (
                <li key={i}><p className="font-medium">{t.label || t.status}{t.auto ? <span className="ml-1 text-xs font-normal text-graphite">(auto)</span> : null}</p><p className="text-xs text-graphite">{fmtDateTime(t.at)}</p>{t.note && <p className="mt-0.5 text-graphite">{t.note}</p>}</li>
              ))}
            </ol>
          </Box>
        </div>
        <div className="space-y-5">
          <Box title="Referrer">
            <KV rows={[['Name', r.referrer?.name], ['Referral ID', r.referrer?.code], ['Mobile', r.referrer?.mobile ? `+91 ${r.referrer.mobile}` : '—'], ['Type', TYPE[r.referrer?.type]], ['Status', r.referrer?.status === 'ACTIVE' ? 'Active' : <span className="text-wine">Suspended</span>]]} />
            <Link href={`/admin/referrers?q=${encodeURIComponent(r.referrer?.code || '')}`} className="mt-3 inline-block text-sm text-wine underline">Manage referrer</Link>
          </Box>
          <Box title="Checks">
            <ul className="space-y-1.5 text-sm">
              <li>At submission: {r.checks?.duplicate ? <span className="text-wine">{r.checks.duplicateReason}</span> : 'No issues'}</li>
              <li>Now: {now.hard.length ? <span className="text-wine">{now.hard.join(' ')}</span> : now.soft.length ? <span className="text-[#7a4b00]">{now.soft.join(' ')}</span> : 'No issues'}</li>
            </ul>
          </Box>
        </div>
      </div>

      <Drawer open={Boolean(act)} onClose={() => setAct(null)} title={cfg?.title} width="max-w-md"
        footer={<><Button variant="ghost" onClick={() => setAct(null)}>Cancel</Button><Button loading={busy} disabled={needOverride && !form.override} onClick={submit}>{cfg?.button}</Button></>}>
        {cfg && (
          <>
            {act === 'approve' && <p className="mb-4 text-sm text-graphite">Calculated: <strong className="text-charcoal">{inr(r.rewardCalculated)}</strong> (slab {r.slabKey}, referral #{r.level}). The level is re-checked when you approve. The amount goes to the referrer’s wallet as credit for their own next project — no cash is paid.</p>}
            {act === 'verify' && now.hard.length > 0 && <Notice tone="error" className="mb-4">{now.hard.join(' ')}</Notice>}
            {needOverride && (
              <div className="mb-4 border border-wine/40 bg-wine-tint p-3 text-sm">
                <p>{now.soft.join(' ')}</p>
                <label className="mt-2 flex items-center gap-2"><input type="checkbox" className="accent-wine" checked={Boolean(form.override)} onChange={(e) => setForm({ ...form, override: e.target.checked })} />I checked — this is a genuine new referral (note required)</label>
              </div>
            )}
            <Fields value={form} onChange={setForm} errors={errors} fields={cfg.fields} />
            {msg?.tone === 'error' && <Notice tone="error" className="mt-3">{msg.text}</Notice>}
          </>
        )}
      </Drawer>
    </Guard>
  );
}

export function ReferrersList() {
  const user = useAuth((s) => s.user);
  const list = useList('/admin/referrers', { limit: '25' });
  const [edit, setEdit] = useState(null);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const manage = can(user, 'referrals.manage');
  const save = async () => {
    setBusy(true); setErrors({}); setMsg(null);
    try {
      await api(`/admin/referrers/${edit.id}`, { method: 'PATCH', body: { status: edit.status, type: edit.type, suspendedReason: edit.status === 'SUSPENDED' ? edit.suspendedReason : undefined, adminNotes: edit.adminNotes } });
      setEdit(null); setMsg({ tone: 'success', text: 'Referrer updated' }); list.reload();
    } catch (x) { setErrors(x.fieldErrors?.() || {}); setMsg({ tone: 'error', text: x.message }); } finally { setBusy(false); }
  };
  const openEdit = async (r) => {
    setErrors({}); setMsg(null);
    try { const res = await api(`/admin/referrers/${r.id}`); setEdit({ ...res.data.referrer, wallet: res.data.wallet, adminNotes: res.data.referrer.adminNotes || '', suspendedReason: res.data.referrer.suspendedReason || '' }); } catch (x) { setMsg({ tone: 'error', text: x.message }); }
  };
  return (
    <Guard perm="referrals.view">
      <Header title="Referrers" subtitle="People registered for Refer & Earn" back={['/admin/referrals', 'Referrals']} />
      {msg && !edit && <Notice tone={msg.tone} className="mb-3">{msg.text}</Notice>}
      <Filters params={list.params} setParams={list.setParams} filters={[{ name: 'status', label: 'Status', options: [['ACTIVE', 'Active'], ['SUSPENDED', 'Suspended']] }]} placeholder="Referral ID, name or mobile" />
      <DataTable tableId="referrers" {...list} rows={list.rows} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        empty="No referrers yet."
        columns={[
          { key: 'code', label: 'Referral ID', render: (r) => <span className="tabular">{r.code}</span> },
          { key: 'name', label: 'Name', render: (r) => <><span className="block">{r.name}</span><span className="text-xs text-graphite">+91 {r.mobile}{r.city ? ` · ${r.city}` : ''}</span></> },
          { key: 'type', label: 'Type', render: (r) => TYPE[r.type] || r.type },
          { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'ACTIVE' ? 'green' : 'red'}>{r.status === 'ACTIVE' ? 'Active' : 'Suspended'}</Pill> },
          { key: 'stats', label: 'Referrals', render: (r) => <><span className="block">{r.stats.total} total · {r.stats.successful} successful</span>{r.stats.pending ? <span className="text-xs text-graphite">Awaiting approval {inr(r.stats.pending)}</span> : null}</> },
          { key: 'wallet', label: 'Wallet', render: (r) => <><span className={`block font-medium ${r.stats.balance < 0 ? 'text-wine' : ''}`}>{inr(r.stats.balance)}</span><span className="text-xs text-graphite">Earned {inr(r.stats.credited)} · used {inr(r.stats.used)}</span></> },
          { key: 'actions', label: '', render: (r) => <span className="flex gap-2"><Link className="text-sm text-wine underline" href={`/admin/referrals?referrer=${r.id}`}>Referrals</Link>{manage && <button type="button" className="text-sm text-wine underline" onClick={() => openEdit(r)}>Edit</button>}</span> },
        ]} />
      <Drawer open={Boolean(edit)} onClose={() => setEdit(null)} title={`Referrer ${edit?.code || ''}`} width="max-w-md"
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {edit && (
          <>
            <p className="mb-4 text-sm text-graphite">{edit.name} · +91 {edit.mobile} · joined {fmtDate(edit.createdAt)}</p>
            {edit.wallet && (
              <div className="mb-4 border border-stone p-3 text-sm">
                <p className="font-medium">Wallet {inr(edit.wallet.balance)}</p>
                <ul className="mt-2 space-y-1 text-xs text-graphite">{edit.wallet.entries.slice(0, 10).map((e) => <li key={`${e.type}-${e.ref}`} className="flex justify-between gap-2"><span>{e.label} · {e.ref} · {fmtDate(e.at)}</span><span className="tabular">{e.amount > 0 ? '+' : '−'}{inr(Math.abs(e.amount))}</span></li>)}</ul>
              </div>
            )}
            <Fields value={edit} onChange={setEdit} errors={errors} fields={[
              { name: 'status', label: 'Status', type: 'select', placeholder: false, options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended — cannot submit; rewards cannot be approved' }] },
              ...(edit.status === 'SUSPENDED' ? [{ name: 'suspendedReason', label: 'Reason (shown to the referrer)', type: 'textarea', rows: 2 }] : []),
              { name: 'type', label: 'Type', type: 'select', placeholder: false, options: Object.entries(TYPE).map(([value, label]) => ({ value, label })) },
              { name: 'adminNotes', label: 'Internal notes', type: 'textarea', rows: 3 },
            ]} />
            {msg?.tone === 'error' && <Notice tone="error" className="mt-3">{msg.text}</Notice>}
          </>
        )}
      </Drawer>
    </Guard>
  );
}
