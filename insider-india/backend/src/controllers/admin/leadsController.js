const { Lead, Booking, Estimate, ActivityLog, Note, User } = require('../../models');
const options = require('../../services/optionsService');
const { assignContractor } = require('../../services/assignmentService');
const { assignedScope, assertAssigned, isContractor } = require('../../services/scopeService');
const { computeNextStep, stepIndex } = require('../../services/leadFlow');
const { audit } = require('../../services/auditService');
const { logActivity } = require('../../services/activityService');
const { leadView, estimateView, bookingView } = require('../../utils/serializers');
const { parseRange } = require('../../utils/dateRange');
const { escapeRegex, splitList } = require('../../utils/text');
const { sendCsv } = require('../../utils/csv');
const { parsePagination, pageMeta } = require('../../utils/pagination');
const { ok } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { LEAD_OPEN_STATUS } = require('../../config/constants');

const ABANDON_AFTER_MS = 24 * 3600000;
const SORTS = { createdAt: { createdAt: 1 }, '-createdAt': { createdAt: -1 }, lastActivityAt: { lastActivityAt: 1 }, '-lastActivityAt': { lastActivityAt: -1 }, name: { name: 1 }, '-name': { name: -1 } };

async function buildFilter(q, user) {
  const and = [assignedScope(user)];
  if (q.status) and.push({ status: { $in: splitList(q.status) } });
  if (q.flow) and.push({ flow: q.flow });
  if (q.range || q.from || q.to) {
    const { start, end } = parseRange(q, 'all');
    and.push({ createdAt: { $gte: start, $lte: end } });
  }
  if (q.city) {
    const rx = new RegExp(`^${escapeRegex(q.city)}$`, 'i');
    and.push({ $or: [{ city: rx }, { 'property.address.city': rx }] });
  }
  if (q.bhk) and.push({ 'property.bhk': q.bhk });
  if (q.budget) and.push({ budgetRange: q.budget });
  if (q.service) and.push({ services: q.service });
  if (q.package) {
    const ids = await Estimate.distinct('_id', { selectedPackage: q.package });
    and.push({ estimate: { $in: ids } });
  }
  if (q.contractor && !isContractor(user)) and.push({ assignedContractor: q.contractor === 'unassigned' ? null : q.contractor });
  if (q.assignedAdmin) and.push({ assignedAdmin: q.assignedAdmin });
  if (q.verified === 'true') and.push({ verifiedAt: { $ne: null } });
  if (q.verified === 'false') and.push({ verifiedAt: null });
  if (q.abandoned === 'true') {
    and.push({ status: { $in: LEAD_OPEN_STATUS }, booking: null, lastActivityAt: { $lt: new Date(Date.now() - ABANDON_AFTER_MS) } });
  }
  if (q.q) {
    const digits = q.q.replace(/\D/g, '');
    const rx = new RegExp(escapeRegex(q.q), 'i');
    and.push({ $or: [{ name: rx }, { leadNumber: rx }, ...(digits.length >= 4 ? [{ mobile: new RegExp(escapeRegex(digits.slice(-10))) }] : [])] });
  }
  return { $and: and };
}

function listItem(l, opts) {
  const next = computeNextStep(l);
  const open = LEAD_OPEN_STATUS.includes(l.status) && !l.booking;
  const abandoned = open && Date.now() - new Date(l.lastActivityAt).getTime() > ABANDON_AFTER_MS;
  return {
    id: String(l._id),
    leadNumber: l.leadNumber,
    name: l.name,
    mobile: l.mobile,
    flow: l.flow,
    status: l.status,
    city: l.property?.address?.city || l.city || null,
    bhk: options.labelOf(opts, 'bhkOptions', l.property?.bhk),
    budget: options.labelOf(opts, 'budgetRanges', l.budgetRange),
    requirement: options.labelOf(opts, 'requirementTypes', l.requirementType),
    services: (l.services || []).map((s) => s.title).filter(Boolean),
    verified: Boolean(l.verifiedAt),
    nextStep: next,
    progress: open ? `Step ${stepIndex(next)} — ${next}` : null,
    abandonedAt: abandoned ? `Abandoned at Step ${stepIndex(next)} (${next})` : null,
    assignedContractor: l.assignedContractor ? { id: String(l.assignedContractor._id), name: l.assignedContractor.name } : null,
    assignedAdmin: l.assignedAdmin ? { id: String(l.assignedAdmin._id), name: l.assignedAdmin.name } : null,
    bookingId: l.booking ? String(l.booking) : null,
    utm: l.utm,
    createdAt: l.createdAt,
    lastActivityAt: l.lastActivityAt,
  };
}

