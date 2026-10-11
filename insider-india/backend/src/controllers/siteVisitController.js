const { SiteVisit, Booking } = require('../models');
const { assertAssigned, isContractor } = require('../services/scopeService');
const { assertUsable, signedList } = require('../services/mediaService');
const { advance } = require('../services/bookingSync');
const notifications = require('../services/notifications/notificationService');
const { audit } = require('../services/auditService');
const { logActivity } = require('../services/activityService');
const { parseRange } = require('../utils/dateRange');
const { formatDateIST, formatTimeIST } = require('../utils/money');
const { normalizeMobile } = require('../utils/phone');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { CHANNELS } = require('../config/constants');

const MEDIA_FIELDS = { images: ['SITE_IMAGE'], videos: ['SITE_VIDEO'], floorPlans: ['SITE_DOCUMENT'], documents: ['SITE_DOCUMENT'] };

const view = async (v, { withMedia = false } = {}) => ({
  id: String(v._id),
  bookingId: String(v.booking?._id || v.booking),
  bookingNumber: v.booking?.bookingNumber,
  customerName: v.booking?.snapshot?.name,
  contractor: v.contractor?.name ? { id: String(v.contractor._id), name: v.contractor.name } : String(v.contractor),
  scheduledAt: v.scheduledAt,
  contactPerson: v.contactPerson,
  siteAddress: v.siteAddress,
  status: v.status,
  siteCondition: v.siteCondition,
  siteConditionNotes: v.siteConditionNotes,
  notes: v.notes,
  rescheduleCount: v.rescheduleCount,
  completedAt: v.completedAt,
  cancelReason: v.cancelReason,
  ...(withMedia ? {
    images: await signedList(v.images), videos: await signedList(v.videos),
    floorPlans: await signedList(v.floorPlans), documents: await signedList(v.documents),
  } : { mediaCount: (v.images?.length || 0) + (v.videos?.length || 0) + (v.floorPlans?.length || 0) + (v.documents?.length || 0) }),
  createdAt: v.createdAt,
});

async function loadBooking(req, bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  assertAssigned(req.user, booking);
  if (!booking.assignedContractor) throw ApiError.conflict('Assign a contractor before scheduling a site visit', 'NO_CONTRACTOR');
  if (booking.status === 'CANCELLED') throw ApiError.conflict('Booking is cancelled', 'BOOKING_CANCELLED');
  return booking;
}

async function loadVisit(req) {
  const v = await SiteVisit.findById(req.params.id);
  if (!v) throw ApiError.notFound('Site visit not found');
  if (isContractor(req.user) && String(v.contractor) !== String(req.user._id)) throw ApiError.notFound('Site visit not found');
  return v;
}

async function validateMedia(body, user) {
  for (const [f, purposes] of Object.entries(MEDIA_FIELDS)) {
    if (body[f]) body[f] = await assertUsable(body[f], user, purposes, f);
  }
}

function notifySchedule(booking, visit, rescheduled) {
  notifications.send({
    user: booking.customer,
    event: 'SITE_VISIT_SCHEDULED',
    channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
    variables: {
      visitDate: formatDateIST(visit.scheduledAt, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
      visitTime: formatTimeIST(visit.scheduledAt),
      link: `${env.frontendUrl}/account/bookings/${booking._id}`,
      title: rescheduled ? 'Site visit rescheduled' : undefined,
    },
    link: `/account/bookings/${booking._id}`,
  });
}

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = isContractor(req.user) ? { contractor: req.user._id } : {};
  if (q.bookingId && /^[a-f\d]{24}$/i.test(q.bookingId)) filter.booking = q.bookingId;
  if (q.status) filter.status = String(q.status).toUpperCase();
  if (q.contractor && !isContractor(req.user) && /^[a-f\d]{24}$/i.test(q.contractor)) filter.contractor = q.contractor;
  if (q.range || q.from || q.to) { const { start, end } = parseRange(q, 'all'); filter.scheduledAt = { $gte: start, $lte: end }; }
  if (q.upcoming === 'true') { filter.status = 'SCHEDULED'; filter.scheduledAt = { $gte: new Date() }; }
  const pg = parsePagination(q, { maxLimit: 200, defaultLimit: 50 });
  const [items, total] = await Promise.all([
    SiteVisit.find(filter).sort({ scheduledAt: q.upcoming === 'true' ? 1 : -1 }).skip(pg.skip).limit(pg.limit)
      .populate('booking', 'bookingNumber snapshot.name').populate('contractor', 'name').lean(),
    SiteVisit.countDocuments(filter),
  ]);
  ok(res, { items: await Promise.all(items.map((v) => view(v))) }, 'OK', 200, pageMeta(pg, total));
});

