const { Quotation, Booking, SiteVisit, Measurement, Media, Package, User } = require('../models');
const { signedList } = require('../services/mediaService');
const svc = require('../services/quotationService');
const rbac = require('../services/rbacService');
const options = require('../services/optionsService');
const StorageService = require('../services/storage/StorageService');
const notifications = require('../services/notifications/notificationService');
const { advance } = require('../services/bookingSync');
const { assertAssigned, isContractor } = require('../services/scopeService');
const { audit } = require('../services/auditService');
const { logActivity } = require('../services/activityService');
const { nextNumber } = require('../utils/sequence');
const { formatINR } = require('../utils/money');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const env = require('../config/env');
const settings = require('../services/settingsService');
const { OPERATIONS_CONFIG } = require('../config/defaults');
const { ROLES, CHANNELS } = require('../config/constants');

const isCustomer = (u) => u.role === ROLES.CUSTOMER;
const perms = (req) => rbac.getEffectivePermissions(req.user);
const has = (set, k) => rbac.hasPermission(set, k);

async function ctx(req) {
  const p = await perms(req);
  return { p, isAdmin: !isContractor(req.user) && has(p, 'quotations.review'), canDiscount: !isContractor(req.user) && has(p, 'quotations.discount') };
}

async function need(req, key) {
  const p = await perms(req);
  if (!has(p, key)) throw ApiError.forbidden();
  return p;
}

async function loadStaff(req, id = req.params.id) {
  const q = await Quotation.findById(id);
  if (!q) throw ApiError.notFound('Quotation not found');
  if (isContractor(req.user) && String(q.contractor) !== String(req.user._id)) throw ApiError.notFound('Quotation not found');
  return q;
}

function requireLatest(q) {
  if (!q.isLatest) throw ApiError.conflict('This is an older version. Open the latest version to continue.', 'NOT_LATEST');
}

async function assertMeasured(bookingId) {
  const [visit, m] = await Promise.all([
    SiteVisit.exists({ booking: bookingId, status: 'COMPLETED' }),
    Measurement.findOne({ booking: bookingId }).select('_id status').lean(),
  ]);
  if (!visit) throw ApiError.unprocessable('A completed site visit is required before a quotation', 'SITE_VISIT_REQUIRED');
  if (!m || m.status !== 'FINAL') throw ApiError.unprocessable('Final site measurements are required before a quotation', 'MEASUREMENTS_REQUIRED');
  return m;
}

// ─────────────────────────── staff ───────────────────────────

