const { ExecutionProject, Payment } = require('../models');
const pay = require('../services/paymentService');
const { isContractor } = require('../services/scopeService');
const notifications = require('../services/notifications/notificationService');
const { audit } = require('../services/auditService');
const { logActivity } = require('../services/activityService');
const { nextNumber } = require('../utils/sequence');
const { ok, created } = require('../utils/respond');
const { formatINR: inr } = require('../utils/money');

const formatINR = (v) => inr(v, { decimals: false });
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { CHANNELS } = require('../config/constants');

const METHOD_LABEL = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', CARD: 'Card', RAZORPAY: 'Online (Razorpay)', REFERRAL_CREDIT: 'Referral credit', COUPON: 'Coupon discount', OTHER: 'Other' };

async function loadStaffProject(req) {
  const p = await ExecutionProject.findById(req.params.id);
  if (!p) throw ApiError.notFound('Project not found');
  if (isContractor(req.user)) throw ApiError.forbidden('Only admins can view or record payments');
  return p;
}

async function loadCustomerProject(req) {
  const p = await ExecutionProject.findOne({ _id: req.params.id, customer: req.user._id });
  if (!p) throw ApiError.notFound('Project not found');
  return p;
}

const scheduleLabel = (p, id) => (id ? p.paymentSchedule.id(id)?.label : undefined);

function notifyReceived(project, payment) {
  notifications.send({
    user: project.customer,
    event: 'PAYMENT_RECEIVED',
    channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
    variables: {
      title: 'Payment received',
      body: `We received ${formatINR(payment.amount)} for ${project.projectNumber} (receipt ${payment.paymentNumber}). Thank you!`,
      amount: formatINR(payment.amount), receipt: payment.paymentNumber, projectNumber: project.projectNumber,
    },
    link: `/account/projects/${project._id}`,
  }).catch((err) => logger.warn('Payment notification failed', { error: err.message }));
}

/** Customer's Refer & Earn wallet as it applies to this project (null when they are not a referrer). */
async function creditInfo(project) {
  const referral = require('../services/referralService');
  const w = await referral.wallet(project.customer);
  if (!w) return null;
  const [s, cfg] = await Promise.all([pay.summary(project), referral.getConfig()]);
  const cap = Math.max(0, Math.floor((s.total * (cfg.maxRedeemPercent ?? 100)) / 100) - s.creditApplied);
  return { available: w.available, balance: w.balance, status: w.status, maxUsable: Math.max(0, Math.min(w.available, s.balance, cap)), maxRedeemPercent: cfg.maxRedeemPercent ?? 100 };
}

async function applyCredit(req, res, p) {
  const referral = require('../services/referralService');
  const { payment } = await referral.redeem({ project: p, amount: req.body.amount, actor: req.user, note: req.body.note });
  await audit(req, { action: 'REFERRAL_CREDIT_USED', entityType: 'Payment', entityId: payment._id, after: { project: p.projectNumber, amount: payment.amount, by: req.user.role } });
  await logActivity({ booking: p.booking, actor: req.user, type: 'PAYMENT_RECEIVED', message: `${formatINR(payment.amount)} paid with Refer & Earn credit — ${payment.paymentNumber}`, visibleToCustomer: true });
  notifications.send({
    user: p.customer, event: 'PAYMENT_RECEIVED', channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
    variables: { title: 'Referral credit applied', body: `${formatINR(payment.amount)} of your Refer & Earn credit was applied to ${p.projectNumber} (receipt ${payment.paymentNumber}).`, amount: formatINR(payment.amount), receipt: payment.paymentNumber, projectNumber: p.projectNumber },
    link: `/account/projects/${p._id}`,
  }).catch((err) => logger.warn('Payment notification failed', { error: err.message }));
  created(res, { summary: await pay.summary(p), credit: await creditInfo(p) }, `${formatINR(payment.amount)} credit applied`);
}

