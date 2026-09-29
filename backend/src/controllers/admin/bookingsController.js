const { Booking, Lead, ActivityLog, Note, Estimate } = require('../../models');
const { assignContractor } = require('../../services/assignmentService');
const { assignedScope, assertAssigned, isContractor } = require('../../services/scopeService');
const StorageService = require('../../services/storage/StorageService');
const notifications = require('../../services/notifications/notificationService');
const { audit } = require('../../services/auditService');
const { logActivity } = require('../../services/activityService');
const { bookingView, estimateView } = require('../../utils/serializers');
const { parseRange } = require('../../utils/dateRange');
const { escapeRegex, splitList } = require('../../utils/text');
const { sendCsv } = require('../../utils/csv');
const { parsePagination, pageMeta } = require('../../utils/pagination');
const { ok } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');
const env = require('../../config/env');
const { TIMELINE, CHANNELS } = require('../../config/constants');

// Manual status changes allowed from the admin panel (quotation statuses are driven by the quotation module).
// Site-visit, quotation and project statuses are driven by their own workflows.
const MANUAL = {
  CANCELLED: { lead: 'CANCELLED' },
  CONFIRMED: {},
};
const SORTS = { createdAt: { createdAt: 1 }, '-createdAt': { createdAt: -1 } };

function buildFilter(q, user) {
  const and = [assignedScope(user)];
  if (q.status) and.push({ status: { $in: splitList(q.status) } });
  if (q.range || q.from || q.to) {
    const { start, end } = parseRange(q, 'all');
    and.push({ createdAt: { $gte: start, $lte: end } });
  }
  if (q.city) and.push({ 'snapshot.address.city': new RegExp(`^${escapeRegex(q.city)}$`, 'i') });
  if (q.bhk) and.push({ 'snapshot.bhk': q.bhk });
  if (q.budget) and.push({ 'snapshot.budgetRange': q.budget });
  if (q.service) and.push({ 'snapshot.services.service': q.service });
  if (q.package) and.push({ package: q.package });
  if (q.contractor && !isContractor(user)) and.push({ assignedContractor: q.contractor === 'unassigned' ? null : q.contractor });
  if (q.assignedAdmin) and.push({ assignedAdmin: q.assignedAdmin });
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const digits = q.q.replace(/\D/g, '');
    and.push({ $or: [{ bookingNumber: rx }, { 'snapshot.name': rx }, ...(digits.length >= 4 ? [{ 'snapshot.mobile': new RegExp(escapeRegex(digits.slice(-10))) }] : [])] });
  }
  return { $and: and };
}

exports.list = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = buildFilter(q, req.user);
  const sort = SORTS[q.sort] || { createdAt: -1 };

  if (q.format === 'csv') {
    const rows = await Booking.find(filter).sort(sort).limit(20000).populate('assignedContractor', 'name').lean();
    await audit(req, { action: 'BOOKINGS_EXPORTED', entityType: 'Booking', meta: { count: rows.length, filters: q } });
    return sendCsv(res, `bookings-${Date.now()}.csv`, rows.map((b) => bookingView(b, { customer: false })), [
      { label: 'Booking ID', value: 'bookingNumber' }, { label: 'Status', value: 'status' }, { label: 'Customer', value: 'customerName' },
      { label: 'Mobile', value: 'mobile' }, { label: 'City', value: (r) => r.address?.city }, { label: 'Pincode', value: (r) => r.address?.pincode },
      { label: 'Requirement', value: (r) => r.labels.requirementType }, { label: 'BHK', value: (r) => r.labels.bhk },
      { label: 'Property', value: (r) => r.labels.propertyType }, { label: 'Budget', value: (r) => r.labels.budgetRange },
      { label: 'Services', value: 'services' }, { label: 'Floor Plan', value: (r) => (r.floorPlan.hasFloorPlan ? 'Uploaded' : r.floorPlan.measurementAssistance?.opted ? 'Assistance opted' : 'None') },
      { label: 'Contractor', value: (r) => r.assignedContractor?.name }, { label: 'Created', value: 'createdAt' },
    ]);
  }

  const pg = parsePagination(q, { maxLimit: 200 });
  const [items, total] = await Promise.all([
    Booking.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).populate('assignedContractor', 'name').lean(),
    Booking.countDocuments(filter),
  ]);
  return ok(res, { items: items.map((b) => bookingView(b, { customer: false })) }, 'OK', 200, pageMeta(pg, total));
});