exports.create = asyncHandler(async (req, res) => {
  await need(req, 'quotations.create');
  const booking = await Booking.findById(req.body.bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  assertAssigned(req.user, booking);
  if (!booking.assignedContractor) throw ApiError.conflict('Assign a contractor first', 'NO_CONTRACTOR');
  if (booking.status === 'CANCELLED') throw ApiError.conflict('Booking is cancelled', 'BOOKING_CANCELLED');
  const measurement = await assertMeasured(booking._id);

  const existing = await Quotation.findOne({ booking: booking._id, isLatest: true }).select('_id displayNumber status').lean();
  if (existing) throw ApiError.conflict(`Quotation ${existing.displayNumber} already exists for this booking`, 'QUOTATION_EXISTS', { id: String(existing._id), status: existing.status });

  const pricing = await options.getPricingConfig();
  const ops = { ...OPERATIONS_CONFIG, ...((await settings.get('operations.config', {})) || {}) };
  const quotationNumber = await nextNumber('QT');
  const ma = booking.floorPlan?.measurementAssistance;
  const q = new Quotation({
    quotationNumber, version: 1, displayNumber: `${quotationNumber}-V1`,
    booking: booking._id, lead: booking.lead, customer: booking.customer, contractor: booking.assignedContractor,
    measurement: measurement._id, package: booking.package, gstPercent: pricing.defaultGstPercent,
    paymentSchedule: (ops.paymentSchedule || []).map((p) => ({ label: p.label, percent: p.percent })),
    additionalCharges: ma?.opted && ma.charge > 0 ? [{ label: 'Expert Measurement Assistance', amount: ma.charge, taxable: true, system: 'MEASUREMENT_ASSISTANCE' }] : [],
    createdBy: req.user._id,
  });
  const c = await ctx(req);
  await svc.applyEdits(q, req.body, { user: req.user, ...c });
  svc.compute(q);
  await q.save();

  await advance(booking, { status: 'QUOTATION_IN_PROGRESS', event: 'QUOTATION_DRAFTED', visible: false, by: req.user._id, leadStatus: 'QUOTATION_DRAFT' });
  await audit(req, { action: 'QUOTATION_CREATED', entityType: 'Quotation', entityId: q._id, after: { displayNumber: q.displayNumber, grandTotal: q.totals.grandTotal } });
  await logActivity({ lead: q.lead, booking: q.booking, quotation: q._id, actor: req.user, type: 'QUOTATION_CREATED', message: `${q.displayNumber} created` });
  created(res, { quotation: svc.staffView(q, { contractor: isContractor(req.user) }) }, 'Quotation created');
});

exports.update = asyncHandler(async (req, res) => {
  const q = await loadStaff(req);
  requireLatest(q);
  const c = await ctx(req);
  const contractorEdit = isContractor(req.user);

  if (contractorEdit) {
    if (!has(c.p, 'quotations.edit')) throw ApiError.forbidden();
    if (q.status !== 'DRAFT') throw ApiError.conflict('Submitted quotations can only be edited by an admin', 'QUOTATION_LOCKED');
  } else {
    if (!c.isAdmin && !has(c.p, 'quotations.edit')) throw ApiError.forbidden();
    if (!['DRAFT', 'UNDER_ADMIN_REVIEW', 'APPROVED'].includes(q.status)) throw ApiError.conflict('This version is locked. Create a revision to make changes.', 'QUOTATION_LOCKED');
  }

  const beforeItems = svc.snapshotItems(q);
  const beforeTotal = q.totals?.grandTotal || 0;
  const extra = await svc.applyEdits(q, req.body, { user: req.user, ...c });
  svc.compute(q);

  // Admin price edits after contractor submission are tracked item-by-item and require a reason.
  const tracked = !contractorEdit && q.submittedAt;
  const changes = tracked ? [...svc.diffItems(beforeItems, q), ...extra] : [];
  if (changes.length && !req.body.reason) throw new ApiError(422, 'Please give a reason for the price change', 'VALIDATION_ERROR', [{ field: 'reason', message: 'Reason required' }]);
  if (changes.length) q.priceChanges.push(...changes.map((ch) => ({ ...ch, reason: req.body.reason, by: req.user._id, at: new Date() })));

  let reopened = false;
  if (q.status === 'APPROVED' && !contractorEdit) {
    q.status = 'UNDER_ADMIN_REVIEW';
    q.approvedAt = undefined;
    q.approvedBy = undefined;
    reopened = true;
  }
  if (!contractorEdit && q.status === 'UNDER_ADMIN_REVIEW') { q.reviewedBy = req.user._id; q.reviewedAt = new Date(); }
  await q.save();

  if (changes.length) {
    await audit(req, {
      action: 'QUOTATION_PRICE_CHANGED', entityType: 'Quotation', entityId: q._id,
      before: { grandTotal: beforeTotal, contractorGrandTotal: q.contractorGrandTotal }, after: { grandTotal: q.totals.grandTotal },
      reason: req.body.reason, meta: { changes: changes.length, displayNumber: q.displayNumber },
    });
    const discountTouched = changes.some((ch) => ['DISCOUNTS', 'MEASUREMENT_CHARGE_WAIVED'].includes(ch.field));
    await logActivity({ lead: q.lead, booking: q.booking, quotation: q._id, actor: req.user, type: discountTouched ? 'DISCOUNT_APPLIED' : 'QUOTATION_EDITED', message: `${formatINR(beforeTotal, { decimals: false })} → ${formatINR(q.totals.grandTotal, { decimals: false })}: ${req.body.reason}` });
  }
  ok(res, { quotation: svc.staffView(q, { contractor: contractorEdit }), reopened }, reopened ? 'Saved. Approval was cleared because the quotation changed.' : 'Quotation saved');
});

exports.submit = asyncHandler(async (req, res) => {
  const q = await loadStaff(req);
  requireLatest(q);
  await need(req, 'quotations.edit');
  if (q.status !== 'DRAFT') throw ApiError.conflict('Only drafts can be submitted', 'INVALID_STATUS');
  const items = q.sections.flatMap((s) => s.items);
  if (!items.length || !(q.totals?.subtotal > 0)) throw ApiError.unprocessable('Add at least one priced item before submitting', 'QUOTATION_EMPTY');
  if (q.sections.some((s) => !s.items.length)) throw ApiError.unprocessable('Remove empty sections before submitting', 'EMPTY_SECTION');
  await assertMeasured(q.booking);

  Object.assign(q, { status: 'UNDER_ADMIN_REVIEW', submittedAt: new Date(), contractorGrandTotal: q.totals.grandTotal });
  if (req.body?.note) q.contractorNotes = [q.contractorNotes, req.body.note].filter(Boolean).join('\n\n');
  await q.save();

  const booking = await Booking.findById(q.booking);
  await advance(booking, { event: 'QUOTATION_UNDER_REVIEW', visible: false, by: req.user._id, leadStatus: 'QUOTATION_REVIEW' });
  await logActivity({ lead: q.lead, booking: q.booking, quotation: q._id, actor: req.user, type: 'QUOTATION_SUBMITTED', message: `${q.displayNumber} submitted for review (${formatINR(q.totals.grandTotal, { decimals: false })})` });
  notifications.notifyStaff({
    event: 'QUOTATION_SUBMITTED',
    variables: { quotationNumber: q.displayNumber, bookingNumber: booking.bookingNumber, contractorName: req.user.name, amount: formatINR(q.totals.grandTotal, { decimals: false }) },
    link: `/admin/quotations/${q._id}`,
  });
  ok(res, { quotation: svc.staffView(q, { contractor: isContractor(req.user) }) }, 'Submitted for admin review');
});

exports.returnToContractor = asyncHandler(async (req, res) => {
  await need(req, 'quotations.review');
  const q = await loadStaff(req);
  requireLatest(q);
  if (!['UNDER_ADMIN_REVIEW', 'APPROVED'].includes(q.status)) throw ApiError.conflict('Only quotations under review can be returned', 'INVALID_STATUS');
  Object.assign(q, { status: 'DRAFT', approvedAt: undefined, approvedBy: undefined });
  q.adminNotes = [q.adminNotes, `Returned ${new Date().toISOString().slice(0, 10)}: ${req.body.note}`].filter(Boolean).join('\n\n');
  await q.save();
  await audit(req, { action: 'QUOTATION_RETURNED', entityType: 'Quotation', entityId: q._id, reason: req.body.note });
  await logActivity({ lead: q.lead, booking: q.booking, quotation: q._id, actor: req.user, type: 'QUOTATION_RETURNED', message: `Returned to contractor: ${req.body.note}` });
  if (q.contractor) {
    notifications.send({ user: q.contractor, event: 'QUOTATION_RETURNED', channels: [CHANNELS.IN_APP], variables: { quotationNumber: q.displayNumber, note: req.body.note }, link: `/admin/quotations/${q._id}` });
  }
  ok(res, { quotation: svc.staffView(q) }, 'Returned to contractor');
});

async function sendQuotation(req, q) {
  if (q.status !== 'APPROVED') throw ApiError.conflict('Only approved quotations can be sent', 'INVALID_STATUS');
  if (!q.validUntil) q.validUntil = await svc.defaultValidity();

  let media;
  try {
    media = await svc.storePdf(q, req.user);
  } catch (err) {
    logger.error('Quotation PDF generation/upload failed', { quotation: String(q._id), error: err.message });
    throw new ApiError(502, 'Could not generate or store the quotation PDF. Nothing was sent — please retry.', 'PDF_FAILED');
  }

  const now = new Date();
  const r = await Quotation.updateOne(
    { _id: q._id, status: 'APPROVED' },
    { $set: { status: 'SENT_TO_CUSTOMER', sentAt: now, sentBy: req.user._id, pdf: media._id, pdfGeneratedAt: now, validUntil: q.validUntil } },
  );
  if (!r.modifiedCount) {
    await StorageService.delete(media).catch(() => {});
    await Media.updateOne({ _id: media._id }, { $set: { deletedAt: now } });
    throw ApiError.conflict('Quotation was changed by someone else. Refresh and try again.', 'CONCURRENT_UPDATE');
  }
  Object.assign(q, { status: 'SENT_TO_CUSTOMER', sentAt: now, sentBy: req.user._id, pdf: media._id, pdfGeneratedAt: now });

  const booking = await Booking.findById(q.booking);
  const revised = q.version > 1;
  await advance(booking, { status: 'QUOTATION_SENT', force: true, event: revised ? 'QUOTATION_REVISED' : 'QUOTATION_SENT', by: req.user._id, leadStatus: 'QUOTATION_SENT', meta: { quotation: q.displayNumber } });
  await audit(req, { action: 'QUOTATION_SENT', entityType: 'Quotation', entityId: q._id, after: { displayNumber: q.displayNumber, grandTotal: q.totals.grandTotal } });
  await logActivity({ lead: q.lead, booking: q.booking, quotation: q._id, actor: req.user, type: 'QUOTATION_SENT', message: `${q.displayNumber} sent to customer`, visibleToCustomer: true });

  notifications.send({
    user: q.customer,
    event: revised ? 'QUOTATION_REVISED' : 'QUOTATION_READY',
    channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP, CHANNELS.EMAIL],
    variables: { quotationNumber: q.displayNumber, link: `${env.frontendUrl}/account/quotations/${q._id}` },
    link: `/account/quotations/${q._id}`,
    data: { quotationId: String(q._id) },
  });
}

