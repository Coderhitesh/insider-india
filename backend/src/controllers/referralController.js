const { Referral, Referrer, Lead, Booking, User, Payment } = require('../models');
const svc = require('../services/referralService');
const { audit } = require('../services/auditService');
const { logActivity } = require('../services/activityService');
const { encrypt, decrypt } = require('../utils/crypto');
const { nextNumber } = require('../utils/sequence');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { ok, created } = require('../utils/respond');
const { formatINR: inr } = require('../utils/money');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeMobile } = require('../utils/phone');
const env = require('../config/env');

const fmt = (v) => inr(v, { decimals: false });
const mask = (s) => (s ? `•••• ${s}` : null);

// ── Views ─────────────────────────────────────────────────────
function referrerView(r, { full = false } = {}) {
  const p = r.payout || {};
  return {
    id: String(r._id), code: r.code, name: r.name, mobile: r.mobile, city: r.city, type: r.type, status: r.status,
    suspendedReason: r.suspendedReason, termsAcceptedAt: r.termsAcceptedAt, createdAt: r.createdAt,
    payout: {
      method: p.method || null, upiId: p.upiId || null, accountName: p.accountName || null, bankName: p.bankName || null, ifsc: p.ifsc || null,
      accountNumber: full && p.accountNumberEnc ? decrypt(p.accountNumberEnc) : mask(p.accountLast4),
      pan: full && p.panEnc ? decrypt(p.panEnc) : mask(p.panLast4),
      complete: Boolean(p.method === 'UPI' ? p.upiId : p.method === 'BANK' && p.accountNumberEnc && p.ifsc && p.accountName),
      updatedAt: p.updatedAt,
    },
  };
}

function referralView(x, { staff = false } = {}) {
  const o = x.toObject ? x.toObject() : x;
  return {
    id: String(o._id), referralNumber: o.referralNumber, source: o.source, status: o.status, statusLabel: svc.LABEL[o.status],
    customer: staff ? o.customer : { name: o.customer?.name, mobile: o.customer?.mobile ? `••••••${o.customer.mobile.slice(-4)}` : null, city: o.customer?.city },
    projectValue: o.projectValue, slabKey: o.slabKey, slabLabel: o.slabLabel, level: o.level,
    rewardAmount: o.rewardAmount, qualifiedAt: o.qualifiedAt, payableBy: o.payableBy, approvedAt: o.approvedAt, paidAt: o.paidAt,
    payout: o.paidAt ? { reference: o.payout?.reference, tdsAmount: o.payout?.tdsAmount, netAmount: o.payout?.netAmount, method: o.payout?.method } : null,
    rejectReason: o.rejectReason, withheldReason: o.withheldReason,
    timeline: (o.timeline || []).map((t) => ({ status: t.status, label: svc.LABEL[t.status], at: t.at, ...(staff ? { note: t.note, auto: t.auto } : { note: ['REJECTED', 'WITHHELD', 'REWARD_PAID'].includes(t.status) ? t.note : undefined }) })),
    createdAt: o.createdAt,
    ...(staff ? {
      referrer: o.referrer?.code ? { id: String(o.referrer._id), code: o.referrer.code, name: o.referrer.name, mobile: o.referrer.mobile, type: o.referrer.type, status: o.referrer.status } : String(o.referrer),
      checks: o.checks, leadId: o.lead ? String(o.lead._id || o.lead) : null, bookingId: o.booking ? String(o.booking._id || o.booking) : null,
      bookingNumber: o.booking?.bookingNumber, projectId: o.project ? String(o.project) : null, linkedManually: o.linkedManually,
      rewardCalculated: o.rewardCalculated, approvalNote: o.approvalNote, recoveryReview: o.recoveryReview, valueBasis: o.valueBasis,
      consentAt: o.consentAt, payoutDetails: o.payout?.details,
    } : {}),
  };
}

