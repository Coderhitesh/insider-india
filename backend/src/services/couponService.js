const { Coupon, Payment, Lock } = require('../models');
const paySvc = require('./paymentService');
const ApiError = require('../utils/ApiError');
const { nextNumber } = require('../utils/sequence');
const { formatINR: inr } = require('../utils/money');

const fmt = (v) => inr(v, { decimals: false });
const bad = (message, code = 'COUPON_INVALID') => new ApiError(422, message, code, [{ field: 'code', message }]);

/** Times a coupon has been used (live, from the ledger — voiding a discount gives the use back). */
const usage = (couponId, extra = {}) => Payment.countDocuments({ coupon: couponId, method: 'COUPON', status: 'RECEIVED', ...extra });

/**
 * Checks a code against a project and returns the discount it would give. Rules: active, within dates, project type,
 * minimum project value, total and per-customer limits, one coupon per project, never more than the balance due.
 */
async function evaluate(rawCode, project) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) throw bad('Enter a coupon code');
  const c = await Coupon.findOne({ code }).lean();
  if (!c || !c.isActive) throw bad('This coupon code is not valid');
  const now = new Date();
  if (c.validFrom && now < new Date(c.validFrom)) throw bad('This coupon is not active yet');
  if (c.validTo && now > new Date(c.validTo)) throw bad('This coupon has expired');
  const { ExecutionProject, Booking, Property } = require('../models');
  const p = project.grandTotal !== undefined ? project : await ExecutionProject.findById(project._id).lean();
  if (c.appliesTo !== 'ALL') {
    const booking = p.booking ? await Booking.findById(p.booking).select('property snapshot.propertyCategory').lean() : null;
    let category = booking?.snapshot?.propertyCategory;
    if (!category && booking?.property) category = (await Property.findById(booking.property).select('category').lean())?.category;
    if ((category || 'RESIDENTIAL') !== c.appliesTo) throw bad(`This coupon is only for ${c.appliesTo === 'COMMERCIAL' ? 'commercial' : 'home'} projects`);
  }
  const s = await paySvc.summary(p);
  if (!s.total) throw bad('The project value is not set yet');
  if (c.minProjectValue && s.total < c.minProjectValue) throw bad(`This coupon needs a project value of at least ${fmt(c.minProjectValue)}`);
  if (s.discountApplied > 0) throw bad('A coupon has already been applied to this project', 'COUPON_ALREADY_APPLIED');
  if (c.usageLimit != null && c.usageLimit !== '' && (await usage(c._id)) >= c.usageLimit) throw bad('This coupon has been fully used');
  if ((await usage(c._id, { customer: p.customer })) >= (c.perCustomerLimit || 1)) throw bad('You have already used this coupon');
  let discount = c.type === 'PERCENT' ? Math.floor((s.total * c.value) / 100) : Math.round(c.value);
  if (c.type === 'PERCENT' && c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, s.balance);
  if (discount < 1) throw bad(s.balance < 1 ? 'Nothing is due on this project' : 'This coupon gives no discount on this project');
  return { coupon: c, discount, summary: s, label: c.type === 'PERCENT' ? `${c.value}% off${c.maxDiscount ? ` (up to ${fmt(c.maxDiscount)})` : ''}` : `${fmt(c.value)} off` };
}

/** Applies the coupon as a "Coupon discount" entry in the project ledger. One at a time per coupon (usage limits). */
async function apply(code, project, actor) {
  const c = await Coupon.findOne({ code: String(code || '').trim().toUpperCase() }).select('_id').lean();
  if (!c) throw bad('This coupon code is not valid');
  const keys = [`coupon:${c._id}`, `project-coupon:${project._id}`];
  const taken = [];
  try {
    for (const key of keys) {
      try { await Lock.create({ _id: key, expiresAt: new Date(Date.now() + 15000) }); taken.push(key); } catch (err) {
        if (err.code !== 11000) throw err;
        const stale = await Lock.deleteOne({ _id: key, expiresAt: { $lt: new Date() } });
        if (!stale.deletedCount) throw ApiError.conflict('Coupon is being applied. Please try again in a few seconds.', 'COUPON_BUSY');
        await Lock.create({ _id: key, expiresAt: new Date(Date.now() + 15000) }); taken.push(key);
      }
    }
    const ev = await evaluate(code, project);
    const payment = await Payment.create({
      paymentNumber: await nextNumber('PAY'), project: project._id, booking: project.booking, customer: project.customer,
      amount: ev.discount, method: 'COUPON', status: 'RECEIVED', receivedAt: new Date(), reference: ev.coupon.code,
      note: `Coupon ${ev.coupon.code} — ${ev.label}`, recordedBy: actor?._id, coupon: ev.coupon._id,
    });
    return { payment, ...ev };
  } finally {
    await Lock.deleteMany({ _id: { $in: taken } }).catch(() => {});
  }
}

module.exports = { evaluate, apply, usage };