exports.approve = asyncHandler(async (req, res) => {
  await need(req, 'quotations.approve');
  const q = await loadStaff(req);
  requireLatest(q);
  if (q.status !== 'UNDER_ADMIN_REVIEW') throw ApiError.conflict('Only quotations under review can be approved', 'INVALID_STATUS');
  if (!(q.totals?.grandTotal > 0)) throw ApiError.unprocessable('Quotation total must be greater than zero', 'QUOTATION_EMPTY');
  svc.compute(q); // re-validate payment schedule & totals
  Object.assign(q, { status: 'APPROVED', approvedAt: new Date(), approvedBy: req.user._id, reviewedAt: q.reviewedAt || new Date(), reviewedBy: q.reviewedBy || req.user._id });
  if (req.body.note) q.adminNotes = [q.adminNotes, req.body.note].filter(Boolean).join('\n\n');
  await q.save();
  await audit(req, {
    action: 'QUOTATION_APPROVED', entityType: 'Quotation', entityId: q._id,
    before: { contractorGrandTotal: q.contractorGrandTotal }, after: { grandTotal: q.totals.grandTotal }, meta: { priceChanges: q.priceChanges.length },
  });
  await logActivity({ lead: q.lead, booking: q.booking, quotation: q._id, actor: req.user, type: 'QUOTATION_APPROVED', message: `${q.displayNumber} approved` });

  if (req.body.send) {
    await need(req, 'quotations.send');
    await sendQuotation(req, q);
    return ok(res, { quotation: svc.staffView(q) }, 'Approved and sent to customer');
  }
  return ok(res, { quotation: svc.staffView(q) }, 'Quotation approved');
});

