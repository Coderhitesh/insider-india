'use client';

import { useEffect, useState } from 'react';
import { Plus, Bell, Ban, Gift } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Drawer from '@/components/admin/Drawer';
import { Box, Pill, Loader, Failed } from '@/components/admin/Kit';
import { Fields } from '@/components/admin/Form';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { fmtDate, inr } from '@/lib/admin';

export const METHOD_LABEL = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', CARD: 'Card', RAZORPAY: 'Online (Razorpay)', REFERRAL_CREDIT: 'Referral credit', COUPON: 'Coupon discount', OTHER: 'Other' };
const SCHEDULE_TONE = { PAID: 'green', PARTIAL: 'amber', OVERDUE: 'red', PENDING: 'outline' };
const SCHEDULE_LABEL = { PAID: 'Paid', PARTIAL: 'Part paid', OVERDUE: 'Overdue', PENDING: 'Pending' };
const PAY_TONE = { RECEIVED: 'green', CREATED: 'amber', FAILED: 'outline', VOID: 'red' };
const PAY_LABEL = { RECEIVED: 'Received', CREATED: 'Awaiting payment', FAILED: 'Failed / closed', VOID: 'Void' };
const today = () => new Date().toISOString().slice(0, 10);

/** Project payment ledger for staff: totals, milestone status, record/void payments, reminders. */
export default function ProjectPayments({ projectId, canManage, onChanged }) {
  const { data, error, loading, reload } = useApi(`/execution/${projectId}/payments`);
  const [form, setForm] = useState(null);
  const [voiding, setVoiding] = useState(null);
  const [crediting, setCrediting] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (msg?.tone === 'success') { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } return undefined; }, [msg]);

  if (loading && !data) return <Box title="Payments"><Loader /></Box>;
  if (error) return <Box title="Payments"><Failed error={error} retry={reload} /></Box>;
  const s = data.summary;
  const methods = data.methods || [];

  const run = async (fn, ok) => {
    setBusy(true); setMsg(null); setErrors({});
    try { await fn(); setMsg({ tone: 'success', text: ok }); reload(); onChanged?.(); return true; } catch (x) {
      setErrors(Object.fromEntries((x.errors || []).map((e) => [e.field, e.message])));
      setMsg({ tone: 'error', text: x.message }); return false;
    } finally { setBusy(false); }
  };

  const openRecord = () => {
    setErrors({});
    setForm({ amount: s.nextDue?.amount || s.balance || null, method: 'CASH', receivedAt: today(), scheduleItem: s.nextDue?.id || '', reference: '', note: '', notifyCustomer: true });
  };

  return (
    <Box title="Payments" action={canManage && (
      <div className="flex gap-2">
        {s.balance > 0 && <Button size="sm" variant="ghost" loading={busy && !form} onClick={() => run(() => api(`/execution/${projectId}/payments/remind`, { method: 'POST' }), 'Reminder sent to the customer')}><Bell className="size-4" />Remind</Button>}
        <Button size="sm" onClick={openRecord}><Plus className="size-4" />Record payment</Button>
      </div>
    )}>
      {data.credit && (data.credit.available > 0 || data.credit.balance < 0) && (
        <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 border px-3 py-2 text-sm ${data.credit.balance < 0 ? 'border-wine text-wine' : 'border-stone bg-wine-tint'}`}>
          <span className="flex items-center gap-2"><Gift className="size-4 shrink-0 text-wine" aria-hidden="true" />{data.credit.balance < 0 ? `Customer’s Refer & Earn wallet is ${inr(data.credit.balance)} (a used reward was reversed) — recover it in the balance as per policy.` : `Customer has ${inr(data.credit.available)} Refer & Earn credit${data.credit.maxUsable < data.credit.available ? ` (${inr(data.credit.maxUsable)} usable here)` : ''}.`}</span>
          {canManage && data.credit.maxUsable > 0 && <Button size="sm" variant="secondary" onClick={() => { setErrors({}); setMsg(null); setCrediting({ amount: data.credit.maxUsable, note: '' }); }}>Use credit</Button>}
        </div>
      )}
      {msg && !form && !voiding && !crediting && <Notice tone={msg.tone} className="mb-3">{msg.text}</Notice>}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="border border-stone p-3"><p className="text-xs text-graphite">Value</p><p className="tabular mt-0.5 text-base font-bold leading-tight">{inr(s.total)}</p></div>
        <div className="border border-stone p-3"><p className="text-xs text-graphite">Received</p><p className="tabular mt-0.5 text-base font-bold leading-tight text-success">{inr(s.paid)}</p></div>
        <div className="border border-wine bg-wine-tint p-3"><p className="text-xs text-graphite">Balance</p><p className="tabular mt-0.5 text-base font-bold leading-tight text-wine">{inr(s.balance)}</p></div>
      </div>
      <div className="mt-3 h-2 overflow-hidden bg-stone" role="progressbar" aria-valuenow={s.paidPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Paid">
        <div className="h-full bg-success transition-[width]" style={{ width: `${s.paidPercent}%` }} />
      </div>
      <p className="mt-1 text-xs text-graphite">{s.paidPercent}% received{s.creditApplied || s.discountApplied ? ` (incl. ${[s.discountApplied && `${inr(s.discountApplied)} coupon`, s.creditApplied && `${inr(s.creditApplied)} referral credit`].filter(Boolean).join(', ')})` : ''}{s.excess ? ` · ${inr(s.excess)} received over the contract value` : ''}{s.nextDue ? ` · Next: ${s.nextDue.label} ${inr(s.nextDue.amount)}${s.nextDue.dueOn ? ` by ${fmtDate(s.nextDue.dueOn)}` : ''}` : ''}</p>

      {canManage && s.balance > 0 && !s.discountApplied && (
        <div className="mt-3 flex gap-2">
          <input aria-label="Coupon code" className="h-9 min-w-0 flex-1 border border-stone-deep bg-paper px-2 text-sm uppercase" placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} />
          <Button size="sm" variant="secondary" disabled={!couponCode} loading={busy} onClick={async () => { if (await run(() => api(`/execution/${projectId}/payments/coupon`, { method: 'POST', body: { code: couponCode } }), 'Coupon applied')) setCouponCode(''); }}>Apply coupon</Button>
        </div>
      )}
      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-graphite">Schedule</h3>
      {s.schedule.length ? (
        <ul className="mt-2 divide-y divide-stone border-y border-stone text-sm">
          {s.schedule.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block truncate">{x.label}{x.percent ? <span className="text-graphite"> · {x.percent}%</span> : null}</span>
                <span className="block text-xs text-graphite">{inr(x.paid)} of {inr(x.amount)}{x.dueOn ? ` · due ${fmtDate(x.dueOn)}` : ''}</span>
              </span>
              <Pill tone={SCHEDULE_TONE[x.status]}>{SCHEDULE_LABEL[x.status]}</Pill>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-graphite">No schedule. Add milestones under “Edit plan & payments”, or just record payments.</p>}

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-graphite">Received & attempts</h3>
      {s.payments.length ? (
        <ul className="mt-2 divide-y divide-stone border-y border-stone text-sm">
          {[...s.payments].reverse().map((x) => (
            <li key={x.id} className={`py-2 ${x.status === 'VOID' || x.status === 'FAILED' ? 'text-graphite' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`tabular font-semibold ${x.status === 'VOID' ? 'line-through' : ''}`}>{inr(x.amount)}</span>
                <span className="flex items-center gap-2">
                  <Pill tone={PAY_TONE[x.status]}>{PAY_LABEL[x.status]}</Pill>
                  {canManage && x.status === 'RECEIVED' && <button type="button" className="text-graphite hover:text-wine" aria-label={`Void ${x.paymentNumber}`} title="Void (wrong entry)" onClick={() => { setErrors({}); setVoiding({ id: x.id, number: x.paymentNumber, reason: '' }); }}><Ban className="size-4" /></button>}
                </span>
              </div>
              <p className="text-xs text-graphite">
                {x.paymentNumber} · {METHOD_LABEL[x.method] || x.method} · {fmtDate(x.receivedAt || x.createdAt)}
                {x.scheduleLabel ? ` · ${x.scheduleLabel}` : ''}{x.reference ? ` · Ref ${x.reference}` : ''}{x.recordedBy ? ` · by ${x.recordedBy}` : ''}
              </p>
              {x.note && <p className="text-xs text-graphite">{x.note}</p>}
              {x.status === 'VOID' && <p className="text-xs text-wine">Voided: {x.voidReason}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-graphite">No payments yet.</p>}
      {!data.gateway?.onlineEnabled && <p className="mt-3 text-xs text-graphite">Online payment is off. Turn on Razorpay in Settings → Online payments to let customers pay from their dashboard.</p>}

      <Drawer open={Boolean(form)} onClose={() => setForm(null)} title="Record a payment" width="max-w-lg"
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button loading={busy} onClick={async () => {
          const okSaved = await run(() => api(`/execution/${projectId}/payments`, { method: 'POST', body: {
            amount: Number(form.amount), method: form.method, receivedAt: form.receivedAt ? new Date(`${form.receivedAt}T12:00:00`).toISOString() : undefined,
            scheduleItem: form.scheduleItem || null, reference: form.reference || undefined, note: form.note || undefined, notifyCustomer: form.notifyCustomer,
          } }), 'Payment recorded');
          if (okSaved) setForm(null);
        }}>Save payment</Button></>}>
        {form && (
          <>
            <p className="mb-4 text-sm text-graphite">Balance due: <strong className="text-charcoal">{inr(s.balance)}</strong>. Online (Razorpay) payments are added automatically.</p>
            <Fields value={form} onChange={setForm} errors={errors} fields={[
              { name: 'amount', label: 'Amount received (₹)', type: 'number', min: 1 },
              { name: 'method', label: 'Mode', type: 'select', placeholder: false, options: methods },
              { name: 'receivedAt', label: 'Received on', type: 'date' },
              { name: 'scheduleItem', label: 'Towards milestone', type: 'select', placeholder: 'Not linked — fills the next milestone', options: s.schedule.map((x) => ({ value: x.id, label: `${x.label} (${inr(x.due)} due)` })) },
              { name: 'reference', label: 'Reference', hint: 'UTR / cheque no. / transaction id (optional)' },
              { name: 'note', label: 'Note (internal)', type: 'textarea', rows: 2 },
              { name: 'notifyCustomer', label: 'Notify customer', type: 'switch', help: 'Send a payment receipt message' },
            ]} />
            {msg?.tone === 'error' && <Notice tone="error" className="mt-3">{msg.text}</Notice>}
          </>
        )}
      </Drawer>

      <Drawer open={Boolean(crediting)} onClose={() => setCrediting(null)} title="Use Refer & Earn credit" width="max-w-md"
        footer={<><Button variant="ghost" onClick={() => setCrediting(null)}>Cancel</Button><Button loading={busy} onClick={async () => {
          const okSaved = await run(() => api(`/execution/${projectId}/payments/credit`, { method: 'POST', body: { amount: Number(crediting.amount), note: crediting.note || undefined } }), 'Credit applied');
          if (okSaved) setCrediting(null);
        }}>Apply credit</Button></>}>
        {crediting && (
          <>
            <p className="mb-4 text-sm text-graphite">Available {inr(data.credit.available)} · usable here {inr(data.credit.maxUsable)}. The amount is deducted from the project balance (recorded as “Referral credit”, not cash). Void it to return the credit to the wallet.</p>
            <Fields value={crediting} onChange={setCrediting} errors={errors} fields={[{ name: 'amount', label: 'Credit to use (₹)', type: 'number', min: 1, max: data.credit.maxUsable }, { name: 'note', label: 'Note (optional)' }]} />
            {msg?.tone === 'error' && <Notice tone="error" className="mt-3">{msg.text}</Notice>}
          </>
        )}
      </Drawer>

      <Drawer open={Boolean(voiding)} onClose={() => setVoiding(null)} title={`Void ${voiding?.number || ''}`} width="max-w-md"
        footer={<><Button variant="ghost" onClick={() => setVoiding(null)}>Cancel</Button><Button loading={busy} disabled={(voiding?.reason || '').trim().length < 3} onClick={async () => {
          const okSaved = await run(() => api(`/execution/${projectId}/payments/${voiding.id}/void`, { method: 'POST', body: { reason: voiding.reason.trim() } }), 'Payment voided');
          if (okSaved) setVoiding(null);
        }}>Void payment</Button></>}>
        {voiding && (
          <>
            <p className="mb-4 text-sm text-graphite">Use this only for a wrong entry. The payment stays in the ledger as void, the balance is corrected, and the change is audited.</p>
            <Fields value={voiding} onChange={setVoiding} errors={errors} fields={[{ name: 'reason', label: 'Reason', type: 'textarea', rows: 2 }]} />
            {msg?.tone === 'error' && <Notice tone="error" className="mt-3">{msg.text}</Notice>}
          </>
        )}
      </Drawer>
    </Box>
  );
}
