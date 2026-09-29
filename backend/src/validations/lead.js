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
  estimateDraft: estimateDraft.optional(),
});

const option = (field, msg) => z.object({ [field]: z.string().trim().min(1, msg).max(60) });

const stepSchemas = {
  BASIC_INFO: z.object({ name: z.string().trim().min(2, 'Enter your full name').max(120), mobile: mobile.optional(), city: str(80).optional() }),
  REQUIREMENT: option('requirementType', 'Select what you are looking for'),
  BUDGET: option('budgetRange', 'Select your budget'),
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
  step: z.enum(Object.keys(stepSchemas)),
  data: z.record(z.any()),
});

module.exports = { createLead, stepSchemas, updateStep };