exports.send = asyncHandler(async (req, res) => {
  await need(req, 'quotations.send');
  const q = await loadStaff(req);
  requireLatest(q);
  await sendQuotation(req, q);
  ok(res, { quotation: svc.staffView(q) }, 'Quotation sent to customer');
});

exports.revise = asyncHandler(async (req, res) => {
  await need(req, 'quotations.review');
  const prev = await loadStaff(req);
  requireLatest(prev);
  if (!['SENT_TO_CUSTOMER', 'REJECTED', 'REVISION_REQUESTED'].includes(prev.status)) {
    throw ApiError.conflict('Only quotations already sent to the customer can be revised. Edit the current version instead.', 'INVALID_STATUS');
  }
  const now = new Date();
  const o = prev.toObject();
  const strip = (arr) => arr.map(({ _id, ...rest }) => rest);
  const next = new Quotation({
    quotationNumber: o.quotationNumber, version: o.version + 1, displayNumber: `${o.quotationNumber}-V${o.version + 1}`,
    previousVersion: prev._id, booking: o.booking, lead: o.lead, customer: o.customer, contractor: o.contractor,
    measurement: o.measurement, package: o.package,
    sections: o.sections.map(({ _id, ...s }) => ({ ...s, items: strip(s.items) })),
    discounts: strip(o.discounts), additionalCharges: strip(o.additionalCharges), gstPercent: o.gstPercent,
    paymentSchedule: o.paymentSchedule, contractorNotes: o.contractorNotes, customerNotes: o.customerNotes,
    adminNotes: [o.adminNotes, req.body.note && `Revision V${o.version + 1}: ${req.body.note}`].filter(Boolean).join('\n\n'),
    contractorGrandTotal: o.contractorGrandTotal,
    status: req.body.returnToContractor ? 'DRAFT' : 'UNDER_ADMIN_REVIEW',
    submittedAt: req.body.returnToContractor ? undefined : now,
    createdBy: req.user._id,
  });
  svc.compute(next);

  await Quotation.updateOne({ _id: prev._id }, { $set: { isLatest: false, supersededAt: now } });
  try {
    await next.save();
  } catch (err) {
    await Quotation.updateOne({ _id: prev._id }, { $set: { isLatest: true }, $unset: { supersededAt: 1 } });
    throw err;
  }

  const booking = await Booking.findById(o.booking);
  await advance(booking, { status: 'QUOTATION_IN_PROGRESS', force: true, event: 'QUOTATION_DRAFTED', visible: false, by: req.user._id, leadStatus: 'QUOTATION_DRAFT', meta: { version: next.version } });
  await audit(req, { action: 'QUOTATION_REVISION_CREATED', entityType: 'Quotation', entityId: next._id, before: { version: o.version, status: o.status }, after: { version: next.version }, reason: req.body.note });
  await logActivity({ lead: o.lead, booking: o.booking, quotation: next._id, actor: req.user, type: 'QUOTATION_REVISION_CREATED', message: `${next.displayNumber} created from V${o.version}` });
  if (req.body.returnToContractor && next.contractor) {
    notifications.send({ user: next.contractor, event: 'QUOTATION_RETURNED', channels: [CHANNELS.IN_APP], variables: { quotationNumber: next.displayNumber, note: req.body.note || 'Revision requested' }, link: `/admin/quotations/${next._id}` });
  }
  created(res, { quotation: svc.staffView(next) }, `Revision ${next.displayNumber} created`);
});

