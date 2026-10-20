const { User, CustomerProfile, Lead, Booking, Estimate } = require('../../models');
const tokenService = require('../../services/tokenService');
const { audit } = require('../../services/auditService');
const { leadView, bookingView, estimateView } = require('../../utils/serializers');
const { parseRange } = require('../../utils/dateRange');
const { escapeRegex } = require('../../utils/text');
const { sendCsv } = require('../../utils/csv');
const { parsePagination, pageMeta } = require('../../utils/pagination');
const { ok } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

async function withCounts(users) {
  const ids = users.map((u) => u._id);
  const [leads, bookings, profiles] = await Promise.all([
    Lead.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', n: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { customer: { $in: ids } } }, { $group: { _id: '$customer', n: { $sum: 1 } } }]),
    CustomerProfile.find({ user: { $in: ids } }).lean(),
  ]);
  const L = new Map(leads.map((x) => [String(x._id), x.n]));
  const B = new Map(bookings.map((x) => [String(x._id), x.n]));
  const P = new Map(profiles.map((p) => [String(p.user), p]));
  return users.map((u) => ({
    id: String(u._id), name: u.name, mobile: u.mobile, email: u.email, status: u.status,
    city: P.get(String(u._id))?.city || null, utm: P.get(String(u._id))?.utm || null,
    leads: L.get(String(u._id)) || 0, bookings: B.get(String(u._id)) || 0,
    lastLogin: u.lastLogin, createdAt: u.createdAt,
  }));
}

exports.list = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = { role: 'CUSTOMER' };
  if (q.status) filter.status = q.status;
  if (q.range || q.from || q.to) { const { start, end } = parseRange(q, 'all'); filter.createdAt = { $gte: start, $lte: end }; }
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const digits = q.q.replace(/\D/g, '');
    filter.$or = [{ name: rx }, { email: rx }, ...(digits.length >= 4 ? [{ mobile: new RegExp(escapeRegex(digits.slice(-10))) }] : [])];
  }
  if (q.format === 'csv') {
    const rows = await withCounts(await User.find(filter).sort({ createdAt: -1 }).limit(20000).lean());
    await audit(req, { action: 'CUSTOMERS_EXPORTED', entityType: 'User', meta: { count: rows.length } });
    return sendCsv(res, `customers-${Date.now()}.csv`, rows, [
      { label: 'Name', value: 'name' }, { label: 'Mobile', value: 'mobile' }, { label: 'Email', value: 'email' }, { label: 'City', value: 'city' },
      { label: 'Status', value: 'status' }, { label: 'Leads', value: 'leads' }, { label: 'Bookings', value: 'bookings' }, { label: 'Joined', value: 'createdAt' },
    ]);
  }
  const pg = parsePagination(q, { maxLimit: 200 });
  const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), User.countDocuments(filter)]);
  return ok(res, { items: await withCounts(users) }, 'OK', 200, pageMeta(pg, total));
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' }).lean();
  if (!user) throw ApiError.notFound('Customer not found');
  const [profile, leads, bookings, estimates] = await Promise.all([
    CustomerProfile.findOne({ user: user._id }).lean(),
    Lead.find({ user: user._id }).sort({ createdAt: -1 }).limit(50).populate('services', 'title slug'),
    Booking.find({ customer: user._id }).sort({ createdAt: -1 }).limit(50).populate('assignedContractor', 'name').lean(),
    Estimate.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  ok(res, {
    customer: { id: String(user._id), name: user.name, mobile: user.mobile, email: user.email, status: user.status, mobileVerified: user.mobileVerified, lastLogin: user.lastLogin, createdAt: user.createdAt, profile },
    leads: leads.map(leadView),
    bookings: bookings.map((b) => bookingView(b, { customer: false })),
    estimates: estimates.map(estimateView),
  });
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' });
  if (!user) throw ApiError.notFound('Customer not found');
  const { city, marketingConsent, ...fields } = req.body;
  const before = { name: user.name, email: user.email, status: user.status };
  if (fields.email === null) fields.email = undefined;
  user.set(fields);
  await user.save();
  if (city !== undefined || marketingConsent !== undefined) {
    await CustomerProfile.updateOne({ user: user._id }, {
      $set: { ...(city !== undefined ? { city } : {}), ...(marketingConsent !== undefined ? { marketingConsent, consentAt: new Date() } : {}) },
    }, { upsert: true });
  }
  if (fields.status && fields.status !== 'ACTIVE') await tokenService.revokeAllForUser(user._id, 'ACCOUNT_DISABLED');
  await audit(req, { action: 'CUSTOMER_UPDATED', entityType: 'User', entityId: user._id, before, after: { ...fields, city, marketingConsent } });
  ok(res, {}, 'Customer updated');
});

// Anonymises personal data; bookings/quotations remain for business records.
exports.remove = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' });
  if (!user) throw ApiError.notFound('Customer not found');
  const before = { name: user.name, mobile: user.mobile, email: user.email };
  await tokenService.revokeAllForUser(user._id, 'ACCOUNT_DELETED');
  user.name = 'Deleted customer';
  user.mobile = undefined;
  user.email = undefined;
  user.status = 'INACTIVE';
  user.loginEnabled = false;
  await user.save();
  await Lead.updateMany({ user: user._id }, { $set: { name: 'Deleted customer', mobile: 'deleted' }, $unset: { utm: 1, referrer: 1 } });
  await Booking.updateMany({ customer: user._id }, { $set: { 'snapshot.name': 'Deleted customer', 'snapshot.mobile': 'deleted' } });
  await CustomerProfile.deleteOne({ user: user._id });
  await audit(req, { action: 'CUSTOMER_DELETED', entityType: 'User', entityId: user._id, before, reason: req.body?.reason });
  ok(res, {}, 'Customer deleted');
});