async function publicProgram() {
  const cfg = await svc.getConfig();
  return {
    enabled: Boolean(cfg.enabled), programName: cfg.programName,
    slabs: (cfg.slabs || []).map((s) => ({ key: s.key, label: s.label, rewards: s.rewards })),
    levels: Math.max(...(cfg.slabs || [{ rewards: [0] }]).map((s) => s.rewards.length)),
    afterLastLevel: cfg.afterLastLevel, countingPeriod: cfg.countingPeriod, payoutTrigger: cfg.payoutTrigger,
    maxRedeemPercent: cfg.maxRedeemPercent ?? 100, valueBasis: cfg.valueBasis, terms: cfg.terms,
  };
}

// ── Public ───────────────────────────────────────────────────
exports.program = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  ok(res, { program: await publicProgram() });
});

// ── Customer (referrer) ─────────────────────────────────────
async function myReferrer(req) {
  return Referrer.findOne({ user: req.user._id });
}

exports.mine = asyncHandler(async (req, res) => {
  const cfg = await svc.getConfig();
  const referrer = await myReferrer(req);
  if (!referrer) return ok(res, { program: await publicProgram(), referrer: null, referrals: [], stats: null });
  const refs = await Referral.find({ referrer: referrer._id }).sort({ createdAt: -1 });
  for (const r of refs) await svc.sync(r).catch(() => {});
  const sum = (f) => refs.filter(f).reduce((s, r) => s + (r.rewardAmount || 0), 0);
  ok(res, {
    program: await publicProgram(),
    referrer: referrerView(referrer),
    shareUrl: `${env.frontendUrl}/book-consultation?ref=${encodeURIComponent(referrer.code)}`,
    referrals: refs.map((r) => referralView(r)),
    stats: {
      total: refs.length,
      inProgress: refs.filter((r) => !['REJECTED', 'WITHHELD', 'REWARD_PAID', 'REWARD_APPROVED'].includes(r.status)).length,
      successful: refs.filter((r) => svc.COUNTED.includes(r.status)).length,
      pending: sum((r) => r.status === 'ADVANCE_RECEIVED'),
    },
    wallet: await svc.wallet(referrer),
    next: await svc.nextLevelInfo(referrer, cfg),
  });
});

exports.join = asyncHandler(async (req, res) => {
  const cfg = await svc.getConfig();
  if (!cfg.enabled) throw ApiError.conflict('Refer & Earn is not open yet.', 'PROGRAM_OFF');
  if (req.user.role !== 'CUSTOMER') throw ApiError.forbidden('Staff accounts cannot join Refer & Earn');
  const existing = await myReferrer(req);
  if (existing) return ok(res, { referrer: referrerView(existing) }, 'Already registered');
  const name = (req.body.name || req.user.name || '').trim();
  if (name.length < 2) throw new ApiError(422, 'Enter your full name', 'VALIDATION_ERROR', [{ field: 'name', message: 'Enter your full name' }]);
  if (!req.user.name) await User.updateOne({ _id: req.user._id }, { $set: { name } });
  const r = await Referrer.create({ user: req.user._id, code: await svc.newCode(), name, mobile: req.user.mobile, city: req.body.city, type: req.body.type, termsAcceptedAt: new Date() });
  created(res, { referrer: referrerView(r) }, `You are registered. Your Referral ID is ${r.code}`);
});

exports.updatePayout = asyncHandler(async (req, res) => {
  const r = await myReferrer(req);
  if (!r) throw ApiError.notFound('Join Refer & Earn first');
  const b = req.body;
  const p = { method: b.method, updatedAt: new Date() };
  if (b.method === 'UPI') Object.assign(p, { upiId: b.upiId });
  else Object.assign(p, { accountName: b.accountName, bankName: b.bankName, ifsc: b.ifsc.toUpperCase(), accountNumberEnc: encrypt(b.accountNumber), accountLast4: b.accountNumber.slice(-4) });
  if (b.pan) Object.assign(p, { panEnc: encrypt(b.pan.toUpperCase()), panLast4: b.pan.slice(-4).toUpperCase() });
  else if (r.payout?.panEnc) Object.assign(p, { panEnc: r.payout.panEnc, panLast4: r.payout.panLast4 });
  r.payout = p;
  await r.save();
  ok(res, { referrer: referrerView(r) }, 'Payout details saved');
});

