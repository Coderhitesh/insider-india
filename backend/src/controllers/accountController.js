const { User, CustomerProfile, Booking, Lead, Estimate, Quotation, SiteVisit, ExecutionProject, Notification, Media } = require('../models');
const { signedList } = require('../services/mediaService');
const { budgetSummary } = require('../services/bookingEstimateService');
const { audit } = require('../services/auditService');
const { bookingView, estimateView, leadView, publicUser } = require('../utils/serializers');
const { ok } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { LEAD_OPEN_STATUS } = require('../config/constants');

const CLOSED = ['CANCELLED', 'PROJECT_COMPLETED'];

// One request for the dashboard home.
exports.summary = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [bookings, openLead, estimate, unread, recent] = await Promise.all([
    Booking.find({ customer: uid }).sort({ createdAt: -1 }).limit(10).populate('assignedContractor', 'name').lean(),
    Lead.findOne({ user: uid, status: { $in: LEAD_OPEN_STATUS }, booking: null }).sort({ lastActivityAt: -1 }).populate('services', 'title slug'),
    Estimate.findOne({ user: uid }).sort({ createdAt: -1 }).lean(),
    Notification.countDocuments({ user: uid, channel: 'IN_APP', readAt: null }),
    Notification.find({ user: uid, channel: 'IN_APP' }).sort({ createdAt: -1 }).limit(4).select('title body link readAt createdAt').lean(),
  ]);

  const active = bookings.find((b) => !CLOSED.includes(b.status)) || bookings[0] || null;
  let siteVisit = null; let quotation = null; let project = null; let budget = null;
  if (active) {
    const [v, q, p] = await Promise.all([
      SiteVisit.findOne({ booking: active._id, status: { $in: ['SCHEDULED', 'COMPLETED'] } }).sort({ scheduledAt: -1 }).populate('contractor', 'name').lean(),
      Quotation.findOne({ booking: active._id, sentAt: { $ne: null } }).sort({ version: -1 }).lean(),
      ExecutionProject.findOne({ booking: active._id }).select('projectNumber stage startedAt').lean(),
    ]);
    if (v) siteVisit = { scheduledAt: v.scheduledAt, status: v.status, expert: v.contractor?.name };
    if (q) quotation = { id: String(q._id), displayNumber: q.displayNumber, status: q.status, isLatest: q.isLatest, grandTotal: q.totals.grandTotal, sentAt: q.sentAt, validUntil: q.validUntil };
    if (p) project = { id: String(p._id), projectNumber: p.projectNumber, stage: p.stage, startedAt: p.startedAt };
    if (active.estimate) budget = budgetSummary(await Estimate.findById(active.estimate).lean());
  }

  ok(res, {
    user: publicUser(req.user),
    activeBooking: active ? bookingView(active) : null,
    bookings: bookings.map((b) => ({ id: String(b._id), bookingNumber: b.bookingNumber, status: b.status, createdAt: b.createdAt, city: b.snapshot?.address?.city })),
    siteVisit, quotation, project, budget,
    openLead: openLead ? leadView(openLead) : null,
    estimate: estimate ? estimateView(estimate) : null,
    floorPlans: active?.floorPlan?.media?.length || 0,
    notifications: { unread, recent: recent.map((n) => ({ id: String(n._id), title: n.title, body: n.body, link: n.link, readAt: n.readAt, createdAt: n.createdAt })) },
  });
});

const profileView = (u, p) => ({
  ...publicUser(u), city: p?.city || '', preferredChannel: p?.preferredChannel || 'WHATSAPP', marketingConsent: Boolean(p?.marketingConsent), memberSince: u.createdAt,
});

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await CustomerProfile.findOne({ user: req.user._id }).lean();
  ok(res, { profile: profileView(req.user, profile) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, city, preferredChannel, marketingConsent } = req.body;
  const user = await User.findById(req.user._id);
  if (email !== undefined) {
    const e = email || undefined;
    if (e && e !== user.email && (await User.exists({ email: e, _id: { $ne: user._id } }))) {
      throw new ApiError(409, 'This email is already linked to another account', 'DUPLICATE', [{ field: 'email', message: 'Already in use' }]);
    }
    if (e !== user.email) user.emailVerified = false;
    user.email = e;
  }
  if (name !== undefined) user.name = name;
  await user.save();
  const set = {};
  if (city !== undefined) set.city = city;
  if (preferredChannel !== undefined) set.preferredChannel = preferredChannel;
  if (marketingConsent !== undefined) { set.marketingConsent = marketingConsent; set.consentAt = new Date(); }
  const profile = await CustomerProfile.findOneAndUpdate({ user: user._id }, { $set: set, $setOnInsert: { user: user._id } }, { upsert: true, new: true }).lean();
  if (marketingConsent !== undefined) await audit(req, { action: 'CONSENT_UPDATED', entityType: 'User', entityId: user._id, after: { marketingConsent } });
  ok(res, { profile: profileView(user.toObject(), profile) }, 'Profile saved');
});

// Everything the customer can download, grouped by source.
exports.documents = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [bookings, quotations, projects] = await Promise.all([
    Booking.find({ customer: uid }).select('bookingNumber floorPlan.media createdAt').lean(),
    Quotation.find({ customer: uid, sentAt: { $ne: null }, pdf: { $ne: null } }).sort({ sentAt: -1 }).populate('booking', 'bookingNumber').select('displayNumber version isLatest status sentAt booking').lean(),
    ExecutionProject.find({ customer: uid }).select('projectNumber documents').lean(),
  ]);
  const fpIds = bookings.flatMap((b) => b.floorPlan?.media || []);
  const fpMedia = await Media.find({ _id: { $in: fpIds }, owner: uid, deletedAt: null }).select('originalName mimeType size createdAt').lean();
  const fpById = new Map(fpMedia.map((m) => [String(m._id), m]));

  const projectDocs = [];
  for (const p of projects) {
    const docs = (p.documents || []).filter((d) => d.visibleToCustomer);
    const signed = await signedList(docs.map((d) => d.media));
    const byId = new Map(signed.map((s) => [s.id, s]));
    docs.forEach((d) => { const f = byId.get(String(d.media)); if (f) projectDocs.push({ ...f, title: d.title || f.originalName, projectNumber: p.projectNumber }); });
  }

  ok(res, {
    floorPlans: bookings.flatMap((b) => (b.floorPlan?.media || []).map((id) => fpById.get(String(id))).filter(Boolean).map((m) => ({
      id: String(m._id), originalName: m.originalName, mimeType: m.mimeType, size: m.size, bookingNumber: b.bookingNumber, createdAt: m.createdAt,
    }))),
    quotations: quotations.map((q) => ({ id: String(q._id), displayNumber: q.displayNumber, version: q.version, isLatest: q.isLatest, status: q.status, sentAt: q.sentAt, bookingNumber: q.booking?.bookingNumber })),
    projectDocuments: projectDocs,
  });
});
