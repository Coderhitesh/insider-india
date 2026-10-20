const crypto = require('crypto');
const { Payment } = require('../models');
const settings = require('./settingsService');
const { httpRequest } = require('../utils/http');
const { safeEqualHex } = require('../utils/crypto');
const ApiError = require('../utils/ApiError');
const { PAYMENT_PROVIDER } = require('../config/defaults');

const RAZORPAY_API = 'https://api.razorpay.com/v1';

async function getConfig() {
  const c = (await settings.get('providers.payment', PAYMENT_PROVIDER)) || PAYMENT_PROVIDER;
  const rp = c.razorpay || {};
  const razorpayReady = c.active === 'RAZORPAY' && Boolean(rp.keyId && rp.keySecret);
  return { active: c.active, razorpayReady, keyId: rp.keyId, keySecret: rp.keySecret, webhookSecret: rp.webhookSecret };
}

const authHeader = (cfg) => `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64')}`;

/** Creates a Razorpay order (amount in rupees → paise). */
async function createRazorpayOrder(cfg, { amount, receipt, notes }) {
  const r = await httpRequest(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(cfg), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: String(receipt).slice(0, 40), notes }),
  });
  if (!r.ok || !r.data?.id) throw new ApiError(502, `Payment gateway error: ${r.data?.error?.description || r.error || `HTTP ${r.status}`}`, 'PAYMENT_GATEWAY_ERROR');
  return r.data;
}

/** Checks the keys by listing one order (no money moves). */
async function testRazorpay() {
  const cfg = await getConfig();
  if (!cfg.keyId || !cfg.keySecret) throw ApiError.badRequest('Enter the Razorpay Key ID and Key Secret, then save');
  const r = await httpRequest(`${RAZORPAY_API}/orders?count=1`, { headers: { Authorization: authHeader(cfg) } });
  if (!r.ok) throw new ApiError(502, `Razorpay rejected the keys: ${r.data?.error?.description || r.error || `HTTP ${r.status}`}`, 'PROVIDER_TEST_FAILED');
  return true;
}

const hmacHex = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');
const verifyCheckoutSignature = (cfg, orderId, paymentId, signature) => Boolean(signature) && safeEqualHex(hmacHex(cfg.keySecret, `${orderId}|${paymentId}`), String(signature));
const verifyWebhookSignature = (cfg, rawBody, signature) => Boolean(cfg.webhookSecret && signature) && safeEqualHex(hmacHex(cfg.webhookSecret, rawBody), String(signature));

/**
 * Totals for a project: contract value, received, balance, and each schedule milestone with the amount
 * paid towards it (payments linked to a milestone first; unlinked payments fill milestones in order).
 */
async function summary(project) {
  const payments = await Payment.find({ project: project._id }).sort({ receivedAt: 1, createdAt: 1 }).populate('recordedBy', 'name').lean();
  const received = payments.filter((p) => p.status === 'RECEIVED');
  const total = Math.round(project.grandTotal || 0);
  const paid = received.reduce((s, p) => s + p.amount, 0);
  const creditApplied = received.filter((p) => p.method === 'REFERRAL_CREDIT').reduce((s, p) => s + p.amount, 0);
  const discountApplied = received.filter((p) => p.method === 'COUPON').reduce((s, p) => s + p.amount, 0);

  const schedule = (project.paymentSchedule || []).map((s) => ({
    id: String(s._id), label: s.label, percent: s.percent, amount: Math.round(s.amount || (s.percent ? (total * s.percent) / 100 : 0)), dueOn: s.dueOn, paid: 0,
  }));
  const byId = new Map(schedule.map((s) => [s.id, s]));
  let pool = 0;
  for (const p of received) {
    const item = p.scheduleItem && byId.get(String(p.scheduleItem));
    if (item) {
      const take = Math.min(p.amount, Math.max(0, item.amount - item.paid));
      item.paid += take;
      pool += p.amount - take;
    } else pool += p.amount;
  }
  for (const s of schedule) {
    const take = Math.min(pool, Math.max(0, s.amount - s.paid));
    s.paid += take;
    pool -= take;
  }
  const now = Date.now();
  schedule.forEach((s) => {
    s.due = Math.max(0, s.amount - s.paid);
    s.status = s.due <= 0 && s.amount > 0 ? 'PAID' : s.paid > 0 ? 'PARTIAL' : s.dueOn && new Date(s.dueOn).getTime() < now ? 'OVERDUE' : 'PENDING';
  });
  const next = schedule.find((s) => s.due > 0) || null;

  return {
    total,
    paid,
    creditApplied,
    discountApplied,
    cashPaid: paid - creditApplied - discountApplied,
    balance: Math.max(0, total - paid),
    excess: Math.max(0, paid - total),
    paidPercent: total ? Math.min(100, Math.round((paid / total) * 100)) : 0,
    schedule,
    nextDue: next ? { id: next.id, label: next.label, amount: next.due, dueOn: next.dueOn } : null,
    payments: payments.map((p) => ({
      id: String(p._id), paymentNumber: p.paymentNumber, amount: p.amount, method: p.method, status: p.status,
      receivedAt: p.receivedAt, reference: p.reference, note: p.note, scheduleItem: p.scheduleItem ? String(p.scheduleItem) : null,
      scheduleLabel: p.scheduleLabel, recordedBy: p.recordedBy?.name || null, razorpayPaymentId: p.razorpay?.paymentId || null,
      voidReason: p.voidReason, voidedAt: p.voidedAt, createdAt: p.createdAt,
    })),
  };
}

module.exports = { getConfig, createRazorpayOrder, testRazorpay, verifyCheckoutSignature, verifyWebhookSignature, summary };
