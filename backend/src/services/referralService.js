const crypto = require('crypto');
const { Referral, Referrer, User, Lead, Booking, Quotation, ExecutionProject, Payment } = require('../models');
const settings = require('./settingsService');
const notifications = require('./notifications/notificationService');
const logger = require('../utils/logger');
const { REFERRAL_CONFIG } = require('../config/defaults');
const { BOOKING_STATUS, CHANNELS } = require('../config/constants');
const { formatINR: inr } = require('../utils/money');

const STATUS = Referral.STATUS;
const rank = (s) => STATUS.indexOf(s);
const fmt = (v) => inr(v, { decimals: false });
// Statuses the booking can still move forward automatically.
const AUTO = ['VERIFIED', 'CONTACTED', 'SITE_VISIT_DONE', 'QUOTATION_SHARED', 'AGREEMENT_SIGNED', 'ADVANCE_RECEIVED', 'REWARD_APPROVED'];
// Statuses that count towards the referrer's level.
const COUNTED = ['ADVANCE_RECEIVED', 'REWARD_APPROVED', 'REWARD_PAID'];
const OPEN = STATUS.filter((s) => !['REJECTED'].includes(s));

const LABEL = {
  SUBMITTED: 'Under review', VERIFIED: 'Registered', CONTACTED: 'Booking made', SITE_VISIT_DONE: 'Site visit done',
  QUOTATION_SHARED: 'Quotation shared', AGREEMENT_SIGNED: 'Quotation accepted', ADVANCE_RECEIVED: 'Qualified',
  REWARD_APPROVED: 'Credit added to wallet', REWARD_PAID: 'Reward paid', REJECTED: 'Not accepted', WITHHELD: 'On hold',
};

async function getConfig() {
  const stored = (await settings.get('referral.config', REFERRAL_CONFIG)) || {};
  return { ...REFERRAL_CONFIG, ...stored };
}

/** Slab for a value: the last slab whose lower bound is met (`from` inclusive or exclusive). */
function slabFor(cfg, value) {
  const v = Number(value) || 0;
  let pick = null;
  for (const s of cfg.slabs || []) if (s.fromInclusive === false ? v > s.from : v >= s.from) pick = s;
  return pick;
}

/** Reward for a slab at a level (1-based). Past the last level: repeat it, or nothing (settings). */
function rewardFor(cfg, slab, level) {
  if (!slab?.rewards?.length) return 0;
  if (level <= slab.rewards.length) return slab.rewards[level - 1];
  return cfg.afterLastLevel === 'NONE' ? 0 : slab.rewards[slab.rewards.length - 1];
}

/** Start of the counting period that contains `date` (levels reset at this point). */
function periodStart(cfg, date = new Date()) {
  const d = new Date(date);
  if (cfg.countingPeriod === 'CALENDAR_YEAR') return new Date(d.getFullYear(), 0, 1);
  if (cfg.countingPeriod === 'FINANCIAL_YEAR') return new Date(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1, 3, 1); // 1 April
  return new Date(0);
}

function addWorkingDays(date, days) {
  const d = new Date(date);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  return d;
}

/** Unique, readable Referral ID, e.g. II-7K3QXM (no 0/O/1/I). */
async function newCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 10; i += 1) {
    const code = `II-${Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('')}`;
    if (!(await Referrer.exists({ code }))) return code;
  }
  throw new Error('Could not generate a referral code');
}

/**
 * Duplicate / eligibility checks for a referred mobile. `hard` problems block the referral outright
 * (self-referral, already referred by someone, existing customer); `soft` ones need a staff decision.
 */
async function checkMobile(mobile, { referrer, excludeReferral, excludeLead, at = new Date() } = {}) {
  const cfg = await getConfig();
  const hard = [];
  const soft = [];
  if (referrer && referrer.mobile === mobile) hard.push('You cannot refer yourself.');
  const other = await Referral.findOne({ 'customer.mobile': mobile, status: { $in: OPEN }, ...(excludeReferral ? { _id: { $ne: excludeReferral } } : {}) }).select('referralNumber referrer').lean();
  if (other) hard.push(`This customer has already been referred (${other.referralNumber}).`);
  const user = await User.findOne({ mobile }).select('_id role').lean();
  if (user && user.role !== 'CUSTOMER') hard.push('This number belongs to a staff account.');
  if (user) {
    const booked = await Booking.exists({ customer: user._id, createdAt: { $lt: at } });
    if (booked) hard.push('This customer has already booked with us.');
  }
  if (cfg.duplicateWindowDays > 0) {
    const since = new Date(at.getTime() - cfg.duplicateWindowDays * 864e5);
    const lead = await Lead.findOne({ mobile, createdAt: { $gte: since, $lt: at }, flow: { $ne: 'REFERRAL' }, ...(excludeLead ? { _id: { $ne: excludeLead } } : {}) }).select('leadNumber createdAt').lean();
    if (lead) soft.push(`Already enquired with us on ${new Date(lead.createdAt).toLocaleDateString('en-IN')} (${lead.leadNumber}).`);
  }
  return { hard, soft };
}