// ── Coupons ──
async function applyCoupon(req, res, p) {
  const coupons = require('../services/couponService');
  const r = await coupons.apply(req.body.code, p, req.user);
  await audit(req, { action: 'COUPON_APPLIED', entityType: 'Payment', entityId: r.payment._id, after: { project: p.projectNumber, code: r.coupon.code, discount: r.discount, by: req.user.role } });
  await logActivity({ booking: p.booking, actor: req.user, type: 'PAYMENT_RECEIVED', message: `Coupon ${r.coupon.code} applied — ${formatINR(r.discount)} off (${r.payment.paymentNumber})`, visibleToCustomer: true });
  require('../services/referralService').syncLater(p.booking);
  created(res, { summary: await pay.summary(p), credit: await creditInfo(p), discount: r.discount, code: r.coupon.code }, `Coupon applied — ${formatINR(r.discount)} off`);
}
/** Customer: check a code before applying (shows the discount). */
exports.checkCouponCustomer = asyncHandler(async (req, res) => {
  const p = await loadCustomerProject(req);
  const r = await require('../services/couponService').evaluate(req.body.code, p);
  ok(res, { code: r.coupon.code, discount: r.discount, label: r.label, description: r.coupon.description || null, balanceAfter: r.summary.balance - r.discount }, `${formatINR(r.discount)} off`);
});
exports.applyCouponCustomer = asyncHandler(async (req, res) => applyCoupon(req, res, await loadCustomerProject(req)));
exports.applyCouponStaff = asyncHandler(async (req, res) => applyCoupon(req, res, await loadStaffProject(req)));

/** Staff apply the customer's wallet credit to their project. */
exports.applyCreditStaff = asyncHandler(async (req, res) => applyCredit(req, res, await loadStaffProject(req)));
/** Customer uses their own wallet credit on their project. */
exports.applyCreditCustomer = asyncHandler(async (req, res) => applyCredit(req, res, await loadCustomerProject(req)));

async function publicConfig() {
  const cfg = await pay.getConfig();
  return { onlineEnabled: cfg.razorpayReady, provider: cfg.razorpayReady ? 'RAZORPAY' : null };
}

// ── Staff ─────────────────────────────────────────────────────
exports.staffList = asyncHandler(async (req, res) => {
  const p = await loadStaffProject(req);
  ok(res, { summary: await pay.summary(p), credit: await creditInfo(p), methods: Object.entries(METHOD_LABEL).filter(([k]) => !['RAZORPAY', 'REFERRAL_CREDIT', 'COUPON'].includes(k)).map(([value, label]) => ({ value, label })), gateway: await publicConfig() });
});

/** Records an offline payment (cash, UPI, bank transfer, cheque, card swipe …). */
exports.record = asyncHandler(async (req, res) => {
  const p = await loadStaffProject(req);
  const b = req.body;
  if (b.scheduleItem && !p.paymentSchedule.id(b.scheduleItem)) throw ApiError.badRequest('Milestone not found in this project', 'INVALID_MILESTONE');
  const payment = await Payment.create({
    paymentNumber: await nextNumber('PAY'),
    project: p._id, booking: p.booking, customer: p.customer,
    scheduleItem: b.scheduleItem || undefined, scheduleLabel: scheduleLabel(p, b.scheduleItem),
    amount: b.amount, method: b.method, status: 'RECEIVED',
    receivedAt: b.receivedAt || new Date(), reference: b.reference, note: b.note, recordedBy: req.user._id,
  });
  await audit(req, { action: 'PAYMENT_RECORDED', entityType: 'Payment', entityId: payment._id, after: { project: p.projectNumber, amount: payment.amount, method: payment.method, reference: payment.reference } });
  await logActivity({ booking: p.booking, actor: req.user, type: 'PAYMENT_RECEIVED', message: `${formatINR(payment.amount)} received (${METHOD_LABEL[payment.method]}) — ${payment.paymentNumber}`, visibleToCustomer: true });
  if (b.notifyCustomer !== false) notifyReceived(p, payment);
  require('../services/referralService').syncLater(p.booking);
  created(res, { summary: await pay.summary(p) }, 'Payment recorded');
});