exports.submit = asyncHandler(async (req, res) => {
  const cfg = await svc.getConfig();
  if (!cfg.enabled) throw ApiError.conflict('Refer & Earn is not open yet.', 'PROGRAM_OFF');
  const referrer = await myReferrer(req);
  if (!referrer) throw ApiError.notFound('Join Refer & Earn first');
  if (referrer.status !== 'ACTIVE') throw ApiError.forbidden('Your Refer & Earn account is suspended. Please contact us.');
  const today = await Referral.countDocuments({ referrer: referrer._id, createdAt: { $gte: new Date(Date.now() - 864e5) } });
  if (today >= cfg.maxSubmissionsPerDay) throw new ApiError(429, 'Daily referral limit reached. Please try again tomorrow.', 'RATE_LIMITED');

  const b = req.body;
  const mobile = normalizeMobile(b.mobile);
  if (!mobile) throw new ApiError(422, 'Enter a valid 10-digit mobile number', 'VALIDATION_ERROR', [{ field: 'mobile', message: 'Invalid mobile number' }]);
  const { hard, soft } = await svc.checkMobile(mobile, { referrer });
  if (hard.length) throw new ApiError(409, hard[0], 'REFERRAL_NOT_ELIGIBLE', [{ field: 'mobile', message: hard[0] }]);

  const ref = await Referral.create({
    referralNumber: await nextNumber('REF'), referrer: referrer._id, referrerUser: req.user._id, source: 'FORM',
    customer: { name: b.name, mobile, city: b.city, propertyType: b.propertyType, budget: b.budget, notes: b.notes },
    consentAt: new Date(),
    checks: { duplicate: soft.length > 0, duplicateReason: soft.join(' '), checkedAt: new Date() },
    timeline: [{ status: 'SUBMITTED', at: new Date(), by: req.user._id }],
  });
  created(res, { referral: referralView(ref) }, `Referral ${ref.referralNumber} submitted. We will verify it and keep you updated.`);
});

// ── Staff ───────────────────────────────────────────────────
const populateRef = [{ path: 'referrer', select: 'code name mobile type status' }, { path: 'booking', select: 'bookingNumber status' }];

async function loadRef(req) {
  const r = await Referral.findById(req.params.id);
  if (!r) throw ApiError.notFound('Referral not found');
  return r;
}

async function respond(res, r, message) {
  await r.populate(populateRef);
  ok(res, { referral: referralView(r, { staff: true }) }, message);
}

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = {};
  if (q.status) filter.status = String(q.status);
  if (q.referrer) filter.referrer = String(q.referrer);
  if (q.flag === 'duplicate') filter['checks.duplicate'] = true;
  if (q.flag === 'recovery') filter.recoveryReview = true;
  if (q.flag === 'due') filter.status = 'REWARD_APPROVED';
  if (q.q) {
    const rx = new RegExp(String(q.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i');
    filter.$or = [{ referralNumber: rx }, { 'customer.name': rx }, { 'customer.mobile': rx }];
  }
  const pg = parsePagination(q, { maxLimit: 200 });
  const [items, total] = await Promise.all([
    Referral.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate(populateRef),
    Referral.countDocuments(filter),
  ]);
  for (const r of items) await svc.sync(r).catch(() => {});
  const [pendingApproval, due] = await Promise.all([
    Referral.countDocuments({ status: 'ADVANCE_RECEIVED' }),
    Referral.find({ status: 'REWARD_APPROVED' }).select('rewardAmount').lean(),
  ]);
  const usedCredit = (await Payment.find({ method: 'REFERRAL_CREDIT', status: 'RECEIVED' }).select('amount').lean()).reduce((t, x) => t + x.amount, 0);
  ok(res, {
    items: items.map((r) => referralView(r, { staff: true })),
    summary: { toVerify: await Referral.countDocuments({ status: 'SUBMITTED' }), pendingApproval, creditIssued: due.reduce((s, r) => s + (r.rewardAmount || 0), 0), creditIssuedCount: due.length, creditUsed: usedCredit, recovery: await Referral.countDocuments({ recoveryReview: true }) },
  }, 'OK', 200, pageMeta(pg, total));
});

