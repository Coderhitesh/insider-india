const { Measurement, Booking, SiteVisit } = require('../models');
const { assertAssigned, isContractor } = require('../services/scopeService');
const { advance } = require('../services/bookingSync');
const rbac = require('../services/rbacService');
const { audit } = require('../services/auditService');
const { logActivity } = require('../services/activityService');
const { ok } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const LINEAR = ['FT', 'INCH', 'MM', 'CM', 'M'];
const AREA_OF = { FT: 'SQFT', M: 'SQM' };
const r2 = (v) => Math.round(v * 100) / 100;

// Derive area when the contractor gave two linear dimensions but no area.
function deriveArea(row) {
  if (row.area || !LINEAR.includes(row.unit)) return row;
  const a = row.width; const b = row.length || row.height;
  if (a && b) row.area = r2(a * b);
  return row;
}

const view = (m) => (m ? {
  id: String(m._id), bookingId: String(m.booking), siteVisitId: m.siteVisit ? String(m.siteVisit) : null,
  status: m.status, notes: m.notes, rooms: m.rooms, finalizedAt: m.finalizedAt,
  areaUnitHint: AREA_OF, recordedBy: m.recordedBy?.name ? { id: String(m.recordedBy._id), name: m.recordedBy.name } : null,
  updatedAt: m.updatedAt,
} : null);

async function loadBooking(req) {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  assertAssigned(req.user, booking);
  return booking;
}

exports.get = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  const m = await Measurement.findOne({ booking: booking._id }).populate('recordedBy', 'name').lean();
  ok(res, { measurement: view(m) });
});

exports.save = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  const existing = await Measurement.findOne({ booking: booking._id });
  if (existing?.status === 'FINAL') throw ApiError.conflict('Measurements are finalised. Ask an admin to reopen them.', 'MEASUREMENT_FINAL');

  let siteVisit;
  if (req.body.siteVisitId) {
    siteVisit = await SiteVisit.findOne({ _id: req.body.siteVisitId, booking: booking._id }).select('_id').lean();
    if (!siteVisit) throw ApiError.badRequest('Site visit does not belong to this booking', 'INVALID_SITE_VISIT');
  }
  const rooms = req.body.rooms.map((r) => ({ ...r, rows: r.rows.map(deriveArea) }));
  const m = existing || new Measurement({ booking: booking._id, lead: booking.lead, recordedBy: req.user._id });
  m.rooms = rooms;
  m.notes = req.body.notes;
  if (siteVisit) m.siteVisit = siteVisit._id;
  m.recordedBy = req.user._id;
  await m.save();
  await m.populate('recordedBy', 'name');
  ok(res, { measurement: view(m.toObject()) }, 'Measurements saved');
});

exports.finalize = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  const m = await Measurement.findOne({ booking: booking._id });
  if (!m) throw ApiError.notFound('No measurements recorded yet');
  if (m.status === 'FINAL') throw ApiError.conflict('Already finalised', 'MEASUREMENT_FINAL');
  const rows = m.rooms.reduce((s, r) => s + r.rows.length, 0);
  if (!m.rooms.length || !rows) throw ApiError.unprocessable('Add at least one room with measurements before finalising', 'MEASUREMENT_EMPTY');
  if (!(await SiteVisit.exists({ booking: booking._id, status: 'COMPLETED' }))) {
    throw ApiError.unprocessable('Complete the site visit before finalising measurements', 'SITE_VISIT_PENDING');
  }
  Object.assign(m, { status: 'FINAL', finalizedAt: new Date(), finalizedBy: req.user._id });
  await m.save();
  await advance(booking, { event: 'MEASUREMENTS_RECORDED', by: req.user._id });
  await logActivity({ lead: booking.lead, booking: booking._id, actor: req.user, type: 'MEASUREMENTS_RECORDED', message: `${m.rooms.length} room(s), ${rows} measurement(s) finalised`, visibleToCustomer: true });
  ok(res, { measurement: view(m.toObject()) }, 'Measurements finalised');
});

exports.reopen = asyncHandler(async (req, res) => {
  if (isContractor(req.user)) throw ApiError.forbidden('Only an admin can reopen measurements');
  const perms = await rbac.getEffectivePermissions(req.user);
  if (!rbac.hasPermission(perms, 'quotations.review')) throw ApiError.forbidden();
  const booking = await loadBooking(req);
  const m = await Measurement.findOne({ booking: booking._id });
  if (!m || m.status !== 'FINAL') throw ApiError.conflict('Measurements are not finalised', 'NOT_FINAL');
  m.status = 'DRAFT';
  await m.save();
  await audit(req, { action: 'MEASUREMENT_REOPENED', entityType: 'Measurement', entityId: m._id, reason: req.body?.reason });
  ok(res, { measurement: view(m.toObject()) }, 'Measurements reopened for editing');
});