exports.list = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = await buildFilter(q, req.user);
  const opts = await options.getFunnelOptions({ activeOnly: false });
  const sort = SORTS[q.sort || '-createdAt'];
  const populate = [{ path: 'services', select: 'title' }, { path: 'assignedContractor', select: 'name' }, { path: 'assignedAdmin', select: 'name' }];

  if (q.format === 'csv') {
    const rows = (await Lead.find(filter).sort(sort).limit(20000).populate(populate).lean()).map((l) => listItem(l, opts));
    await audit(req, { action: 'LEADS_EXPORTED', entityType: 'Lead', meta: { count: rows.length, filters: q } });
    return sendCsv(res, `leads-${Date.now()}.csv`, rows, [
      { label: 'Lead ID', value: 'leadNumber' }, { label: 'Name', value: 'name' }, { label: 'Mobile', value: 'mobile' },
      { label: 'Flow', value: 'flow' }, { label: 'Status', value: 'status' }, { label: 'City', value: 'city' },
      { label: 'BHK', value: 'bhk' }, { label: 'Budget', value: 'budget' }, { label: 'Requirement', value: 'requirement' },
      { label: 'Services', value: 'services' }, { label: 'Verified', value: (r) => (r.verified ? 'Yes' : 'No') },
      { label: 'Abandoned', value: 'abandonedAt' }, { label: 'Contractor', value: (r) => r.assignedContractor?.name },
      { label: 'UTM Source', value: (r) => r.utm?.source }, { label: 'UTM Campaign', value: (r) => r.utm?.campaign },
      { label: 'Created', value: 'createdAt' }, { label: 'Last Activity', value: 'lastActivityAt' },
    ]);
  }

  const pg = parsePagination(q, { maxLimit: 200 });
  const [items, total] = await Promise.all([
    Lead.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).populate(populate).lean(),
    Lead.countDocuments(filter),
  ]);
  return ok(res, { items: items.map((l) => listItem(l, opts)) }, 'OK', 200, pageMeta(pg, total));
});

async function loadLead(req) {
  const lead = await Lead.findById(req.params.id)
    .populate([{ path: 'services', select: 'title slug' }, { path: 'floorPlan.media', select: 'originalName mimeType size' },
      { path: 'assignedContractor', select: 'name mobile' }, { path: 'assignedAdmin', select: 'name' }, { path: 'assignment.assignedBy', select: 'name' }]);
  if (!lead) throw ApiError.notFound('Lead not found');
  assertAssigned(req.user, lead);
  return lead;
}

exports.get = asyncHandler(async (req, res) => {
  const lead = await loadLead(req);
  const noteFilter = { lead: lead._id, deletedAt: null, ...(isContractor(req.user) ? { visibility: 'STAFF' } : {}) };
  const [activity, notes, estimate, booking] = await Promise.all([
    ActivityLog.find({ lead: lead._id }).sort({ createdAt: -1 }).limit(200).populate('actor', 'name role').lean(),
    Note.find(noteFilter).sort({ createdAt: -1 }).populate('createdBy', 'name role').populate('attachments', 'originalName mimeType size').lean(),
    lead.estimate ? Estimate.findById(lead.estimate).lean() : null,
    lead.booking ? Booking.findById(lead.booking).populate('assignedContractor', 'name').lean() : null,
  ]);
  const opts = await options.getFunnelOptions({ activeOnly: false });
  const l = lead.toObject();
  ok(res, {
    lead: {
      ...leadView(lead),
      labels: {
        requirementType: options.labelOf(opts, 'requirementTypes', l.requirementType),
        budgetRange: options.labelOf(opts, 'budgetRanges', l.budgetRange),
        possession: options.labelOf(opts, 'possessionOptions', l.possession),
        propertyType: options.labelOf(opts, 'propertyTypes', l.property?.propertyType),
        bhk: options.labelOf(opts, 'bhkOptions', l.property?.bhk),
        projectType: options.labelOf(opts, 'projectTypes', l.projectType),
      },
      assignedContractor: l.assignedContractor ? { id: String(l.assignedContractor._id), name: l.assignedContractor.name, mobile: l.assignedContractor.mobile } : null,
      assignedAdmin: l.assignedAdmin ? { id: String(l.assignedAdmin._id), name: l.assignedAdmin.name } : null,
      assignment: l.assignment?.assignedAt ? { assignedBy: l.assignment.assignedBy?.name, assignedAt: l.assignment.assignedAt, remarks: l.assignment.remarks } : null,
      utm: l.utm, referrer: l.referrer, landingPage: l.landingPage, lostReason: l.lostReason,
      createdAt: l.createdAt, lastActivityAt: l.lastActivityAt,
    },
    estimate: estimate ? estimateView(estimate) : null,
    booking: booking ? bookingView(booking, { customer: false }) : null,
    activity: activity.map((a) => ({ id: String(a._id), type: a.type, message: a.message, actor: a.actor ? { name: a.actor.name, role: a.actor.role } : null, meta: a.meta, createdAt: a.createdAt })),
    notes: notes.map((n) => ({ id: String(n._id), text: n.text, visibility: n.visibility, createdBy: n.createdBy ? { id: String(n.createdBy._id), name: n.createdBy.name, role: n.createdBy.role } : null, attachments: n.attachments, createdAt: n.createdAt })),
  });
});