exports.get = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  await svc.sync(r);
  const fresh = await svc.checkMobile(r.customer.mobile, { referrer: await Referrer.findById(r.referrer).lean(), excludeReferral: r._id, excludeLead: r.lead, at: r.createdAt });
  await r.populate(populateRef);
  const cfg = await svc.getConfig();
  ok(res, { referral: referralView(r, { staff: true }), checksNow: fresh, tdsPercent: cfg.tdsPercent || 0, defaultTds: r.rewardAmount ? Math.round((r.rewardAmount * (cfg.tdsPercent || 0)) / 100) : 0 });
});

/** Verify: lead is genuine and new. Creates a CRM lead for the sales team when the customer has none. */
exports.verify = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  if (r.status !== 'SUBMITTED') throw ApiError.conflict('Only submitted referrals can be verified', 'INVALID_STATUS');
  const referrer = await Referrer.findById(r.referrer);
  const { hard, soft } = await svc.checkMobile(r.customer.mobile, { referrer, excludeReferral: r._id, excludeLead: r.lead, at: r.createdAt });
  if (hard.length) throw ApiError.conflict(`Cannot verify: ${hard.join(' ')}`, 'REFERRAL_NOT_ELIGIBLE');
  if (soft.length && !req.body.override) throw new ApiError(409, `Possible duplicate: ${soft.join(' ')} Tick “verify anyway” with a note if you have checked it.`, 'POSSIBLE_DUPLICATE');
  if (soft.length && (req.body.note || '').trim().length < 3) throw new ApiError(422, 'Add a note explaining why this is a genuine new referral', 'VALIDATION_ERROR', [{ field: 'note', message: 'Required' }]);

  if (!r.lead) {
    const lead = await Lead.create({
      leadNumber: await nextNumber('LD'), flow: 'REFERRAL', source: 'REFERRAL', name: r.customer.name, mobile: r.customer.mobile, city: r.customer.city,
      status: 'NEW', currentStep: 'BASIC_INFO', stepsCompleted: ['BASIC_INFO'], referralCode: referrer?.code,
    });
    r.lead = lead._id;
    await logActivity({ lead: lead._id, actor: req.user, type: 'LEAD_CREATED', message: `Referral ${r.referralNumber} from ${referrer?.name} (${referrer?.code}). ${[r.customer.propertyType, r.customer.budget, r.customer.notes].filter(Boolean).join(' · ')}` });
  }
  svc.push(r, 'VERIFIED', { by: req.user._id, note: req.body.note });
  await r.save();
  await audit(req, { action: 'REFERRAL_VERIFIED', entityType: 'Referral', entityId: r._id, reason: req.body.note, meta: { override: Boolean(soft.length) } });
  svc.notifyReferrer(r, 'Referral accepted', `Your referral for ${r.customer.name} (${r.referralNumber}) has been verified. We will contact them soon.`);
  await svc.sync(r);
  await respond(res, r, 'Referral verified');
});

exports.reject = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  if (['REWARD_PAID', 'REJECTED'].includes(r.status)) throw ApiError.conflict('This referral cannot be rejected now', 'INVALID_STATUS');
  r.rejectReason = req.body.reason;
  const wasCredited = r.status === 'REWARD_APPROVED';
  svc.push(r, 'REJECTED', { by: req.user._id, note: req.body.reason });
  if (wasCredited) await svc.flagIfOverdrawn(r);
  await r.save();
  await audit(req, { action: 'REFERRAL_REJECTED', entityType: 'Referral', entityId: r._id, reason: req.body.reason });
  svc.notifyReferrer(r, 'Referral not accepted', `Your referral for ${r.customer.name} could not be accepted: ${req.body.reason}`);
  await respond(res, r, 'Referral rejected');
});

exports.markContacted = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  if (r.status !== 'VERIFIED') throw ApiError.conflict('Only verified referrals can be marked contacted', 'INVALID_STATUS');
  svc.push(r, 'CONTACTED', { by: req.user._id, note: req.body.note });
  await r.save();
  await respond(res, r, 'Marked as contacted');
});

