const { z, objectId, mobile } = require('./common');
const { MEASUREMENT_UNITS, ROOM_TYPES, SITE_CONDITIONS, PROJECT_STAGES } = require('../config/constants');

const str = (max = 200) => z.string().trim().max(max);
const ids = z.array(objectId).max(60).default([]);
const futureDate = z.coerce.date().refine((d) => d.getTime() > Date.now() - 5 * 60000, 'Choose a future date and time');
const nonNeg = z.coerce.number().min(0).max(1e9);
const optNum = z.coerce.number().min(0).max(1e7).optional().nullable();

const address = z.object({
  formattedAddress: str(500).optional(), city: str(100).optional(), state: str(100).optional(),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/).optional(), lat: z.number().optional(), lng: z.number().optional(),
}).partial();

const scheduleVisit = z.object({
  bookingId: objectId,
  scheduledAt: futureDate,
  contactPerson: z.object({ name: str(120).optional(), mobile: mobile.optional() }).default({}),
  siteAddress: address.optional(),
  notes: str(3000).optional(),
});
const updateVisit = z.object({
  scheduledAt: futureDate.optional(),
  contactPerson: z.object({ name: str(120).optional(), mobile: mobile.optional() }).optional(),
  siteAddress: address.optional(),
  notes: str(3000).optional(),
  images: ids.optional(), videos: ids.optional(), floorPlans: ids.optional(), documents: ids.optional(),
  reason: str(500).optional(),
});
const completeVisit = z.object({
  siteCondition: z.enum(SITE_CONDITIONS),
  siteConditionNotes: str(2000).optional(),
  notes: str(5000).optional(),
  images: ids, videos: ids, floorPlans: ids, documents: ids,
});
const cancelVisit = z.object({ reason: str(500).min(3, 'Provide a reason') });

const row = z.object({
  _id: objectId.optional(),
  label: str(200).min(1, 'Label required'),
  width: optNum, height: optNum, length: optNum, area: optNum,
  quantity: z.coerce.number().min(0).max(100000).default(1),
  unit: z.enum(MEASUREMENT_UNITS),
  notes: str(1000).optional(),
});
const saveMeasurement = z.object({
  siteVisitId: objectId.optional(),
  notes: str(5000).optional(),
  rooms: z.array(z.object({
    _id: objectId.optional(),
    name: str(120).min(1, 'Room name required'),
    type: z.enum(ROOM_TYPES).default('CUSTOM'),
    notes: str(2000).optional(),
    rows: z.array(row).max(200).default([]),
  })).max(60),
});

const item = z.object({
  _id: objectId.optional(),
  name: str(200).min(1, 'Item name required'),
  category: str(80).optional(),
  description: str(2000).optional(),
  material: str(200).optional(),
  finish: str(200).optional(),
  dimensions: str(120).optional(),
  length: optNum, width: optNum, height: optNum,
  quantity: z.coerce.number().min(0).max(1e6),
  unit: z.enum(MEASUREMENT_UNITS).default('PCS'),
  unitPrice: nonNeg.default(0),
  materialPrice: nonNeg.default(0),
  labourPrice: nonNeg.default(0),
  taxPercent: z.coerce.number().min(0).max(28).nullable().optional(),
  notes: str(1000).optional(),
  image: objectId.nullable().optional(),
  referenceImage: objectId.nullable().optional(),
  customFields: z.array(z.object({ label: str(60).min(1), value: str(300) })).max(15).default([]),
});
const section = z.object({
  _id: objectId.optional(),
  title: str(120).min(1, 'Section title required'),
  category: str(80).optional(),
  notes: str(2000).optional(),
  items: z.array(item).max(200).default([]),
});
const quotationBody = z.object({
  sections: z.array(section).max(60).optional(),
  additionalCharges: z.array(z.object({ label: str(120).min(1), amount: nonNeg, taxable: z.boolean().default(true) })).max(20).optional(),
  discounts: z.array(z.object({
    type: z.enum(['ADMIN', 'PROMOTIONAL']), mode: z.enum(['PERCENT', 'FLAT']), value: nonNeg, label: str(120).optional(), reason: str(500).optional(),
  })).max(10).optional(),
  waiveMeasurementCharge: z.boolean().optional(),
  gstPercent: z.coerce.number().min(0).max(28).optional(),
  paymentSchedule: z.array(z.object({ label: str(120).min(1), percent: z.coerce.number().min(0).max(100) })).max(12).optional(),
  validUntil: z.coerce.date().nullable().optional(),
  contractorNotes: str(5000).optional(),
  adminNotes: str(5000).optional(),
  customerNotes: str(5000).optional(),
  reason: str(500).optional(),
});
const createQuotation = quotationBody.extend({ bookingId: objectId });
const noteOnly = z.object({ note: str(2000).optional() });
const requiredNote = z.object({ note: str(2000).min(3, 'Please add a short note') });
const accept = z.object({ note: str(2000).optional(), acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms' }) }) });
const approve = z.object({ send: z.boolean().default(false), note: str(2000).optional() });
const revise = z.object({ returnToContractor: z.boolean().default(false), note: str(2000).optional() });

const projectUpdate = z.object({
  projectManager: objectId.nullable().optional(),
  milestones: z.array(z.object({ _id: objectId.optional(), title: str(200).min(1), dueDate: z.coerce.date().nullable().optional(), status: z.enum(['PENDING', 'DONE']).default('PENDING') })).max(50).optional(),
  paymentSchedule: z.array(z.object({ _id: objectId.optional(), label: str(120).min(1), percent: z.coerce.number().min(0).max(100).optional(), amount: nonNeg, dueOn: z.coerce.date().nullable().optional(), status: z.enum(['PENDING', 'PAID']).default('PENDING'), reference: str(120).optional() })).max(20).optional(),
  documents: z.array(z.object({ media: objectId, title: str(200).optional(), visibleToCustomer: z.boolean().default(true) })).max(100).optional(),
  reason: str(500).optional(),
});
const projectStage = z.object({ stage: z.enum(PROJECT_STAGES), note: str(1000).optional() });
const projectPost = z.object({ text: str(3000).min(1), media: ids, visibleToCustomer: z.boolean().default(true) });

module.exports = {
  scheduleVisit, updateVisit, completeVisit, cancelVisit, saveMeasurement,
  createQuotation, quotationBody, noteOnly, requiredNote, accept, approve, revise,
  projectUpdate, projectStage, projectPost,
};