/** Payments are never deleted: a wrong entry is voided with a reason (kept in the ledger and audit log). */
exports.void = asyncHandler(async (req, res) => {
  const p = await loadStaffProject(req);
  const payment = await Payment.findOne({ _id: req.params.paymentId, project: p._id });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status === 'VOID') throw ApiError.conflict('Payment already voided', 'ALREADY_VOID');
  const before = { status: payment.status, amount: payment.amount };
  payment.status = 'VOID';
  payment.voidedAt = new Date();
  payment.voidedBy = req.user._id;
  payment.voidReason = req.body.reason;
  await payment.save();
  await audit(req, { action: 'PAYMENT_VOIDED', entityType: 'Payment', entityId: payment._id, before, after: { status: 'VOID' }, reason: req.body.reason });
  require('../services/referralService').syncLater(p.booking);
  await logActivity({ booking: p.booking, actor: req.user, type: 'PAYMENT_VOIDED', message: `${payment.paymentNumber} voided: ${req.body.reason}` });
  ok(res, { summary: await pay.summary(p) }, 'Payment voided');
});

/** Sends the customer a reminder for the next amount due (in-app + WhatsApp). */
exports.remind = asyncHandler(async (req, res) => {
  const p = await loadStaffProject(req);
  const s = await pay.summary(p);
  if (!s.balance) throw ApiError.conflict('Nothing is due on this project', 'NOTHING_DUE');
  const amount = s.nextDue?.amount || s.balance;
  await notifications.send({
    user: p.customer, event: 'PAYMENT_DUE', channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
    variables: {
      title: 'Payment due',
      body: `${s.nextDue?.label ? `${s.nextDue.label}: ` : ''}${formatINR(amount)} is due for ${p.projectNumber}. Balance ${formatINR(s.balance)}.`,
      amount: formatINR(amount), balance: formatINR(s.balance), projectNumber: p.projectNumber,
    },
    link: `/account/projects/${p._id}`,
  });
  await audit(req, { action: 'PAYMENT_REMINDER_SENT', entityType: 'ExecutionProject', entityId: p._id, meta: { amount } });
  ok(res, { ok: true }, 'Reminder sent to the customer');
});

// ── Customer ─────────────────────────────────────────────────
exports.customerList = asyncHandler(async (req, res) => {
  const p = await loadCustomerProject(req);
  const s = await pay.summary(p);
  ok(res, { summary: { ...s, payments: s.payments.filter((x) => x.status === 'RECEIVED').map(({ recordedBy, note, voidReason, voidedAt, ...x }) => x) }, credit: await creditInfo(p), gateway: await publicConfig() });
});

/** Starts an online payment: creates a Razorpay order for the chosen amount. */
exports.createOrder = asyncHandler(async (req, res) => {
  const p = await loadCustomerProject(req);
  const cfg = await pay.getConfig();
  if (!cfg.razorpayReady) throw ApiError.conflict('Online payment is not available right now. Please contact us to pay.', 'ONLINE_PAYMENT_OFF');
  const s = await pay.summary(p);
  if (s.balance <= 0) throw ApiError.conflict('There is no balance due on this project', 'NOTHING_DUE');
  const amount = Math.round(Number(req.body.amount));
  if (amount < 1 || amount > s.balance) throw new ApiError(422, `Enter an amount between ₹1 and ${formatINR(s.balance)}`, 'VALIDATION_ERROR', [{ field: 'amount', message: 'Out of range' }]);
  const item = req.body.scheduleItem && p.paymentSchedule.id(req.body.scheduleItem);

  const paymentNumber = await nextNumber('PAY');
  const order = await pay.createRazorpayOrder(cfg, { amount, receipt: paymentNumber, notes: { project: p.projectNumber, payment: paymentNumber } });
  await Payment.create({
    paymentNumber, project: p._id, booking: p.booking, customer: p.customer,
    scheduleItem: item?._id, scheduleLabel: item?.label, amount, method: 'RAZORPAY', status: 'CREATED',
    razorpay: { orderId: order.id },
  });
  ok(res, {
    keyId: cfg.keyId, orderId: order.id, amount: order.amount, currency: order.currency, paymentNumber,
    name: 'INSIDER INDIA LLP', description: `${p.projectNumber}${item ? ` — ${item.label}` : ''}`,
    prefill: { name: req.user.name || '', contact: req.user.mobile ? `+91${req.user.mobile}` : '', email: req.user.email || '' },
  });
});

