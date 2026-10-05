const { Lead, Service, Media, User } = require('../models');
const { loadLeadForAccess } = require('../services/leadAccess');
const options = require('../services/optionsService');
const geo = require('../services/geoService');
const { logActivity } = require('../services/activityService');
const { stepSchemas } = require('../validations/lead');
const { nextNumber } = require('../utils/sequence');
const { normalizeMobile } = require('../utils/phone');
const { hmac, randomToken } = require('../utils/crypto');
const { leadView } = require('../utils/serializers');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { PRE_OTP_STEPS, LEAD_OPEN_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

const withServices = (lead) => lead.populate([
  { path: 'services', select: 'title slug' },
  { path: 'floorPlan.media', select: 'originalName mimeType size' },
]);

const invalidOption = (field, label) => new ApiError(422, `Please choose a valid ${label}`, 'VALIDATION_ERROR', [{ field, message: 'Invalid option' }]);

async function assertOption(list, field, value, label) {
  const opts = await options.getFunnelOptions();
  if (!options.isValidOption(opts, list, value)) throw invalidOption(field, label);
}

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const mobile = normalizeMobile(req.user?.mobile || b.mobile);
  if (!mobile) throw new ApiError(422, 'Enter a valid 10-digit Indian mobile number', 'VALIDATION_ERROR', [{ field: 'mobile', message: 'Invalid mobile number' }]);

  // Logged-in user without a name yet (OTP-only signup): keep the name they just typed.
  if (req.user && !req.user.name && b.name) await User.updateOne({ _id: req.user._id, $or: [{ name: null }, { name: '' }] }, { $set: { name: b.name } });

  // Logged-in user: continue their open lead for this flow instead of duplicating.
  if (req.user) {
    const existing = await Lead.findOne({ user: req.user._id, flow: b.flow, status: { $in: LEAD_OPEN_STATUS }, booking: null }).sort({ lastActivityAt: -1 });
    if (existing) {
      existing.name = b.name || existing.name;
      if (b.city) existing.city = b.city;
      if (b.estimateDraft) existing.estimateDraft = b.estimateDraft;
      existing.lastActivityAt = new Date();
      await existing.save();
      await withServices(existing);
      return ok(res, { lead: leadView(existing), leadToken: null }, 'Continuing your request');
    }
  }

  const verified = Boolean(req.user?.mobileVerified);
  const leadToken = req.user ? null : randomToken(32);
  const lead = await Lead.create({
    leadNumber: await nextNumber('LD'),
    user: req.user?._id || null,
    flow: b.flow,
    name: b.name,
    mobile,
    city: b.city,
    status: verified ? 'VERIFIED' : 'IN_PROGRESS',
    currentStep: 'BASIC_INFO',
    stepsCompleted: verified ? ['BASIC_INFO', 'OTP'] : ['BASIC_INFO'],
    verifiedAt: verified ? new Date() : undefined,
    estimateDraft: b.estimateDraft,
    utm: b.utm,
    referrer: b.referrer,
    landingPage: b.landingPage,
    resumeTokenHash: leadToken ? hmac(`lead:${leadToken}`) : undefined,
  });

  await logActivity({ lead: lead._id, actor: req.user, type: 'LEAD_CREATED', message: `Lead created via ${b.flow === 'ESTIMATE' ? 'estimate calculator' : 'booking funnel'}` });
  created(res, { lead: leadView(lead), leadToken }, 'Saved');
});

exports.get = asyncHandler(async (req, res) => {
  const lead = await loadLeadForAccess(req, req.params.id);
  await withServices(lead);
  ok(res, { lead: leadView(lead) });
});

exports.resume = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ user: req.user._id, status: { $in: LEAD_OPEN_STATUS }, booking: null }).sort({ lastActivityAt: -1 });
  if (lead) await withServices(lead);
  ok(res, { lead: lead ? leadView(lead) : null });
});