const OPTION_FIELDS = { requirementType: 'requirementTypes', budgetRange: 'budgetRanges', possession: 'possessionOptions', projectType: 'projectTypes' };

exports.update = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound('Lead not found');
  const { reason, ...data } = req.body;

  const opts = await options.getFunnelOptions({ activeOnly: false });
  for (const [field, list] of Object.entries(OPTION_FIELDS)) {
    if (data[field] && !options.isValidOption(opts, list, data[field])) throw ApiError.badRequest(`Invalid ${field}`, 'VALIDATION_ERROR');
  }
  if (data.assignedAdmin) {
    const admin = await User.findOne({ _id: data.assignedAdmin, role: { $in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' }).select('_id').lean();
    if (!admin) throw ApiError.badRequest('Admin not found', 'ADMIN_NOT_FOUND');
  }
  if (data.status && lead.booking && LEAD_OPEN_STATUS.includes(data.status)) {
    throw ApiError.conflict('A booked lead cannot be moved back to a pre-booking status', 'INVALID_STATUS');
  }

  const before = Object.fromEntries(Object.keys(data).map((k) => [k, lead[k]]));
  lead.set(data);
  lead.lastActivityAt = new Date();
  await lead.save();

  if (lead.booking && ['LOST', 'CANCELLED'].includes(data.status)) {
    await Booking.updateOne({ _id: lead.booking, status: { $ne: 'CANCELLED' } }, {
      $set: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: data.lostReason || reason },
    });
  }

  await audit(req, { action: data.status && data.status !== before.status ? 'LEAD_STATUS_CHANGED' : 'LEAD_UPDATED', entityType: 'Lead', entityId: lead._id, before, after: data, reason });
  await logActivity({ lead: lead._id, actor: req.user, type: data.status ? 'STATUS_CHANGED' : 'LEAD_UPDATED', message: data.status ? `Status → ${data.status}` : 'Lead details updated', meta: { reason } });
  ok(res, { lead: leadView(lead) }, 'Lead updated');
});

exports.assign = asyncHandler(async (req, res) => {
  const result = await assignContractor(req, { leadId: req.params.id, contractorId: req.body.contractorId, remarks: req.body.remarks });
  ok(res, { contractor: result.contractor, leadId: String(result.lead._id), bookingId: result.booking ? String(result.booking._id) : null }, 'Contractor assigned');
});

exports.remove = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.booking) throw ApiError.conflict('Leads with a booking cannot be deleted. Cancel the booking instead.', 'LEAD_HAS_BOOKING');
  await Promise.all([ActivityLog.deleteMany({ lead: lead._id }), Note.deleteMany({ lead: lead._id }), lead.deleteOne()]);
  await audit(req, { action: 'LEAD_DELETED', entityType: 'Lead', entityId: lead._id, before: { leadNumber: lead.leadNumber, name: lead.name, mobile: lead.mobile, status: lead.status }, reason: req.body?.reason });
  ok(res, {}, 'Lead deleted');
});