exports.versions = asyncHandler(async (req, res) => {
  await need(req, 'quotations.view');
  const booking = await Booking.findById(req.params.bookingId).select('assignedContractor').lean();
  if (!booking) throw ApiError.notFound('Booking not found');
  assertAssigned(req.user, booking);
  const items = await Quotation.find({ booking: booking._id }).sort({ version: -1 })
    .select('displayNumber version isLatest status totals.grandTotal contractorGrandTotal submittedAt approvedAt sentAt acceptedAt rejectedAt revisionRequestedAt supersededAt createdAt').lean();
  ok(res, { items: items.map((q) => ({ id: String(q._id), displayNumber: q.displayNumber, version: q.version, isLatest: q.isLatest, status: q.status, grandTotal: q.totals.grandTotal, contractorGrandTotal: q.contractorGrandTotal, submittedAt: q.submittedAt, approvedAt: q.approvedAt, sentAt: q.sentAt, acceptedAt: q.acceptedAt, rejectedAt: q.rejectedAt, revisionRequestedAt: q.revisionRequestedAt, supersededAt: q.supersededAt, createdAt: q.createdAt })) });
});

exports.previewPdf = asyncHandler(async (req, res) => {
  await need(req, 'quotations.view');
  const q = await loadStaff(req);
  const buf = await svc.buildPdf(q);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${q.displayNumber}-preview.pdf"`, 'Cache-Control': 'no-store' });
  res.send(buf);
});