function push(ref, status, { by, note, auto = false } = {}) {
  ref.status = status;
  ref.timeline.push({ status, at: new Date(), by, note, auto });
}

function notifyReferrer(ref, title, body) {
  if (!ref.referrerUser) return;
  notifications.send({
    user: ref.referrerUser, event: 'REFERRAL_UPDATED', channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
    variables: { title, body, referralNumber: ref.referralNumber, customerName: ref.customer?.name },
    link: '/account/referrals',
  }).catch((err) => logger.warn('Referral notification failed', { error: err.message }));
}

/** Level = 1 + referrals of the same referrer that qualified earlier in the same counting period. */
async function levelFor(ref, cfg, at) {
  const start = periodStart(cfg, at);
  const earlier = await Referral.countDocuments({
    referrer: ref.referrer, _id: { $ne: ref._id }, status: { $in: COUNTED },
    qualifiedAt: { $gte: start, $lt: at },
  });
  return earlier + 1;
}

/** Locks value, slab, level and reward when the referral qualifies. */
async function qualify(ref, { quotation, cfg }) {
  const at = new Date();
  const value = cfg.valueBasis === 'INCL_GST' ? quotation.totals?.grandTotal : (quotation.totals?.taxableAmount ?? quotation.totals?.grandTotal);
  const slab = slabFor(cfg, value);
  const level = await levelFor(ref, cfg, at);
  const reward = rewardFor(cfg, slab, level);
  Object.assign(ref, {
    qualifiedAt: at, projectValue: Math.round(value || 0), valueBasis: cfg.valueBasis, slabKey: slab?.key, slabLabel: slab?.label,
    level, rewardCalculated: reward, rewardAmount: reward, payableBy: addWorkingDays(at, cfg.payoutWorkingDays || 0),
  });
}

/** Finds the customer's first booking made after the referral (a project counts for one referral only). */
async function findBooking(ref) {
  const user = ref.customerUser ? await User.findById(ref.customerUser).select('_id').lean() : await User.findOne({ mobile: ref.customer.mobile, role: 'CUSTOMER' }).select('_id').lean();
  if (!user) return null;
  if (!ref.customerUser) ref.customerUser = user._id;
  const taken = await Referral.distinct('booking', { _id: { $ne: ref._id }, booking: { $ne: null } });
  return Booking.findOne({ customer: user._id, createdAt: { $gte: ref.since || ref.createdAt }, status: { $ne: 'CANCELLED' }, _id: { $nin: taken } }).sort({ createdAt: 1 }).select('_id').lean();
}

/**
 * Moves a referral forward from the linked booking/quotation/project/payments, qualifies it, or puts it on hold
 * when the project is cancelled or the qualifying advance no longer stands. Idempotent.
 */