const applyStep = {
  async BASIC_INFO(lead, d) {
    lead.name = d.name;
    if (d.city !== undefined) lead.city = d.city;
    if (d.mobile) {
      const m = normalizeMobile(d.mobile);
      if (!m) throw invalidOption('mobile', 'mobile number');
      if (m !== lead.mobile) {
        if (lead.user) throw ApiError.badRequest('Verified mobile number cannot be changed here', 'MOBILE_LOCKED');
        lead.mobile = m;
        if (lead.status === 'OTP_PENDING') lead.status = 'IN_PROGRESS';
      }
    }
  },
  async REQUIREMENT(lead, d) { await assertOption('requirementTypes', 'requirementType', d.requirementType, 'requirement'); lead.requirementType = d.requirementType; },
  async BUDGET(lead, d) { await assertOption('budgetRanges', 'budgetRange', d.budgetRange, 'budget'); lead.budgetRange = d.budgetRange; },
  async POSSESSION(lead, d) { await assertOption('possessionOptions', 'possession', d.possession, 'possession timeline'); lead.possession = d.possession; },
  async LOCATION(lead, d) {
    let addr = {
      formattedAddress: d.formattedAddress, placeId: d.placeId, lat: d.lat, lng: d.lng,
      city: d.city, state: d.state, country: d.country || 'India', pincode: d.pincode,
    };
    // Re-resolve the place server-side so stored coordinates/components are trustworthy.
    if (d.placeId && geo.isEnabled()) {
      try {
        const place = await geo.placeDetails(d.placeId, d.sessionToken);
        addr = { ...addr, ...place, pincode: d.pincode || place.pincode };
      } catch (err) {
        logger.warn('Place re-resolve failed; using submitted address', { error: err.message });
      }
    }
    lead.set('property.address', addr);
    if (!lead.city && addr.city) lead.city = addr.city;
  },
  async PROPERTY_TYPE(lead, d) { await assertOption('propertyTypes', 'propertyType', d.propertyType, 'home type'); lead.set('property.propertyType', d.propertyType); },
  async BHK(lead, d) { await assertOption('bhkOptions', 'bhk', d.bhk, 'configuration'); lead.set('property.bhk', d.bhk); },
  async PROJECT_TYPE(lead, d) { await assertOption('projectTypes', 'projectType', d.projectType, 'project type'); lead.projectType = d.projectType; },
  async SERVICES(lead, d) {
    const ids = [...new Set(d.services)];
    const found = await Service.find({ _id: { $in: ids }, isActive: true, showInBooking: true }).select('_id').lean();
    if (found.length !== ids.length) throw invalidOption('services', 'service');
    lead.services = ids;
  },
  async FLOOR_PLAN(lead, d, user) {
    const pricing = await options.getPricingConfig();
    if (d.hasFloorPlan) {
      const ids = [...new Set(d.mediaIds)];
      const media = await Media.find({ _id: { $in: ids }, owner: user._id, purpose: 'FLOOR_PLAN', deletedAt: null }).select('_id').lean();
      if (media.length !== ids.length) throw new ApiError(422, 'Please re-upload your floor plan', 'VALIDATION_ERROR', [{ field: 'mediaIds', message: 'File not found' }]);
      lead.set('floorPlan', { hasFloorPlan: true, media: ids, measurementAssistance: { opted: false, charge: 0 } });
    } else {
      lead.set('floorPlan', {
        hasFloorPlan: false,
        media: [],
        measurementAssistance: {
          opted: d.measurementAssistance,
          charge: d.measurementAssistance ? Number(pricing.floorPlanAssistanceCharge) || 0 : 0,
          confirmedAt: new Date(),
        },
      });
    }
  },
};

exports.updateStep = asyncHandler(async (req, res) => {
  const { step, data } = req.body;
  const lead = await loadLeadForAccess(req, req.params.id);

  if (lead.booking || !LEAD_OPEN_STATUS.includes(lead.status)) {
    throw ApiError.conflict('This request has already been submitted', 'LEAD_CLOSED', { bookingId: lead.booking ? String(lead.booking) : null });
  }
  if (!PRE_OTP_STEPS.includes(step) && !(lead.user && lead.verifiedAt && req.user)) {
    throw ApiError.forbidden('Please verify your mobile number to continue', 'OTP_REQUIRED');
  }

  const parsed = stepSchemas[step].safeParse(data || {});
  if (!parsed.success) throw ApiError.validation(parsed.error);

  await applyStep[step](lead, parsed.data, req.user);
  lead.currentStep = step;
  lead.stepsCompleted = [...new Set([...(lead.stepsCompleted || []), step])];
  lead.lastActivityAt = new Date();
  if (lead.status === 'NEW') lead.status = 'IN_PROGRESS';
  if (lead.status === 'VERIFIED' && step === 'FLOOR_PLAN') lead.status = 'QUALIFIED';
  await lead.save();

  const type = step === 'FLOOR_PLAN' && parsed.data.hasFloorPlan ? 'FLOOR_PLAN_UPLOADED' : 'REQUIREMENT_UPDATED';
  await logActivity({ lead: lead._id, actor: req.user, type, message: `Step ${step} saved`, meta: { step } });

  await withServices(lead);
  ok(res, { lead: leadView(lead) }, 'Saved');
});