/** Manually link the booking (customer booked with another number). One booking → one referral. */
exports.link = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  if (!svc.STATUS.slice(1, 6).includes(r.status)) throw ApiError.conflict('Link a booking while the referral is verified and in progress', 'INVALID_STATUS');
  const booking = await Booking.findOne({ bookingNumber: String(req.body.bookingNumber).trim().toUpperCase() }).select('_id customer createdAt bookingNumber').lean();
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.createdAt < r.createdAt) throw ApiError.conflict('That booking was made before the referral was submitted', 'BOOKED_BEFORE_REFERRAL');
  const other = await Referral.findOne({ booking: booking._id, _id: { $ne: r._id } }).select('referralNumber').lean();
  if (other) throw ApiError.conflict(`Booking already credited to ${other.referralNumber}`, 'ALREADY_CREDITED');
  const before = r.booking;
  r.booking = booking._id;
  r.customerUser = booking.customer;
  r.linkedManually = true;
  r.timeline.push({ status: r.status, at: new Date(), by: req.user._id, note: `Linked to booking ${booking.bookingNumber}: ${req.body.reason}` });
  await r.save();
  await audit(req, { action: 'REFERRAL_LINKED', entityType: 'Referral', entityId: r._id, before: { booking: before }, after: { booking: booking._id }, reason: req.body.reason });
  await svc.sync(r);
  await respond(res, r, `Linked to ${booking.bookingNumber}`);
});

exports.approve = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  if (r.status !== 'ADVANCE_RECEIVED') throw ApiError.conflict('Only qualified referrals (advance received) can be approved', 'INVALID_STATUS');
  await svc.sync(r);
  if (r.status !== 'ADVANCE_RECEIVED') throw ApiError.conflict('This referral no longer qualifies — check the project and payments', 'NO_LONGER_QUALIFIES');
  const referrer = await Referrer.findById(r.referrer).lean();
  if (referrer?.status !== 'ACTIVE') throw ApiError.conflict('The referrer is suspended. Reactivate them first.', 'REFERRER_SUSPENDED');
  // Re-check the level at approval time (two referrals may have qualified together).
  const cfg = await svc.getConfig();
  const level = await svc.levelFor(r, cfg, r.qualifiedAt);
  if (level !== r.level) {
    const slab = svc.slabFor(cfg, r.projectValue);
    r.timeline.push({ status: r.status, at: new Date(), auto: true, note: `Level corrected ${r.level} → ${level}` });
    r.level = level;
    r.rewardCalculated = svc.rewardFor(cfg, slab, level);
    if (req.body.amount === undefined) r.rewardAmount = r.rewardCalculated;
  }
  const amount = req.body.amount === undefined ? r.rewardAmount : Math.round(req.body.amount);
  if (amount !== r.rewardCalculated && (req.body.note || '').trim().length < 3) throw new ApiError(422, 'Give a reason for changing the reward amount', 'VALIDATION_ERROR', [{ field: 'note', message: 'Required' }]);
  const before = { rewardAmount: r.rewardAmount };
  r.rewardAmount = amount;
  r.approvedAt = new Date();
  r.approvedBy = req.user._id;
  r.approvalNote = req.body.note;
  svc.push(r, 'REWARD_APPROVED', { by: req.user._id, note: `${fmt(amount)}${req.body.note ? ` — ${req.body.note}` : ''}` });
  await r.save();
  await audit(req, { action: 'REFERRAL_REWARD_APPROVED', entityType: 'Referral', entityId: r._id, before, after: { rewardAmount: amount, calculated: r.rewardCalculated, slab: r.slabKey, level: r.level }, reason: req.body.note });
  svc.notifyReferrer(r, 'Credit added to your wallet', `${fmt(amount)} referral credit for ${r.customer.name} has been added to your Refer & Earn wallet. Use it on your next project with us.`);
  await respond(res, r, `${fmt(amount)} credited to the referrer's wallet`);
});