async function sync(ref) {
  if (!AUTO.includes(ref.status) && ref.status !== 'REWARD_PAID') return ref;
  const cfg = await getConfig();
  let changed = false;
  // Friends who registered without a name: show their name once they add it.
  if (ref.customerUser && (!ref.customer.name || ref.customer.name === 'Customer')) {
    const u = await User.findById(ref.customerUser).select('name').lean();
    if (u?.name) { ref.customer.name = u.name; changed = true; }
  }

  if (!ref.booking && ref.status !== 'REWARD_PAID') {
    const b = await findBooking(ref);
    if (b) { ref.booking = b._id; changed = true; }
  }
  if (!ref.booking) { if (changed) await ref.save(); return ref; }

  const booking = await Booking.findById(ref.booking).select('status customer').lean();
  if (!booking) return ref;
  const quotations = await Quotation.find({ booking: ref.booking }).select('status sentAt isLatest totals').lean();
  const accepted = quotations.find((q) => q.status === 'ACCEPTED');
  const sent = quotations.some((q) => q.sentAt);
  const project = await ExecutionProject.findOne({ booking: ref.booking }).select('_id grandTotal').lean();
  let paid = 0;
  if (project) {
    // Wallet credit is not money received: it never counts towards the qualifying advance.
    const rows = await Payment.find({ project: project._id, status: 'RECEIVED', method: { $ne: 'REFERRAL_CREDIT' } }).select('amount').lean();
    paid = rows.reduce((s, p) => s + p.amount, 0);
  }
  if (project && String(ref.project) !== String(project._id)) { ref.project = project._id; changed = true; }
  if (accepted && String(ref.quotation) !== String(accepted._id)) { ref.quotation = accepted._id; changed = true; }

  const cancelled = booking.status === 'CANCELLED';
  const advanceOk = Boolean(project && project.grandTotal > 0 && paid > 0 && paid >= (project.grandTotal * (cfg.minAdvancePercent || 0)) / 100);
  const qualifies = !cancelled && Boolean(accepted) && (cfg.payoutTrigger === 'AGREEMENT' || advanceOk);

  if (ref.status === 'REWARD_PAID') {
    if (!qualifies && !ref.recoveryReview) {
      ref.recoveryReview = true;
      ref.timeline.push({ status: 'REWARD_PAID', at: new Date(), auto: true, note: cancelled ? 'Project cancelled after the reward was paid — review recovery as per policy.' : 'Qualifying advance no longer stands after payout — review.' });
      changed = true;
    }
  } else if (['ADVANCE_RECEIVED', 'REWARD_APPROVED'].includes(ref.status) && !qualifies) {
    ref.withheldReason = cancelled ? 'Project cancelled' : 'Qualifying advance no longer received (payment voided or refunded)';
    const wasCredited = ref.status === 'REWARD_APPROVED';
    push(ref, 'WITHHELD', { auto: true, note: ref.withheldReason });
    notifyReferrer(ref, 'Referral reward on hold', `Your reward for ${ref.customer.name} is on hold: ${ref.withheldReason}.${wasCredited ? ' The credit has been removed from your wallet.' : ''}`);
    if (wasCredited) await flagIfOverdrawn(ref);
    changed = true;
  } else if (cancelled) {
    ref.withheldReason = 'Project cancelled';
    push(ref, 'WITHHELD', { auto: true, note: 'Booking cancelled' });
    changed = true;
  } else {
    let target = 'CONTACTED';
    if (BOOKING_STATUS.indexOf(booking.status) >= BOOKING_STATUS.indexOf('SITE_VISIT_COMPLETED')) target = 'SITE_VISIT_DONE';
    if (sent) target = 'QUOTATION_SHARED';
    if (accepted) target = 'AGREEMENT_SIGNED';
    if (qualifies) target = 'ADVANCE_RECEIVED';
    if (ref.status !== 'REWARD_APPROVED' && rank(target) > rank(ref.status)) {
      // Record each step passed so the referrer sees a clean timeline.
      for (const s of STATUS.slice(rank(ref.status) + 1, rank(target) + 1)) {
        if (s === 'ADVANCE_RECEIVED') {
          await qualify(ref, { quotation: accepted, cfg });
          push(ref, s, { auto: true, note: `Project value ${fmt(ref.projectValue)} · Slab ${ref.slabKey} · Level ${ref.level} · Reward ${fmt(ref.rewardAmount)}` });
          if (!cfg.autoApprove) notifyReferrer(ref, 'Your referral qualified!', `${ref.customer.name}'s project is confirmed. Reward ${fmt(ref.rewardAmount)} is awaiting approval.`);
        } else push(ref, s, { auto: true });
      }
      changed = true;
    }
  }
  // Automatic credit: qualified → wallet, unless staff turned auto-approval off or the referrer is suspended.
  if (ref.status === 'ADVANCE_RECEIVED' && cfg.autoApprove) {
    const referrer = await Referrer.findById(ref.referrer).select('status').lean();
    if (referrer?.status === 'ACTIVE') { await approve(ref, { auto: true, cfg }); changed = true; }
  }
  if (changed) await ref.save();
  return ref;
}

/**
 * Credits the reward to the referrer's wallet. The level is re-checked at this moment (two referrals may have
 * qualified together); `amount` overrides the calculated reward (staff, with a note).
 */
