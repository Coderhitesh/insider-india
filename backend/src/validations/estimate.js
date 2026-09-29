const { z, objectId } = require('./common');

const base = z.object({
  propertyCategory: z.enum(['RESIDENTIAL', 'COMMERCIAL']),
  bhk: z.string().trim().max(20).optional(),
  area: z.coerce.number().positive('Enter a valid area').max(1000000).optional(),
  kitchens: z.coerce.number().int().min(0).max(10).default(1),
  bedrooms: z.coerce.number().int().min(0).max(20).default(0),
  washrooms: z.coerce.number().int().min(0).max(20).default(0),
  addons: z.array(z.string().trim().max(60)).max(30).default([]),
});

const refine = (v, ctx) => {
  if (v.propertyCategory === 'RESIDENTIAL' && !v.bhk) ctx.addIssue({ code: 'custom', path: ['bhk'], message: 'Select property size' });
  if ((v.propertyCategory === 'COMMERCIAL' || v.bhk === 'CUSTOM') && !v.area) ctx.addIssue({ code: 'custom', path: ['area'], message: 'Enter the area in sq ft' });
};

const estimateInput = base.superRefine(refine);
const estimateDraft = base.partial();
const createEstimate = base.extend({ leadId: objectId.optional(), packageId: objectId.optional() }).superRefine(refine);
const selectPackage = z.object({ packageId: objectId });

module.exports = { estimateInput, estimateDraft, createEstimate, selectPackage };
