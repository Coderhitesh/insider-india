'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { CreditCard, ShieldCheck, CheckCircle2, Gift, TicketPercent } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Panel, Row } from '@/components/account/Bits';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatDate, formatINR } from '@/lib/format';

const METHOD = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', CARD: 'Card', RAZORPAY: 'Online', REFERRAL_CREDIT: 'Referral credit', COUPON: 'Coupon discount', OTHER: 'Other' };
const STATUS = { PAID: ['Paid', 'text-success'], PARTIAL: ['Part paid', 'text-[#7a4b00]'], OVERDUE: ['Overdue', 'text-wine'], PENDING: ['Pending', 'text-graphite'] };

let scriptPromise;
function loadRazorpay() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve(true);
  scriptPromise = scriptPromise || new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => { scriptPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/** Customer view: what is paid, what is due, and (when Razorpay is on) a Pay online button. */
export default function ProjectPayments({ projectId }) {
  const { data, error, loading, reload } = useApi(`/account/projects/${projectId}/payments`);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [credit, setCredit] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponCheck, setCouponCheck] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);
  if (loading && !data) return null;
  if (error) return null;
  const s = data.summary;
  if (!s.total && !s.payments.length) return null;
  const online = data.gateway?.onlineEnabled && s.balance > 0;
  const suggested = s.nextDue?.amount || s.balance;

  const pay = async () => {
    const value = Math.round(Number(amount || suggested));
    if (!value || value < 1 || value > s.balance) { setMsg({ tone: 'error', text: `Enter an amount between ₹1 and ${formatINR(s.balance)}` }); return; }
    setBusy(true); setMsg(null);
    try {
      if (!(await loadRazorpay())) throw new Error('Could not load the payment window. Check your internet connection and try again.');
      const scheduleItem = s.nextDue && value <= s.nextDue.amount ? s.nextDue.id : null;
      const { data: o } = await api(`/account/projects/${projectId}/payments/order`, { method: 'POST', body: { amount: value, scheduleItem } });
      await new Promise((resolve) => {
        const rz = new window.Razorpay({
          key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency, name: o.name, description: o.description, prefill: o.prefill,
          theme: { color: '#c8102e' },
          handler: async (resp) => {
            try {
              const r = await api(`/account/projects/${projectId}/payments/verify`, { method: 'POST', body: resp });
              setMsg({ tone: 'success', text: `Payment received. Receipt ${r.data.paymentNumber}. Thank you!` });
              setAmount('');
            } catch (x) { setMsg({ tone: 'error', text: x.message }); }
            reload(); resolve();
          },
          modal: { ondismiss: () => { api(`/account/projects/${projectId}/payments/cancel`, { method: 'POST', body: { orderId: o.orderId } }).catch(() => {}); resolve(); } },
        });
        rz.on('payment.failed', (r) => setMsg({ tone: 'error', text: r?.error?.description || 'Payment failed. No money was taken; please try again.' }));
        rz.open();
      });
    } catch (x) { setMsg({ tone: 'error', text: x.message }); } finally { setBusy(false); }
  };

  const c = data.credit;
  const useCredit = async () => {
    const value = Math.round(Number(credit || c.maxUsable));
    if (!value || value < 1 || value > c.maxUsable) { setMsg({ tone: 'error', text: `Enter an amount between ₹1 and ${formatINR(c.maxUsable)}` }); return; }
    if (!window.confirm(`Use ${formatINR(value)} of your Refer & Earn credit on this project? Your balance due will reduce by this amount.`)) return;
    setBusy(true); setMsg(null);
    try { const r = await api(`/account/projects/${projectId}/payments/credit`, { method: 'POST', body: { amount: value } }); setMsg({ tone: 'success', text: r.message }); setCredit(''); reload(); } catch (x) { setMsg({ tone: 'error', text: x.message }); } finally { setBusy(false); }
  };

  const checkCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setBusy(true); setCouponMsg(null); setCouponCheck(null);
    try { const r = await api(`/account/projects/${projectId}/payments/coupon/check`, { method: 'POST', body: { code } }); setCouponCheck(r.data); } catch (x) { setCouponMsg({ tone: 'error', text: x.message }); } finally { setBusy(false); }
  };
  const applyCoupon = async () => {
    setBusy(true); setCouponMsg(null);
    try { const r = await api(`/account/projects/${projectId}/payments/coupon`, { method: 'POST', body: { code: couponCheck.code } }); setCouponMsg({ tone: 'success', text: r.message }); setCouponCheck(null); setCoupon(''); reload(); } catch (x) { setCouponMsg({ tone: 'error', text: x.message }); } finally { setBusy(false); }
  };

  return (
    <Panel title="Payments">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-blush/60 p-2"><p className="text-[0.7rem] text-graphite">Project value</p><p className="tabular text-sm font-semibold">{formatINR(s.total)}</p></div>
        <div className="rounded-lg bg-success/10 p-2"><p className="text-[0.7rem] text-graphite">{s.creditApplied || s.discountApplied ? 'Paid + discounts' : 'Paid'}</p><p className="tabular text-sm font-semibold text-success">{formatINR(s.paid)}</p></div>
        <div className="rounded-lg bg-wine p-2 text-paper"><p className="text-[0.7rem] text-paper/80">Balance</p><p className="tabular text-sm font-semibold">{formatINR(s.balance)}</p></div>
      </div>
      {(s.creditApplied > 0 || s.discountApplied > 0) && <p className="mt-2 text-xs text-graphite">Includes {[s.discountApplied > 0 && `${formatINR(s.discountApplied)} coupon discount`, s.creditApplied > 0 && `${formatINR(s.creditApplied)} Refer & Earn credit`].filter(Boolean).join(' and ')}.</p>}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone" role="progressbar" aria-valuenow={s.paidPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Paid">
        <div className="h-full rounded-full bg-success" style={{ width: `${s.paidPercent}%` }} />
      </div>

      {s.schedule.length > 0 && (
        <dl className="mt-4">
          {s.schedule.map((x) => (
            <Row key={x.id} label={`${x.label}${x.percent ? ` (${x.percent}%)` : ''}`}>
              <span className="tabular block">{formatINR(x.amount)}</span>
              <span className={clsx('block text-xs', STATUS[x.status][1])}>{x.status === 'PARTIAL' ? `${formatINR(x.paid)} paid` : STATUS[x.status][0]}{x.status !== 'PAID' && x.dueOn ? ` · due ${formatDate(x.dueOn)}` : ''}</span>
            </Row>
          ))}
        </dl>
      )}

      {s.balance > 0 && !s.discountApplied && (
        <div className="mt-5 rounded-xl border border-dashed border-stone-deep p-4">
          <label htmlFor="coupon" className="flex items-center gap-2 text-sm font-medium"><TicketPercent className="size-4 text-wine" aria-hidden="true" />Have a coupon code?</label>
          <div className="mt-2 flex gap-2">
            <input id="coupon" value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30)); setCouponCheck(null); setCouponMsg(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkCoupon(); } }}
              placeholder="Enter code" className="tabular h-11 min-w-0 flex-1 rounded-lg border border-stone-deep bg-paper px-3 text-base uppercase tracking-wider focus:border-wine focus:outline-none" />
            <Button variant="secondary" className="h-11 shrink-0" onClick={checkCoupon} loading={busy && !couponCheck} disabled={!coupon.trim()}>Check</Button>
          </div>
          {couponCheck && (
            <div className="mt-3 rounded-lg bg-success/10 p-3 text-sm">
              <p className="font-medium text-success">{couponCheck.code}: {couponCheck.label} — you save {formatINR(couponCheck.discount)}</p>
              {couponCheck.description && <p className="mt-0.5 text-xs text-graphite">{couponCheck.description}</p>}
              <p className="mt-1 text-xs text-graphite">Balance after discount: {formatINR(couponCheck.balanceAfter)}. Only one coupon per project.</p>
              <Button size="sm" className="mt-2" onClick={applyCoupon} loading={busy}>Apply coupon</Button>
            </div>
          )}
          {couponMsg && <Notice tone={couponMsg.tone} className="mt-3">{couponMsg.text}</Notice>}
        </div>
      )}
      {s.discountApplied > 0 && couponMsg?.tone === 'success' && <Notice tone="success" className="mt-3">{couponMsg.text}</Notice>}
      {c?.maxUsable > 0 && (
        <div className="mt-5 rounded-xl border border-wine/40 bg-blush/50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><Gift className="size-4 text-wine" aria-hidden="true" />You have {formatINR(c.available)} Refer & Earn credit</p>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-graphite">₹</span>
              <input aria-label="Credit to use" inputMode="numeric" className="h-11 w-full rounded-lg border border-stone-deep bg-paper pl-7 pr-3 text-base focus:border-wine focus:outline-none" placeholder={String(c.maxUsable)} value={credit} onChange={(e) => setCredit(e.target.value.replace(/\D/g, '').slice(0, 9))} />
            </div>
            <Button onClick={useCredit} loading={busy} variant="secondary" className="h-11 shrink-0">Use credit</Button>
          </div>
          <p className="mt-2 text-xs text-graphite">Up to {formatINR(c.maxUsable)} on this project{c.maxRedeemPercent < 100 ? ` (max ${c.maxRedeemPercent}% of the project value)` : ''}. The rest is paid as usual.</p>
        </div>
      )}
      {online && (
        <div className="mt-5 rounded-xl border border-stone p-4">
          <label htmlFor="pay-amount" className="text-sm font-medium">Pay online{s.nextDue ? ` — ${s.nextDue.label}` : ''}</label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-graphite">₹</span>
              <input id="pay-amount" inputMode="numeric" className="h-11 w-full rounded-lg border border-stone-deep bg-paper pl-7 pr-3 text-base focus:border-wine focus:outline-none" placeholder={String(suggested)} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 9))} />
            </div>
            <Button onClick={pay} loading={busy} className="h-11 shrink-0"><CreditCard className="size-4" />Pay</Button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-graphite"><ShieldCheck className="size-3.5 text-wine" aria-hidden="true" />UPI, cards and net banking via Razorpay. Leave blank to pay {formatINR(suggested)}.</p>
        </div>
      )}
      {!online && s.balance > 0 && <p className="mt-4 text-xs text-graphite">To pay, please contact your project manager. Every payment you make is recorded here with a receipt number.</p>}
      {s.balance === 0 && s.total > 0 && <p className="mt-4 flex items-center gap-1.5 text-sm text-success"><CheckCircle2 className="size-4" aria-hidden="true" />Fully paid. Thank you!</p>}
      {msg && <Notice tone={msg.tone} className="mt-3">{msg.text}</Notice>}

      {s.payments.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-graphite">Payment history</h3>
          <ul className="mt-1 divide-y divide-stone text-sm">
            {[...s.payments].reverse().map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="tabular block font-medium">{formatINR(x.amount)}</span>
                  <span className="block text-xs text-graphite">{formatDate(x.receivedAt)} · {METHOD[x.method] || x.method}{x.scheduleLabel ? ` · ${x.scheduleLabel}` : ''}</span>
                </span>
                <span className="tabular text-xs text-graphite">{x.paymentNumber}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