async function approve(ref, { auto = false, by, amount, note, cfg } = {}) {
  cfg = cfg || (await getConfig());
  const level = await levelFor(ref, cfg, ref.qualifiedAt || new Date());
  if (level !== ref.level) {
    const slab = slabFor(cfg, ref.projectValue);
    ref.timeline.push({ status: ref.status, at: new Date(), auto: true, note: `Level corrected ${ref.level} → ${level}` });
    ref.level = level;
    ref.rewardCalculated = rewardFor(cfg, slab, level);
    ref.rewardAmount = ref.rewardCalculated;
  }
  if (amount !== undefined) ref.rewardAmount = Math.round(amount);
  ref.approvedAt = new Date();
  ref.approvedBy = by;
  ref.approvalNote = note;
  push(ref, 'REWARD_APPROVED', { by, auto, note: `${fmt(ref.rewardAmount)} added to wallet${note ? ` — ${note}` : ''}` });
  await ref.save();
  notifyReferrer(ref, 'Credit added to your wallet', `${fmt(ref.rewardAmount)} referral credit for ${ref.customer.name} has been added to your Refer & Earn wallet. Use it on your next project with us.`);
  return ref;
}

/**
 * A new customer registered with a referral code (typed, or remembered from the referrer's link).
 * Only brand-new accounts count. Clean referrals start as VERIFIED; possible duplicates wait for staff review.
 * Never throws — a bad/ineligible code must not break registration.
 */
async function attachOnRegister(user, code, { lead } = {}) {
  try {
    code = String(code || '').trim().toUpperCase();
    if (!/^II-[A-Z0-9]{6}$/.test(code) || !user || user.role !== 'CUSTOMER') return { applied: false };
    const cfg = await getConfig();
    if (!cfg.enabled) return { applied: false, reason: 'Programme is not open' };
    const referrer = await Referrer.findOne({ code });
    if (!referrer || referrer.status !== 'ACTIVE') return { applied: false, reason: 'Invalid referral code' };
    if (String(referrer.user) === String(user._id)) return { applied: false, reason: 'You cannot use your own code' };
    const now = new Date();
    const { hard, soft } = await checkMobile(user.mobile, { referrer, excludeLead: lead?._id, at: now });
    if (hard.length) { logger.info('Referral not applied', { code, reason: hard[0] }); return { applied: false, reason: hard[0] }; }
    const { nextNumber } = require('../utils/sequence');
    const review = soft.length > 0;
    const ref = new Referral({
      referralNumber: await nextNumber('REF'), referrer: referrer._id, referrerUser: referrer.user, source: 'SIGNUP', since: now,
      customer: { name: user.name || lead?.name || 'Customer', mobile: user.mobile, city: lead?.city },
      lead: lead?._id, customerUser: user._id,
      checks: { duplicate: review, duplicateReason: soft.join(' '), checkedAt: now },
      status: review ? 'SUBMITTED' : 'VERIFIED',
      timeline: [
        { status: 'SUBMITTED', at: now, auto: true, note: `Registered with code ${code}` },
        ...(review ? [] : [{ status: 'VERIFIED', at: now, auto: true }]),
      ],
    });
    await ref.save();
    await User.updateOne({ _id: user._id, referredBy: null }, { $set: { referredBy: referrer._id, referredCode: code } });
    notifyReferrer(ref, 'New referral registered', `${ref.customer.name} registered with your referral code. You earn credit when they book and accept their quotation.`);
    return { applied: true, referral: ref };
  } catch (err) {
    logger.warn('Referral attach failed', { error: err.message });
    return { applied: false };
  }
}

// Syncs for one referrer run one at a time (levels depend on each other).
const chains = new Map();
function serial(key, fn) {
  const prev = chains.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  chains.set(key, next);
  next.finally(() => { if (chains.get(key) === next) chains.delete(key); }).catch(() => {});
  return next;
}
const syncSerial = (ref) => serial(String(ref.referrer), async () => sync(await Referral.findById(ref._id) || ref));

async function syncForBooking(bookingId) {
  if (!bookingId) return;
  const booking = await Booking.findById(bookingId).select('customer').lean();
  const refs = await Referral.find({ $or: [{ booking: bookingId }, ...(booking ? [{ booking: null, customerUser: booking.customer }] : [])] });
  if (booking && !refs.length) {
    const u = await User.findById(booking.customer).select('mobile').lean();
    if (u) refs.push(...(await Referral.find({ booking: null, 'customer.mobile': u.mobile })));
  }
  for (const r of refs) await syncSerial(r).catch((err) => logger.warn('Referral sync failed', { referral: String(r._id), error: err.message }));
}