exports.pay = asyncHandler(async (req, res) => {
  throw ApiError.conflict('Rewards are not paid in cash — approved rewards go to the referrer\'s wallet as project credit.', 'REWARDS_ARE_CREDIT');
  // eslint-disable-next-line no-unreachable
  const r = await loadRef(req);
  if (r.status !== 'REWARD_APPROVED') throw ApiError.conflict('Approve the reward before marking it paid', 'INVALID_STATUS');
  const referrer = await Referrer.findById(r.referrer);
  const cfg = await svc.getConfig();
  const tds = req.body.tdsAmount !== undefined ? Math.round(req.body.tdsAmount) : Math.round((r.rewardAmount * (cfg.tdsPercent || 0)) / 100);
  if (tds > r.rewardAmount) throw new ApiError(422, 'TDS cannot exceed the reward', 'VALIDATION_ERROR', [{ field: 'tdsAmount', message: 'Too high' }]);
  const p = referrer?.payout || {};
  r.paidAt = req.body.paidAt || new Date();
  r.paidBy = req.user._id;
  r.payout = {
    method: req.body.method, reference: req.body.reference, tdsAmount: tds, netAmount: r.rewardAmount - tds,
    details: p.method === 'UPI' ? `UPI ${p.upiId}` : p.method === 'BANK' ? `${p.bankName || 'Bank'} ••••${p.accountLast4} (${p.ifsc})` : 'Not on file',
  };
  svc.push(r, 'REWARD_PAID', { by: req.user._id, note: `${fmt(r.payout.netAmount)} paid (${req.body.method}, ref ${req.body.reference})${tds ? `, TDS ${fmt(tds)}` : ''}` });
  await r.save();
  await audit(req, { action: 'REFERRAL_REWARD_PAID', entityType: 'Referral', entityId: r._id, after: { amount: r.rewardAmount, tds, net: r.payout.netAmount, reference: r.payout.reference } });
  svc.notifyReferrer(r, 'Reward paid', `${fmt(r.payout.netAmount)} has been paid for your referral ${r.referralNumber}${tds ? ` (TDS ${fmt(tds)} deducted)` : ''}. Ref: ${r.payout.reference}. Thank you!`);
  await respond(res, r, 'Marked as paid');
});

exports.withhold = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  if (['REWARD_PAID', 'REJECTED', 'WITHHELD'].includes(r.status)) throw ApiError.conflict('This referral cannot be put on hold now', 'INVALID_STATUS');
  r.withheldReason = req.body.reason;
  const wasCredited = r.status === 'REWARD_APPROVED';
  svc.push(r, 'WITHHELD', { by: req.user._id, note: req.body.reason });
  if (wasCredited) await svc.flagIfOverdrawn(r);
  await r.save();
  await audit(req, { action: 'REFERRAL_WITHHELD', entityType: 'Referral', entityId: r._id, reason: req.body.reason });
  svc.notifyReferrer(r, 'Referral on hold', `Your referral ${r.referralNumber} is on hold: ${req.body.reason}`);
  await respond(res, r, 'Referral put on hold');
});

/** Reopen a rejected / on-hold referral: back to SUBMITTED (re-verify) or VERIFIED (then progress re-syncs). */
exports.reopen = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  if (!['REJECTED', 'WITHHELD'].includes(r.status)) throw ApiError.conflict('Only rejected or on-hold referrals can be reopened', 'INVALID_STATUS');
  const to = r.status === 'REJECTED' ? 'SUBMITTED' : 'VERIFIED';
  if (to === 'SUBMITTED') {
    const { hard } = await svc.checkMobile(r.customer.mobile, { referrer: await Referrer.findById(r.referrer).lean(), excludeReferral: r._id, excludeLead: r.lead, at: r.createdAt });
    if (hard.length) throw ApiError.conflict(`Cannot reopen: ${hard.join(' ')}`, 'REFERRAL_NOT_ELIGIBLE');
  }
  // Qualification is recalculated when it qualifies again.
  Object.assign(r, { qualifiedAt: undefined, projectValue: undefined, slabKey: undefined, slabLabel: undefined, level: undefined, rewardCalculated: undefined, rewardAmount: undefined, payableBy: undefined, approvedAt: undefined, approvedBy: undefined, rejectReason: undefined, withheldReason: undefined });
  svc.push(r, to, { by: req.user._id, note: `Reopened: ${req.body.reason}` });
  await r.save();
  await audit(req, { action: 'REFERRAL_REOPENED', entityType: 'Referral', entityId: r._id, reason: req.body.reason });
  await svc.sync(r);
  await respond(res, r, 'Referral reopened');
});

