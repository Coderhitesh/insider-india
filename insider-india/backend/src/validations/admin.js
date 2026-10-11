const { z, objectId, mobile } = require('./common');
const { LEAD_STATUS, BOOKING_STATUS, PERMISSIONS } = require('../config/constants');
const { PROJECT_CATEGORIES } = require('../models/Project');

const str = (max = 200) => z.string().trim().max(max);
const optStr = (max = 200) => str(max).optional();
const url = z.string().trim().max(1000).refine((v) => v === '' || /^https:\/\//.test(v) || v.startsWith('/'), 'Must be an https URL or site path');
const money = z.coerce.number().min(0).max(1e9);
const permissionKey = z.enum(PERMISSIONS.map((p) => p.key));
const password = z.string().min(10, 'Password must be at least 10 characters').max(200)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain letters and numbers');

// ── Leads / bookings ───────────────────────────────────────────
const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  q: optStr(100),
  status: optStr(400),
  flow: z.enum(['BOOKING', 'ESTIMATE']).optional(),
  range: z.enum(['today', '7d', '30d', 'month', 'custom', 'all']).optional(),
  from: optStr(30),
  to: optStr(30),
  city: optStr(100),
  bhk: optStr(30),
  budget: optStr(60),
  service: objectId.optional(),
  package: objectId.optional(),
  contractor: z.union([objectId, z.literal('unassigned')]).optional(),
  assignedAdmin: objectId.optional(),
  verified: z.enum(['true', 'false']).optional(),
  abandoned: z.enum(['true', 'false']).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'lastActivityAt', '-lastActivityAt', 'name', '-name']).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

const updateLead = z.object({
  status: z.enum(LEAD_STATUS).optional(),
  lostReason: optStr(500),
  assignedAdmin: objectId.nullable().optional(),
  name: str(120).min(2).optional(),
  city: optStr(80),
  requirementType: optStr(60),
  budgetRange: optStr(60),
  possession: optStr(60),
  projectType: optStr(60),
  reason: optStr(500),
}).refine((v) => v.status !== 'LOST' || v.lostReason, { message: 'Provide a reason for marking the lead lost', path: ['lostReason'] });

const assign = z.object({ contractorId: objectId, remarks: optStr(1000) });

const bookingStatus = z.object({
  status: z.enum(BOOKING_STATUS),
  note: optStr(1000),
}).refine((v) => v.status !== 'CANCELLED' || v.note, { message: 'Provide a cancellation reason', path: ['note'] });

const note = z.object({
  text: z.string().trim().min(1, 'Note cannot be empty').max(5000),
  visibility: z.enum(['STAFF', 'ADMIN_ONLY']).default('STAFF'),
  attachments: z.array(objectId).max(10).default([]),
});

// ── Customers ──────────────────────────────────────────────────
const updateCustomer = z.object({
  name: str(120).min(2).optional(),
  email: z.string().trim().toLowerCase().email().max(200).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  city: optStr(80),
  marketingConsent: z.boolean().optional(),
});

// ── Contractors / staff ────────────────────────────────────────
const address = z.object({
  formattedAddress: optStr(500), city: optStr(100), state: optStr(100), country: optStr(100),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Invalid pincode').optional().or(z.literal('')),
}).partial();

const contractorBase = {
  name: str(120).min(2, 'Enter contractor name'),
  mobile,
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal('')),
  password: password.optional(),
  photo: objectId.nullable().optional(),
  contractorCode: optStr(40),
  address: address.optional(),
  city: optStr(100),
  serviceAreas: z.array(str(100)).max(50).default([]),
  specializations: z.array(str(100)).max(50).default([]),
  experienceYears: z.coerce.number().min(0).max(80).optional(),
  notes: optStr(2000),
  isActive: z.boolean().default(true),
  loginEnabled: z.boolean().default(true),
  customPermissions: z.boolean().default(false),
  permissions: z.array(permissionKey).max(PERMISSIONS.length).default([]),
};
const createContractor = z.object(contractorBase);
const updateContractor = z.object(contractorBase).partial().extend({ reason: optStr(500) });

const createStaff = z.object({
  name: str(120).min(2),
  email: z.string().trim().toLowerCase().email().max(200),
  mobile: mobile.optional(),
  role: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,40}$/),
  password,
  permissions: z.array(permissionKey).default([]),
});
const updateStaff = z.object({
  name: str(120).min(2).optional(),
  mobile: mobile.nullable().optional(),
  role: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,40}$/).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  loginEnabled: z.boolean().optional(),
  permissions: z.array(permissionKey).optional(),
  reason: optStr(500),
});
const resetPassword = z.object({ password });

const createRole = z.object({
  key: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,40}$/, 'Use UPPER_SNAKE_CASE'),
  name: str(80).min(2),
  description: optStr(300),
  permissions: z.array(permissionKey).default([]),
});
const updateRole = z.object({ name: str(80).min(2).optional(), description: optStr(300), permissions: z.array(permissionKey).optional(), reason: optStr(500) });