async function markReceived(payment, { paymentId, signature, method }) {
  if (payment.status === 'RECEIVED') return false;
  payment.status = 'RECEIVED';
  payment.receivedAt = new Date();
  payment.reference = paymentId;
  payment.razorpay = { ...(payment.razorpay?.toObject?.() || payment.razorpay || {}), paymentId, signature, method };
  await payment.save();
  const project = await ExecutionProject.findById(payment.project);
  if (project) {
    require('../services/referralService').syncLater(project.booking);
    await logActivity({ booking: project.booking, type: 'PAYMENT_RECEIVED', message: `${formatINR(payment.amount)} received online — ${payment.paymentNumber}`, visibleToCustomer: true });
    notifyReceived(project, payment);
  }
  return true;
}

/** Called by the checkout handler with Razorpay's signed response. */
exports.verify = asyncHandler(async (req, res) => {
  const p = await loadCustomerProject(req);
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  const payment = await Payment.findOne({ project: p._id, 'razorpay.orderId': orderId });
  if (!payment) throw ApiError.notFound('Payment not found');
  const cfg = await pay.getConfig();
  if (!pay.verifyCheckoutSignature(cfg, orderId, paymentId, signature)) {
    logger.warn('Razorpay signature mismatch', { orderId, paymentId });
    throw ApiError.badRequest('Payment could not be verified. If money was deducted it will be confirmed automatically, or refunded by your bank.', 'SIGNATURE_INVALID');
  }
  await markReceived(payment, { paymentId, signature });
  ok(res, { summary: (await pay.summary(p)), paymentNumber: payment.paymentNumber }, 'Payment received');
});

/** Customer closed the checkout or it failed — keeps the ledger tidy. */
exports.cancelOrder = asyncHandler(async (req, res) => {
  const p = await loadCustomerProject(req);
  await Payment.updateOne({ project: p._id, 'razorpay.orderId': req.body.orderId, status: 'CREATED' }, { $set: { status: 'FAILED', note: req.body.reason || 'Checkout closed' } });
  ok(res, { ok: true });
});

/** Razorpay webhook (payment.captured / order.paid): confirms payments even if the browser closed. */
exports.webhook = asyncHandler(async (req, res) => {
  const cfg = await pay.getConfig();
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!pay.verifyWebhookSignature(cfg, raw, req.get('X-Razorpay-Signature'))) {
    logger.warn('Razorpay webhook signature invalid');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }
  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ success: false, message: 'Bad payload' }); }
  const entity = event?.payload?.payment?.entity;
  if (['payment.captured', 'order.paid'].includes(event.event) && entity?.order_id) {
    const payment = await Payment.findOne({ 'razorpay.orderId': entity.order_id });
    if (payment) await markReceived(payment, { paymentId: entity.id, method: entity.method });
  } else if (event.event === 'payment.failed' && entity?.order_id) {
    await Payment.updateOne({ 'razorpay.orderId': entity.order_id, status: 'CREATED' }, { $set: { status: 'FAILED', note: entity.error_description || 'Payment failed' } });
  }
  return res.json({ success: true });
});