/** Fire-and-forget hook for booking/payment changes. */
function syncLater(bookingId) {
  setImmediate(() => syncForBooking(bookingId).catch((err) => logger.warn('Referral sync failed', { error: err.message })));
}

/**
 * Customer arrived through a referrer's link (?ref=CODE) and verified their number: record the referral
 * (SUBMITTED — staff still verify it). Silently ignored when not eligible.
 */
async function attachFromLead(lead, user) {
  try {
    if (!lead?.referralCode || !user) return null;
    const cfg = await getConfig();
    if (!cfg.enabled) return null;
    const referrer = await Referrer.findOne({ code: lead.referralCode, status: 'ACTIVE' });
    if (!referrer || String(referrer.user) === String(user._id)) return null;
    const { hard, soft } = await checkMobile(user.mobile, { referrer, excludeLead: lead._id, at: lead.createdAt });
    if (hard.length) return null;
    const { nextNumber } = require('../utils/sequence');
    const ref = new Referral({
      referralNumber: await nextNumber('REF'), referrer: referrer._id, referrerUser: referrer.user, source: 'LINK',
      customer: { name: lead.name || user.name || 'Customer', mobile: user.mobile, city: lead.city },
      lead: lead._id, customerUser: user._id,
      checks: { duplicate: soft.length > 0, duplicateReason: soft.join(' '), checkedAt: new Date() },
      timeline: [{ status: 'SUBMITTED', at: new Date(), auto: true, note: 'Customer came through the referral link' }],
    });
    await ref.save();
    return ref;
  } catch (err) {
    logger.warn('Referral attach failed', { error: err.message });
    return null;
  }
}

// ── Wallet (rewards are credit for the referrer's own next project, never cash) ──
const CREDITED = ['REWARD_APPROVED'];

/** Wallet of a referrer (by Referrer doc or user id): credited − used = balance (can go negative after a clawback). */
async function wallet(referrerOrUser) {
  const referrer = referrerOrUser?.code ? referrerOrUser : await Referrer.findOne({ user: referrerOrUser }).lean();
  if (!referrer) return null;
  const [refs, used] = await Promise.all([
    Referral.find({ referrer: referrer._id, status: { $in: CREDITED } }).select('referralNumber customer.name rewardAmount approvedAt').lean(),
    Payment.find({ customer: referrer.user, method: 'REFERRAL_CREDIT', status: 'RECEIVED' }).select('amount paymentNumber project receivedAt').populate('project', 'projectNumber').lean(),
  ]);
  const credited = refs.reduce((t, x) => t + (x.rewardAmount || 0), 0);
  const usedTotal = used.reduce((t, x) => t + x.amount, 0);
  const balance = credited - usedTotal;
  const entries = [
    ...refs.map((x) => ({ type: 'CREDIT', amount: x.rewardAmount || 0, at: x.approvedAt, ref: x.referralNumber, label: `Referral reward — ${x.customer?.name || ''}`.trim() })),
    ...used.map((x) => ({ type: 'USED', amount: -x.amount, at: x.receivedAt, ref: x.paymentNumber, label: `Used on project ${x.project?.projectNumber || ''}`.trim(), projectId: x.project ? String(x.project._id) : null })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));
  return { referrerId: String(referrer._id), status: referrer.status, credited, used: usedTotal, balance, available: referrer.status === 'ACTIVE' ? Math.max(0, balance) : 0, entries };
}

/** After a credited reward is taken back: if credit was already spent, flag the referral for a recovery review. */
async function flagIfOverdrawn(ref) {
  const w = await wallet(await Referrer.findById(ref.referrer).lean());
  if (!w) return;
  // Called before the referral is saved: take its credit out if the DB still counts it.
  const stillCounted = await Referral.exists({ _id: ref._id, status: { $in: CREDITED } });
  const balance = w.balance - (stillCounted ? ref.rewardAmount || 0 : 0);
  if (balance < 0 && !ref.recoveryReview) {
    ref.recoveryReview = true;
    ref.timeline.push({ status: ref.status, at: new Date(), auto: true, note: `Credit was already used — wallet is ${fmt(balance)}. Recover it from the referrer's project balance or decide as per policy.` });
  }
}