// ── Catalogue ──────────────────────────────────────────────────
const pricingRow = z.object({ bhk: str(30).min(1), min: money, max: money }).refine((p) => p.min <= p.max, { message: 'Min cannot exceed max', path: ['max'] });
const packageBase = z.object({
  name: str(80).min(2),
  slug: optStr(80),
  headline: optStr(300),
  description: optStr(2000),
  features: z.array(str(200)).max(40).default([]),
  warranty: z.object({ years: z.coerce.number().int().min(0).max(50).optional(), text: optStr(200) }).default({}),
  image: url.optional(),
  accent: optStr(30),
  pricing: z.array(pricingRow).max(20).default([])
    .refine((rows) => new Set(rows.map((r) => r.bhk)).size === rows.length, 'Each BHK can be priced only once'),
  areaRate: z.object({ minPerSqft: money.optional(), maxPerSqft: money.optional() }).default({}),
  isRecommended: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().optional(),
});
const packageSchemas = { create: packageBase, update: packageBase.partial().extend({ reason: optStr(500) }) };

const serviceBase = z.object({
  title: str(100).min(2),
  slug: optStr(80),
  icon: optStr(60),
  image: url.optional(),
  description: optStr(1000),
  showInBooking: z.boolean().default(true),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().optional(),
});
const serviceSchemas = { create: serviceBase, update: serviceBase.partial() };

const ruleBase = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{1,50}$/, 'Use lower_snake_case'),
  label: str(100).min(2),
  type: z.enum(['ROOM', 'ADDON']),
  room: z.enum(['kitchens', 'bedrooms', 'washrooms']).nullable().optional(),
  mode: z.enum(['FLAT', 'PERCENT']).default('FLAT'),
  min: money.default(0),
  max: money.default(0),
  packageOverrides: z.array(z.object({ package: objectId, min: money, max: money })).max(20).default([]),
  icon: optStr(60),
  image: url.optional(),
  description: optStr(500),
  isDemoValue: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().optional(),
});
const ruleCheck = (v, ctx) => {
  if (v.type === 'ROOM' && !v.room) ctx.addIssue({ code: 'custom', path: ['room'], message: 'Select the room this rule applies to' });
  if (v.min !== undefined && v.max !== undefined && v.min > v.max) ctx.addIssue({ code: 'custom', path: ['max'], message: 'Min cannot exceed max' });
};
const ruleSchemas = { create: ruleBase.superRefine(ruleCheck), update: ruleBase.partial().extend({ reason: optStr(500) }).superRefine(ruleCheck) };

const templateBase = z.object({
  event: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,60}$/),
  channel: z.enum(['IN_APP', 'WHATSAPP', 'SMS', 'EMAIL']),
  name: optStr(120),
  title: optStr(200),
  body: z.string().trim().min(1).max(4000),
  providerTemplateName: optStr(200),
  providerTemplateId: optStr(200),
  language: str(10).default('en'),
  variableOrder: z.array(z.string().regex(/^[a-zA-Z]\w{0,40}$/)).max(20).default([]),
  otpButton: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
const templateSchemas = { create: templateBase, update: templateBase.omit({ event: true, channel: true }).partial() };

const sendNotification = z.object({
  userIds: z.array(objectId).min(1).max(500),
  title: str(200).min(1),
  body: z.string().trim().min(1).max(2000),
  link: optStr(500),
});

// ── CMS ────────────────────────────────────────────────────────
const projectBase = z.object({
  title: str(150).min(2),
  slug: optStr(80),
  category: z.enum(PROJECT_CATEGORIES),
  city: optStr(80),
  locality: optStr(120),
  bhk: optStr(30),
  area: z.coerce.number().positive().max(1000000).optional(),
  packageName: optStr(80),
  summary: optStr(500),
  description: optStr(10000),
  coverImage: url.optional(),
  images: z.array(z.object({ url, alt: optStr(200), caption: optStr(300), kind: z.enum(['GALLERY', 'BEFORE', 'AFTER']).default('GALLERY') })).max(60).default([]),
  tags: z.array(str(40)).max(20).default([]),
  completedOn: z.coerce.date().optional(),
  seo: z.object({ title: optStr(70), description: optStr(170) }).default({}),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  order: z.coerce.number().int().optional(),
});
const projectSchemas = { create: projectBase, update: projectBase.partial() };

const testimonialBase = z.object({
  name: str(100).min(2),
  city: optStr(80),
  quote: z.string().trim().min(10).max(1500),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  photo: url.optional(),
  project: objectId.nullable().optional(),
  isPublished: z.boolean().default(false),
  order: z.coerce.number().int().optional(),
});
const testimonialSchemas = { create: testimonialBase, update: testimonialBase.partial() };

const faqBase = z.object({
  question: str(300).min(5),
  answer: z.string().trim().min(2).max(3000),
  category: z.string().trim().toUpperCase().max(40).default('GENERAL'),
  isPublished: z.boolean().default(true),
  order: z.coerce.number().int().optional(),
});
const faqSchemas = { create: faqBase, update: faqBase.partial() };

module.exports = {
  listQuery, updateLead, assign, bookingStatus, note, updateCustomer,
  createContractor, updateContractor, createStaff, updateStaff, resetPassword, createRole, updateRole,
  packageSchemas, serviceSchemas, ruleSchemas, templateSchemas, sendNotification,
  projectSchemas, testimonialSchemas, faqSchemas,
};
