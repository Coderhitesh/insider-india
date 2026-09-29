const { Booking, Lead, Property, Estimate, SiteVisit, Quotation, ExecutionProject } = require('../models');
const options = require('../services/optionsService');
const notifications = require('../services/notifications/notificationService');
const rbac = require('../services/rbacService');
const { logActivity } = require('../services/activityService');
const { computeNextStep } = require('../services/leadFlow');
const { nextNumber } = require('../utils/sequence');
const { bookingView } = require('../utils/serializers');
const { ok, created } = require('../utils/respond');
const { parsePagination, pageMeta } = require('../utils/pagination');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { TIMELINE, CHANNELS, ROLES } = require('../config/constants');

const tl = (event, at, extra = {}) => ({ event, label: TIMELINE[event], at, visibleToCustomer: true, ...extra });

exports.create = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.body.leadId).populate('services', 'title');
  if (!lead || String(lead.user) !== String(req.user._id)) throw ApiError.notFound('Request not found', 'LEAD_NOT_FOUND');

  if (lead.booking) {
    const existing = await Booking.findById(lead.booking).lean();
    return ok(res, { booking: bookingView(existing) }, 'Booking already created');
  }

  const nextStep = computeNextStep(lead);
  if (nextStep !== 'REVIEW') throw ApiError.unprocessable('Please complete all steps before submitting', 'INCOMPLETE_REQUEST', { nextStep });

  const opts = await options.getFunnelOptions({ activeOnly: false });
  const addr = lead.property.address.toObject ? lead.property.address.toObject() : lead.property.address;
  const labels = {
    requirementType: options.labelOf(opts, 'requirementTypes', lead.requirementType),
    budgetRange: options.labelOf(opts, 'budgetRanges', lead.budgetRange),
    possession: options.labelOf(opts, 'possessionOptions', lead.possession),
    propertyType: options.labelOf(opts, 'propertyTypes', lead.property.propertyType),
    bhk: options.labelOf(opts, 'bhkOptions', lead.property.bhk),
    projectType: options.labelOf(opts, 'projectTypes', lead.projectType),
  };

  const estimate = lead.estimate ? await Estimate.findById(lead.estimate).select('selectedPackage').lean() : null;
  const now = new Date();

  const property = await Property.create({
    owner: req.user._id,
    category: lead.propertyCategory,
    address: addr,
    propertyType: lead.property.propertyType,
    bhk: lead.property.bhk,
    area: lead.property.area,
  });

  let booking;
  try {
    booking = await Booking.create({
      bookingNumber: await nextNumber('BK'),
      lead: lead._id,
      customer: req.user._id,
      property: property._id,
      snapshot: {
        name: lead.name,
        mobile: lead.mobile,
        address: addr,
        requirementType: lead.requirementType,
        budgetRange: lead.budgetRange,
        possession: lead.possession,
        propertyType: lead.property.propertyType,
        bhk: lead.property.bhk,
        projectType: lead.projectType,
        services: lead.services.map((s) => ({ service: s._id, title: s.title })),
        labels,
      },
      floorPlan: {
        hasFloorPlan: lead.floorPlan.hasFloorPlan,
        media: lead.floorPlan.media,
        measurementAssistance: { opted: lead.floorPlan.measurementAssistance?.opted, charge: lead.floorPlan.measurementAssistance?.charge || 0 },
      },
      estimate: lead.estimate,
      package: estimate?.selectedPackage,
      timeline: [
        tl('REQUIREMENT_SUBMITTED', lead.createdAt),
        tl('MOBILE_VERIFIED', lead.verifiedAt || now),
        tl('BOOKING_CONFIRMED', now),
      ],
    });
  } catch (err) {
    if (err.code === 11000) {
      await Property.deleteOne({ _id: property._id });
      const existing = await Booking.findOne({ lead: lead._id }).lean();
      return ok(res, { booking: bookingView(existing) }, 'Booking already created');
    }
    throw err;
  }

  lead.booking = booking._id;
  lead.status = 'BOOKED';
  lead.bookedAt = now;
  lead.currentStep = 'SUBMITTED';
  lead.lastActivityAt = now;
  await lead.save();

  await logActivity({ lead: lead._id, booking: booking._id, actor: req.user, type: 'BOOKING_CREATED', message: `Booking ${booking.bookingNumber} created`, visibleToCustomer: true });

  const link = `${env.frontendUrl}/account/bookings/${booking._id}`;
  notifications.send({
    user: req.user,
    event: 'BOOKING_CREATED',
    channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
    variables: { bookingNumber: booking.bookingNumber, link },
    link: `/account/bookings/${booking._id}`,
    data: { bookingId: String(booking._id) },
  });
  notifications.notifyStaff({
    event: 'NEW_BOOKING_STAFF',
    variables: { bookingNumber: booking.bookingNumber, customerName: lead.name, city: addr.city || lead.city || '' },
    link: `/admin/bookings/${booking._id}`,
    data: { bookingId: String(booking._id) },
  });

  created(res, { booking: bookingView(booking.toObject()) }, 'Your interior consultation request has been received');
});

exports.mine = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  const filter = { customer: req.user._id };
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('assignedContractor', 'name').lean(),
    Booking.countDocuments(filter),
  ]);
  ok(res, { items: items.map((b) => bookingView(b)) }, 'OK', 200, pageMeta(pg, total));
});

exports.get = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('assignedContractor', 'name').lean();
  if (!booking) throw ApiError.notFound('Booking not found');

  const isOwner = String(booking.customer) === String(req.user._id);
  if (!isOwner) {
    const perms = await rbac.getEffectivePermissions(req.user);
    const isAssigned = req.user.role === ROLES.CONTRACTOR && String(booking.assignedContractor?._id) === String(req.user._id);
    const canView = rbac.hasPermission(perms, 'bookings.view') && (req.user.role !== ROLES.CONTRACTOR || isAssigned);
    if (!canView) throw ApiError.notFound('Booking not found');
  }
  if (!isOwner) return ok(res, { booking: bookingView(booking, { customer: false }) });

  // Customer dashboard context: next/last site visit, released quotations, execution project.
  const [visit, quotations, project] = await Promise.all([
    SiteVisit.findOne({ booking: booking._id, status: { $in: ['SCHEDULED', 'COMPLETED'] } }).sort({ scheduledAt: -1 })
      .select('scheduledAt status contactPerson completedAt').populate('contractor', 'name').lean(),
    Quotation.find({ booking: booking._id, sentAt: { $ne: null } }).sort({ version: -1 }).select('displayNumber version isLatest status totals.grandTotal sentAt viewedAt').lean(),
    ExecutionProject.findOne({ booking: booking._id }).select('projectNumber stage startedAt').lean(),
  ]);
  return ok(res, {
    booking: bookingView(booking, { customer: true }),
    siteVisit: visit ? { scheduledAt: visit.scheduledAt, status: visit.status, completedAt: visit.completedAt, expert: visit.contractor?.name } : null,
    quotations: quotations.map((q) => ({ id: String(q._id), displayNumber: q.displayNumber, version: q.version, isLatest: q.isLatest, status: q.status, grandTotal: q.totals.grandTotal, sentAt: q.sentAt, viewedAt: q.viewedAt })),
    project: project ? { id: String(project._id), projectNumber: project.projectNumber, stage: project.stage, startedAt: project.startedAt } : null,
  });
});