/**
 * Pays part of the customer's own project with their wallet credit. Guards: own project only, active referrer,
 * amount ≤ available credit, ≤ project balance, ≤ maxRedeemPercent of the project value; one redemption at a time.
 */
async function redeem({ project, amount, actor, note }) {
  const { nextNumber } = require('../utils/sequence');
  const paySvc = require('./paymentService');
  const ApiError = require('../utils/ApiError');
  const value = Math.round(Number(amount) || 0);
  if (value < 1) throw ApiError.badRequest('Enter the credit amount to use', 'INVALID_AMOUNT');
  const referrer = await Referrer.findOne({ user: project.customer });
  if (!referrer) throw ApiError.conflict('This customer has no Refer & Earn credit', 'NO_WALLET');
  const { Lock } = require('../models');
  const key = `wallet:${referrer._id}`;
  const acquire = async () => {
    try { await Lock.create({ _id: key, expiresAt: new Date(Date.now() + 15000) }); return true; } catch (err) {
      if (err.code !== 11000) throw err;
      const stale = await Lock.deleteOne({ _id: key, expiresAt: { $lt: new Date() } });
      if (!stale.deletedCount) return false;
      try { await Lock.create({ _id: key, expiresAt: new Date(Date.now() + 15000) }); return true; } catch { return false; }
    }
  };
  if (!(await acquire())) throw ApiError.conflict('Credit is being applied already. Please try again in a few seconds.', 'WALLET_BUSY');
  try {
    if (referrer.status !== 'ACTIVE') throw ApiError.conflict('Refer & Earn account is suspended — credit cannot be used', 'REFERRER_SUSPENDED');
    const [w, s, cfg] = await Promise.all([wallet(referrer), paySvc.summary(project), getConfig()]);
    const cap = Math.max(0, Math.floor((s.total * (cfg.maxRedeemPercent ?? 100)) / 100) - s.creditApplied);
    const max = Math.min(w.available, s.balance, cap);
    if (!s.total) throw ApiError.conflict('Project value is not set yet', 'NO_PROJECT_VALUE');
    if (max < 1) throw ApiError.conflict(w.available < 1 ? 'No wallet credit available' : s.balance < 1 ? 'Nothing is due on this project' : `Credit can cover up to ${cfg.maxRedeemPercent}% of the project value`, 'CREDIT_NOT_APPLICABLE');
    if (value > max) throw new ApiError(422, `You can use up to ${fmt(max)} on this project`, 'VALIDATION_ERROR', [{ field: 'amount', message: `Max ${fmt(max)}` }]);
    const payment = await Payment.create({
      paymentNumber: await nextNumber('PAY'), project: project._id, booking: project.booking, customer: project.customer,
      amount: value, method: 'REFERRAL_CREDIT', status: 'RECEIVED', receivedAt: new Date(), reference: referrer.code,
      note: note || 'Refer & Earn wallet credit', recordedBy: actor?._id,
    });
    // Belt and braces: if anything slipped past the lock, undo instead of overdrawing the wallet.
    const after = await wallet(referrer);
    if (after.balance < 0) {
      await Payment.updateOne({ _id: payment._id }, { $set: { status: 'VOID', voidedAt: new Date(), voidReason: 'Auto-reversed: wallet would be overdrawn' } });
      throw ApiError.conflict('Not enough wallet credit. Please refresh and try again.', 'CREDIT_NOT_APPLICABLE');
    }
    return { payment, max };
  } finally {
    await Lock.deleteOne({ _id: key }).catch(() => {});
  }
}

/** Level the referrer would reach next, and what it pays per slab (for the dashboard). */
async function nextLevelInfo(referrer, cfg) {
  const start = periodStart(cfg);
  const done = await Referral.countDocuments({ referrer: referrer._id, status: { $in: COUNTED }, qualifiedAt: { $gte: start } });
  const level = done + 1;
  return { completed: done, nextLevel: level, rewards: (cfg.slabs || []).map((s) => ({ key: s.key, label: s.label, amount: rewardFor(cfg, s, level) })) };
}

module.exports = {
  STATUS, LABEL, COUNTED, getConfig, slabFor, rewardFor, periodStart, addWorkingDays, newCode, checkMobile,
  sync, syncSerial, approve, attachOnRegister, syncForBooking, syncLater, attachFromLead, levelFor, notifyReferrer, push, nextLevelInfo, wallet, redeem, flagIfOverdrawn, CREDITED,
};