exports.get = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate([{ path: 'assignedContractor', select: 'name mobile' }, { path: 'assignment.assignedBy', select: 'name' },
      { path: 'floorPlan.media' }, { path: 'assignmentHistory.contractor', select: 'name' }, { path: 'assignmentHistory.assignedBy', select: 'name' },
      { path: 'package', select: 'name slug' }])
    .lean();
  if (!booking) throw ApiError.notFound('Booking not found');
  assertAssigned(req.user, booking);

  const floorPlans = await Promise.all((booking.floorPlan?.media || []).filter((m) => !m.deletedAt).map(async (m) => ({
    id: String(m._id), originalName: m.originalName, mimeType: m.mimeType, size: m.size,
    url: await StorageService.getUrl(m).catch((err) => { logger.warn('Signed URL failed', { error: err.message }); return null; }),
  })));

  const noteFilter = { $or: [{ booking: booking._id }, { lead: booking.lead }], deletedAt: null, ...(isContractor(req.user) ? { visibility: 'STAFF' } : {}) };
  const [activity, notes, estimate] = await Promise.all([
    ActivityLog.find({ $or: [{ booking: booking._id }, { lead: booking.lead }] }).sort({ createdAt: -1 }).limit(200).populate('actor', 'name role').lean(),
    Note.find(noteFilter).sort({ createdAt: -1 }).populate('createdBy', 'name role').lean(),
    booking.estimate ? Estimate.findById(booking.estimate).lean() : null,
  ]);

  ok(res, {
    booking: {
      ...bookingView(booking, { customer: false }),
      leadId: String(booking.lead),
      customerId: String(booking.customer),
      package: booking.package ? { id: String(booking.package._id), name: booking.package.name } : null,
      assignedContractor: booking.assignedContractor ? { id: String(booking.assignedContractor._id), name: booking.assignedContractor.name, mobile: booking.assignedContractor.mobile } : null,
      assignment: booking.assignment?.assignedAt ? { assignedBy: booking.assignment.assignedBy?.name, assignedAt: booking.assignment.assignedAt, remarks: booking.assignment.remarks } : null,
      assignmentHistory: (booking.assignmentHistory || []).map((h) => ({ contractor: h.contractor?.name, assignedBy: h.assignedBy?.name, assignedAt: h.assignedAt, unassignedAt: h.unassignedAt, remarks: h.remarks })),
      timeline: (booking.timeline || []).map((t) => ({ event: t.event, label: t.label, at: t.at, visibleToCustomer: t.visibleToCustomer })),
      floorPlans,
      cancelReason: booking.cancelReason,
    },
    estimate: estimate ? estimateView(estimate) : null,
    activity: activity.map((a) => ({ id: String(a._id), type: a.type, message: a.message, actor: a.actor ? { name: a.actor.name, role: a.actor.role } : null, createdAt: a.createdAt })),
    notes: notes.map((n) => ({ id: String(n._id), text: n.text, visibility: n.visibility, createdBy: n.createdBy ? { name: n.createdBy.name, role: n.createdBy.role } : null, createdAt: n.createdAt })),
  });
});

exports.assign = asyncHandler(async (req, res) => {
  const result = await assignContractor(req, { bookingId: req.params.id, contractorId: req.body.contractorId, remarks: req.body.remarks });
  ok(res, { contractor: result.contractor, bookingId: String(result.booking._id) }, 'Contractor assigned');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const rule = MANUAL[status];
  if (!rule) throw ApiError.badRequest('This status is set automatically by the site-visit, quotation or project workflow', 'STATUS_NOT_MANUAL');

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status === status) throw ApiError.conflict('Booking already has this status', 'NO_CHANGE');
  if (booking.status === 'CANCELLED' && status !== 'CONFIRMED') throw ApiError.conflict('Reopen the booking before changing its status', 'BOOKING_CANCELLED');

  const before = booking.status;
  const now = new Date();
  booking.status = status;
  if (status === 'CANCELLED') { booking.cancelledAt = now; booking.cancelReason = note; }
  if (status === 'CONFIRMED') { booking.cancelledAt = undefined; booking.cancelReason = undefined; }
  if (rule.timeline) booking.timeline.push({ event: rule.timeline, label: TIMELINE[rule.timeline], at: now, by: req.user._id, visibleToCustomer: true });
  await booking.save();

  if (rule.lead) await Lead.updateOne({ _id: booking.lead }, { $set: { status: rule.lead, lastActivityAt: now } });
  if (status === 'CONFIRMED') await Lead.updateOne({ _id: booking.lead, status: 'CANCELLED' }, { $set: { status: 'BOOKED' } });

  await audit(req, { action: 'BOOKING_STATUS_CHANGED', entityType: 'Booking', entityId: booking._id, before: { status: before }, after: { status }, reason: note });
  await logActivity({ lead: booking.lead, booking: booking._id, actor: req.user, type: 'BOOKING_STATUS_CHANGED', message: `Status ${before} → ${status}`, meta: { note } });
  if (rule.notify) {
    notifications.send({
      user: booking.customer,
      event: 'PROJECT_STATUS_UPDATED',
      channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
      variables: { stage: TIMELINE[rule.timeline], link: `${env.frontendUrl}/account/bookings/${booking._id}` },
      link: `/account/bookings/${booking._id}`,
    });
  }
  ok(res, { booking: bookingView(booking.toObject(), { customer: false }) }, 'Status updated');
});