exports.get = asyncHandler(async (req, res) => {
  const v = await loadVisit(req);
  await v.populate([{ path: 'booking', select: 'bookingNumber snapshot.name' }, { path: 'contractor', select: 'name' }]);
  ok(res, { siteVisit: await view(v.toObject(), { withMedia: true }) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const booking = await loadBooking(req, b.bookingId);
  if (await SiteVisit.exists({ booking: booking._id, status: 'SCHEDULED' })) {
    throw ApiError.conflict('A site visit is already scheduled. Reschedule it instead.', 'VISIT_EXISTS');
  }
  const contactMobile = b.contactPerson?.mobile ? normalizeMobile(b.contactPerson.mobile) : booking.snapshot.mobile;
  const visit = await SiteVisit.create({
    booking: booking._id,
    lead: booking.lead,
    contractor: booking.assignedContractor,
    scheduledAt: b.scheduledAt,
    contactPerson: { name: b.contactPerson?.name || booking.snapshot.name, mobile: contactMobile },
    siteAddress: { ...(booking.snapshot.address?.toObject?.() || booking.snapshot.address || {}), ...(b.siteAddress || {}) },
    notes: b.notes,
    createdBy: req.user._id,
  });
  booking.siteVisitAt = visit.scheduledAt;
  await advance(booking, { status: 'SITE_VISIT_SCHEDULED', event: 'SITE_VISIT_SCHEDULED', by: req.user._id, leadStatus: 'SITE_VISIT_SCHEDULED', meta: { siteVisitId: String(visit._id) } });
  await logActivity({ lead: booking.lead, booking: booking._id, actor: req.user, type: 'SITE_VISIT_SCHEDULED', message: `Site visit on ${formatDateIST(visit.scheduledAt)} ${formatTimeIST(visit.scheduledAt)}`, visibleToCustomer: true });
  notifySchedule(booking, visit, false);
  created(res, { siteVisit: await view(visit.toObject()) }, 'Site visit scheduled');
});

exports.update = asyncHandler(async (req, res) => {
  const v = await loadVisit(req);
  if (v.status !== 'SCHEDULED' && req.body.scheduledAt) throw ApiError.conflict('Only scheduled visits can be rescheduled', 'VISIT_CLOSED');
  if (v.status === 'CANCELLED') throw ApiError.conflict('Visit is cancelled', 'VISIT_CLOSED');
  const b = req.body;
  await validateMedia(b, req.user);
  const rescheduled = b.scheduledAt && new Date(b.scheduledAt).getTime() !== v.scheduledAt.getTime();
  const before = { scheduledAt: v.scheduledAt };
  if (rescheduled) { v.scheduledAt = b.scheduledAt; v.rescheduleCount += 1; v.reminderSentAt = null; }
  if (b.contactPerson) v.contactPerson = { ...v.contactPerson, ...b.contactPerson, ...(b.contactPerson.mobile ? { mobile: normalizeMobile(b.contactPerson.mobile) } : {}) };
  if (b.siteAddress) v.siteAddress = { ...(v.siteAddress?.toObject?.() || {}), ...b.siteAddress };
  for (const f of ['notes', ...Object.keys(MEDIA_FIELDS)]) if (b[f] !== undefined) v[f] = b[f];
  await v.save();

  if (rescheduled) {
    const booking = await Booking.findById(v.booking);
    booking.siteVisitAt = v.scheduledAt;
    await advance(booking, { event: 'SITE_VISIT_RESCHEDULED', by: req.user._id, meta: { rescheduled: true } });
    await audit(req, { action: 'SITE_VISIT_RESCHEDULED', entityType: 'SiteVisit', entityId: v._id, before, after: { scheduledAt: v.scheduledAt }, reason: b.reason });
    await logActivity({ lead: v.lead, booking: v.booking, actor: req.user, type: 'SITE_VISIT_RESCHEDULED', message: `Rescheduled to ${formatDateIST(v.scheduledAt)} ${formatTimeIST(v.scheduledAt)}`, visibleToCustomer: true });
    notifySchedule(booking, v, true);
  }
  ok(res, { siteVisit: await view(v.toObject()) }, rescheduled ? 'Site visit rescheduled' : 'Site visit updated');
});

exports.complete = asyncHandler(async (req, res) => {
  const v = await loadVisit(req);
  if (v.status !== 'SCHEDULED') throw ApiError.conflict('Visit is not in scheduled state', 'VISIT_CLOSED');
  if (v.scheduledAt.getTime() > Date.now() + 2 * 3600000) throw ApiError.conflict('A visit can be completed only on or after its scheduled time', 'VISIT_IN_FUTURE');
  const b = req.body;
  await validateMedia(b, req.user);
  Object.assign(v, {
    status: 'COMPLETED', completedAt: new Date(), siteCondition: b.siteCondition, siteConditionNotes: b.siteConditionNotes,
    notes: b.notes ?? v.notes,
    images: [...new Set([...v.images.map(String), ...b.images])],
    videos: [...new Set([...v.videos.map(String), ...b.videos])],
    floorPlans: [...new Set([...v.floorPlans.map(String), ...b.floorPlans])],
    documents: [...new Set([...v.documents.map(String), ...b.documents])],
  });
  await v.save();
  const booking = await Booking.findById(v.booking);
  await advance(booking, { status: 'SITE_VISIT_COMPLETED', event: 'SITE_VISIT_COMPLETED', by: req.user._id, leadStatus: 'SITE_VISIT_COMPLETED' });
  await logActivity({ lead: v.lead, booking: v.booking, actor: req.user, type: 'SITE_VISIT_COMPLETED', message: 'Site visit completed', visibleToCustomer: true });
  ok(res, { siteVisit: await view(v.toObject()) }, 'Site visit marked complete');
});

exports.cancel = asyncHandler(async (req, res) => {
  const v = await loadVisit(req);
  if (v.status !== 'SCHEDULED') throw ApiError.conflict('Only scheduled visits can be cancelled', 'VISIT_CLOSED');
  Object.assign(v, { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: req.body.reason });
  await v.save();
  await Booking.updateOne({ _id: v.booking }, { $unset: { siteVisitAt: 1 } });
  await audit(req, { action: 'SITE_VISIT_CANCELLED', entityType: 'SiteVisit', entityId: v._id, reason: req.body.reason });
  await logActivity({ lead: v.lead, booking: v.booking, actor: req.user, type: 'SITE_VISIT_CANCELLED', message: `Site visit cancelled: ${req.body.reason}` });
  ok(res, { siteVisit: await view(v.toObject()) }, 'Site visit cancelled');
});