// ─────────────────────────── shared ───────────────────────────

exports.get = asyncHandler(async (req, res) => {
  if (isCustomer(req.user)) {
    const q = await Quotation.findOne({ _id: req.params.id, customer: req.user._id, sentAt: { $ne: null } });
    if (!q) throw ApiError.notFound('Quotation not found');
    if (!q.viewedAt) {
      const now = new Date();
      const r = await Quotation.updateOne({ _id: q._id, viewedAt: null }, { $set: { viewedAt: now } });
      q.viewedAt = now;
      if (r.modifiedCount && q.isLatest) {
        const booking = await Booking.findById(q.booking);
        await advance(booking, { event: 'QUOTATION_VIEWED', by: req.user._id, meta: { quotation: q.displayNumber } });
        await logActivity({ lead: q.lead, booking: q.booking, quotation: q._id, actor: req.user, type: 'CUSTOMER_VIEWED', message: `Customer viewed ${q.displayNumber}` });
      }
    }
    const imageIds = q.sections.flatMap((s) => s.items.flatMap((i) => [i.image, i.referenceImage])).filter(Boolean);
    const [pkg, expert, images] = await Promise.all([
      q.package ? Package.findById(q.package).select('name warranty').lean() : null,
      q.contractor ? User.findById(q.contractor).select('name').lean() : null,
      signedList(imageIds),
    ]);
    return ok(res, { quotation: {
      ...svc.customerView(q),
      package: pkg ? { name: pkg.name, warranty: pkg.warranty } : null,
      expertName: expert?.name ? expert.name.split(' ')[0] : null,
      images: Object.fromEntries(images.map((m) => [m.id, m.url])),
    } });
  }
  await need(req, 'quotations.view');
  const q = await loadStaff(req);
  await q.populate([{ path: 'contractor', select: 'name' }, { path: 'priceChanges.by', select: 'name' }]);
  const imageIds = q.sections.flatMap((s) => s.items.flatMap((i) => [i.image, i.referenceImage])).filter(Boolean);
  const images = await signedList(imageIds);
  return ok(res, { quotation: { ...svc.staffView(q, { contractor: isContractor(req.user) }), images: Object.fromEntries(images.map((m) => [m.id, m.url])) } });
});

exports.pdf = asyncHandler(async (req, res) => {
  let q;
  if (isCustomer(req.user)) {
    q = await Quotation.findOne({ _id: req.params.id, customer: req.user._id, sentAt: { $ne: null } }).lean();
  } else {
    await need(req, 'quotations.view');
    q = (await loadStaff(req)).toObject();
  }
  if (!q) throw ApiError.notFound('Quotation not found');
  if (!q.pdf) throw ApiError.notFound('PDF is generated when the quotation is sent', 'PDF_NOT_READY');
  const media = await Media.findOne({ _id: q.pdf, deletedAt: null }).lean();
  if (!media) throw ApiError.notFound('PDF not found');
  ok(res, { url: await StorageService.getUrl(media, { expiresInSeconds: 600 }), filename: `${q.displayNumber}.pdf`, expiresIn: 600 });
});

// ─────────────────────────── customer ───────────────────────────

