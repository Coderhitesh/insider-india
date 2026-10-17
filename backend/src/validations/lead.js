const { z, objectId, mobile } = require('./common');
const { estimateDraft } = require('./estimate');

const str = (max = 200) => z.string().trim().max(max);

const createLead = z.object({
  flow: z.enum(['BOOKING', 'ESTIMATE']).default('BOOKING'),
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  mobile,
  city: str(80).optional(),
  utm: z.object({ source: str(), medium: str(), campaign: str(), term: str(), content: str() }).partial().optional(),
  referrer: str(500).optional(),
  landingPage: str(500).optional(),
  // Refer & Earn share link code (?ref=II-XXXXXX); invalid codes are ignored, never an error.
  referralCode: z.string().trim().max(20).optional().transform((v) => (v && /^II-[A-Z0-9]{6}$/i.test(v) ? v.toUpperCase() : undefined)),
  estimateDraft: estimateDraft.optional(),
});

const option = (field, msg) => z.object({ [field]: z.string().trim().min(1, msg).max(60) });

const LEGACY_STEPS = ['BUDGET'];

const stepSchemas = {
  BASIC_INFO: z.object({ name: z.string().trim().min(2, 'Enter your full name').max(120), mobile: mobile.optional(), city: str(80).optional() }),
  REQUIREMENT: option('requirementType', 'Select what you are looking for'),
  POSSESSION: option('possession', 'Select possession timeline'),
  LOCATION: z.object({
    formattedAddress: z.string().trim().min(5, 'Enter your property address').max(500),
    placeId: str(300).optional(),
    sessionToken: str(200).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    city: str(100).optional(),
    state: str(100).optional(),
    country: str(100).optional(),
    pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode'),
  }),
  SPACE: z.object({ propertyCategory: z.enum(['RESIDENTIAL', 'COMMERCIAL'], { errorMap: () => ({ message: 'Choose home or commercial' }) }) }),
  COMMERCIAL_DETAILS: z.object({
    commercialType: z.string().trim().min(1, 'Select the type of space').max(60),
    area: z.coerce.number({ invalid_type_error: 'Enter the carpet area' }).int('Enter whole sq ft').positive('Enter the carpet area'),
  }),
  PROPERTY_TYPE: option('propertyType', 'Select your home type'),
  BHK: option('bhk', 'Select your home configuration'),
  PROJECT_TYPE: option('projectType', 'Select project type'),
  SERVICES: z.object({ services: z.array(objectId).min(1, 'Select at least one requirement').max(30) }),
  FLOOR_PLAN: z.object({
    hasFloorPlan: z.boolean(),
    mediaIds: z.array(objectId).max(5).optional(),
    measurementAssistance: z.boolean().optional(),
  }).superRefine((v, ctx) => {
    if (v.hasFloorPlan && !(v.mediaIds || []).length) ctx.addIssue({ code: 'custom', path: ['mediaIds'], message: 'Upload your floor plan' });
    if (!v.hasFloorPlan && typeof v.measurementAssistance !== 'boolean') {
      ctx.addIssue({ code: 'custom', path: ['measurementAssistance'], message: 'Please confirm measurement assistance' });
    }
  }),
};

const updateStep = z.object({
  // BUDGET was removed from the funnel; still accepted (ignored) so an older cached website never shows an error.
  step: z.enum([...Object.keys(stepSchemas), ...LEGACY_STEPS]),
  data: z.record(z.any()),
});

module.exports = { createLead, stepSchemas, updateStep, LEGACY_STEPS };