exports.clearRecovery = asyncHandler(async (req, res) => {
  const r = await loadRef(req);
  r.recoveryReview = false;
  r.timeline.push({ status: r.status, at: new Date(), by: req.user._id, note: `Recovery review closed: ${req.body.reason}` });
  await r.save();
  await audit(req, { action: 'REFERRAL_RECOVERY_REVIEWED', entityType: 'Referral', entityId: r._id, reason: req.body.reason });
  await respond(res, r, 'Recovery review closed');
});

// Referrers
exports.referrers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i');
    filter.$or = [{ code: rx }, { name: rx }, { mobile: rx }];
  }
  const pg = parsePagination(req.query, { maxLimit: 200 });
  const [items, total] = await Promise.all([Referrer.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), Referrer.countDocuments(filter)]);
  const ids = items.map((x) => x._id);
  const refs = await Referral.find({ referrer: { $in: ids } }).select('referrer status rewardAmount').lean();
  const used = await Payment.find({ customer: { $in: items.map((x) => x.user) }, method: 'REFERRAL_CREDIT', status: 'RECEIVED' }).select('customer amount').lean();
  const usedBy = new Map();
  for (const u of used) usedBy.set(String(u.customer), (usedBy.get(String(u.customer)) || 0) + u.amount);
  const blank = () => ({ total: 0, successful: 0, credited: 0, used: 0, balance: 0, pending: 0 });
  const agg = new Map();
  for (const x of refs) {
    const a = agg.get(String(x.referrer)) || blank();
    a.total += 1;
    if (svc.COUNTED.includes(x.status)) a.successful += 1;
    if (svc.CREDITED.includes(x.status)) a.credited += x.rewardAmount || 0;
    if (x.status === 'ADVANCE_RECEIVED') a.pending += x.rewardAmount || 0;
    agg.set(String(x.referrer), a);
  }
  ok(res, {
    items: items.map((x) => {
      const st = agg.get(String(x._id)) || blank();
      st.used = usedBy.get(String(x.user)) || 0;
      st.balance = st.credited - st.used;
      return { ...referrerView(x), stats: st };
    }),
  }, 'OK', 200, pageMeta(pg, total));
});

exports.referrer = asyncHandler(async (req, res) => {
  const r = await Referrer.findById(req.params.id).lean();
  if (!r) throw ApiError.notFound('Referrer not found');
  const full = req.query.reveal === 'true';
  if (full) await audit(req, { action: 'REFERRER_PAYOUT_VIEWED', entityType: 'Referrer', entityId: r._id });
  ok(res, { referrer: { ...referrerView(r, { full }), adminNotes: r.adminNotes }, wallet: await svc.wallet(r) });
});

exports.updateReferrer = asyncHandler(async (req, res) => {
  const r = await Referrer.findById(req.params.id);
  if (!r) throw ApiError.notFound('Referrer not found');
  const before = { status: r.status, type: r.type };
  const b = req.body;
  if (b.status) {
    if (b.status === 'SUSPENDED' && (b.suspendedReason || '').trim().length < 3) throw new ApiError(422, 'Give a reason for suspending', 'VALIDATION_ERROR', [{ field: 'suspendedReason', message: 'Required' }]);
    r.status = b.status;
    r.suspendedReason = b.status === 'SUSPENDED' ? b.suspendedReason : undefined;
  }
  if (b.type) r.type = b.type;
  if (b.adminNotes !== undefined) r.adminNotes = b.adminNotes;
  await r.save();
  await audit(req, { action: 'REFERRER_UPDATED', entityType: 'Referrer', entityId: r._id, before, after: { status: r.status, type: r.type }, reason: b.suspendedReason });
  ok(res, { referrer: referrerView(r) }, 'Referrer updated');
});