exports.mine = asyncHandler(async (req, res) => {
  const items = await Quotation.find({ customer: req.user._id, sentAt: { $ne: null } }).sort({ sentAt: -1 })
    .populate('booking', 'bookingNumber').lean();
  ok(res, {
    items: items.map((q) => ({
      id: String(q._id), displayNumber: q.displayNumber, version: q.version, isLatest: q.isLatest, status: q.status,
      bookingNumber: q.booking?.bookingNumber, grandTotal: q.totals.grandTotal, sentAt: q.sentAt, viewedAt: q.viewedAt, validUntil: q.validUntil,
      canRespond: q.isLatest && q.status === 'SENT_TO_CUSTOMER' && (!q.validUntil || new Date(q.validUntil) > new Date()),
    })),
  });
});

async function respond(req, { to, stamp, event, bookingStatus, leadStatus, staffEvent, activity, message }) {
  const now = new Date();
  const q = await Quotation.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id, isLatest: true, status: 'SENT_TO_CUSTOMER', $or: [{ validUntil: null }, { validUntil: { $gt: now } }] },
    { $set: { status: to, [stamp]: now, customerResponse: { note: req.body.note, at: now } } },
    { new: true },
  );
  if (!q) {
    const exists = await Quotation.findOne({ _id: req.params.id, customer: req.user._id, sentAt: { $ne: null } }).select('status isLatest validUntil').lean();
    if (!exists) throw ApiError.notFound('Quotation not found');
    if (exists.validUntil && new Date(exists.validUntil) <= now) throw ApiError.conflict('This quotation has expired. Please contact us for an updated quotation.', 'QUOTATION_EXPIRED');
    throw ApiError.conflict('This quotation can no longer be updated', 'INVALID_STATUS');
  }
  const booking = await Booking.findById(q.booking);
  await advance(booking, { status: bookingStatus, force: true, event, by: req.user._id, leadStatus, meta: { quotation: q.displayNumber, note: req.body.note } });
  await logActivity({ lead: q.lead, booking: q.booking, quotation: q._id, actor: req.user, type: activity, message: `${message}${req.body.note ? `: ${req.body.note}` : ''}`, visibleToCustomer: true });
  notifications.notifyStaff({
    event: staffEvent,
    variables: { quotationNumber: q.displayNumber, customerName: booking.snapshot?.name || req.user.name, note: req.body.note || '' },
    link: `/admin/quotations/${q._id}`,
  });
  if (q.contractor) notifications.send({ user: q.contractor, event: staffEvent, channels: [CHANNELS.IN_APP], variables: { quotationNumber: q.displayNumber, customerName: booking.snapshot?.name || '', note: req.body.note || '' } });
  return q;
}

exports.accept = asyncHandler(async (req, res) => {
  const q = await respond(req, {
    to: 'ACCEPTED', stamp: 'acceptedAt', event: 'QUOTATION_ACCEPTED', bookingStatus: 'QUOTATION_ACCEPTED', leadStatus: 'WON',
    staffEvent: 'QUOTATION_ACCEPTED', activity: 'CUSTOMER_ACCEPTED', message: 'Customer accepted the quotation',
  });
  const project = await svc.createExecutionProject(q);
  ok(res, { quotation: svc.customerView(q), projectId: String(project._id) }, 'Thank you! Your quotation has been accepted.');
});

exports.requestRevision = asyncHandler(async (req, res) => {
  const q = await respond(req, {
    to: 'REVISION_REQUESTED', stamp: 'revisionRequestedAt', event: null, bookingStatus: null, leadStatus: null,
    staffEvent: 'QUOTATION_REVISION_REQUESTED', activity: 'CUSTOMER_REQUESTED_REVISION', message: 'Customer requested a revision',
  });
  ok(res, { quotation: svc.customerView(q) }, "Revision requested. Our team will get back to you.");
});

exports.reject = asyncHandler(async (req, res) => {
  const q = await respond(req, {
    to: 'REJECTED', stamp: 'rejectedAt', event: 'QUOTATION_REJECTED', bookingStatus: 'QUOTATION_REJECTED', leadStatus: null,
    staffEvent: 'QUOTATION_REJECTED', activity: 'CUSTOMER_REJECTED', message: 'Customer rejected the quotation',
  });
  ok(res, { quotation: svc.customerView(q) }, 'Your response has been recorded');
});
