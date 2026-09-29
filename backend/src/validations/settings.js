const { z } = require('./common');

const s = (max = 300) => z.string().trim().max(max).default('');
const url = z.string().trim().max(1000).refine((v) => v === '' || /^https:\/\//.test(v), 'Must be an https URL').default('');
const option = z.object({
  value: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional(),
  image: z.string().trim().max(1000).optional(),
  min: z.number().min(0).optional(),
  max: z.number().min(0).optional(),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});
const optionList = z.array(option).max(50).refine((l) => new Set(l.map((o) => o.value)).size === l.length, 'Option values must be unique');
const rooms = z.object({ kitchens: z.number().int().min(0).max(10), bedrooms: z.number().int().min(0).max(20), washrooms: z.number().int().min(0).max(20) });
const limit = z.object({ min: z.number().int().min(0), max: z.number().int().min(0) });

// One schema per settings key. Secret fields accept masked values (kept unchanged).
const SETTINGS_SCHEMAS = {
  'company.profile': z.object({
    name: z.string().trim().min(2).max(120),
    tagline: s(200), phone: s(20), whatsapp: s(20), email: s(200), address: s(500), gstNumber: s(20),
    logoUrl: url, faviconUrl: url,
    social: z.object({ instagram: url, facebook: url, youtube: url, linkedin: url }).default({}),
    quotationFooter: s(2000), terms: s(20000), warrantyContent: s(20000),
  }),
  'site.stats': z.object({
    items: z.array(z.object({
      key: z.string().trim().regex(/^[a-z_]{2,30}$/),
      label: z.string().trim().min(1).max(60),
      value: z.string().trim().max(40).nullable(),
      visible: z.boolean(),
    })).max(12),
  }),
  'funnel.options': z.object({
    cities: optionList, requirementTypes: optionList, budgetRanges: optionList, possessionOptions: optionList,
    propertyTypes: optionList, bhkOptions: optionList, projectTypes: optionList,
  }),
  'estimate.config': z.object({
    residentialSizes: optionList,
    includedRooms: z.record(rooms),
    defaultCounters: z.record(rooms),
    counterLimits: z.object({ kitchens: limit, bedrooms: limit, washrooms: limit }),
    areaLimits: limit,
    roundTo: z.number().int().min(0).max(1000000),
    disclaimer: z.string().trim().min(20).max(1000),
  }),
  'otp.config': z.object({
    length: z.number().int().min(4).max(8),
    expiryMinutes: z.number().int().min(1).max(30),
    resendCooldownSeconds: z.number().int().min(10).max(600),
    maxAttempts: z.number().int().min(3).max(10),
    maxSendsPerHour: z.number().int().min(1).max(20),
    channels: z.array(z.enum(['SMS', 'WHATSAPP'])).min(1),
  }),
  'pricing.config': z.object({
    floorPlanAssistanceCharge: z.number().min(0).max(1000000),
    defaultGstPercent: z.number().min(0).max(28),
    currency: z.literal('INR').default('INR'),
  }),
  'operations.config': z.object({
    validityDays: z.number().int().min(1).max(365).nullable(),
    paymentSchedule: z.array(z.object({ label: z.string().trim().min(1).max(120), percent: z.number().min(0).max(100) })).max(12)
      .refine((l) => !l.length || Math.abs(l.reduce((s, p) => s + p.percent, 0) - 100) < 0.001, 'Payment schedule must add up to 100%'),
    siteVideosEnabled: z.boolean(),
    reminderHoursBefore: z.number().int().min(1).max(72),
  }),
  'maps.config': z.object({
    autocompleteEnabled: z.boolean(),
    regionCodes: z.array(z.string().trim().toLowerCase().length(2)).min(1).max(15),
  }),
  storage: z.object({
    active: z.enum(['CLOUDINARY', 'S3']),
    cloudinary: z.object({ cloudName: s(100), apiKey: s(100), apiSecret: s(200), folder: s(100) }),
    s3: z.object({ accessKeyId: s(128), secretAccessKey: s(200), region: s(30), bucket: s(100), cdnUrl: url, prefix: s(100) }),
  }),
  'providers.sms': z.object({
    active: z.enum(['LOG', 'MSG91', 'TWILIO']),
    msg91: z.object({ authKey: s(200), senderId: s(20) }),
    twilio: z.object({ accountSid: s(100), authToken: s(200), from: s(30) }),
  }),
  'providers.whatsapp': z.object({
    active: z.enum(['LOG', 'META', 'INTERAKT', 'GUPSHUP', 'TWILIO']),
    meta: z.object({ accessToken: s(1000), phoneNumberId: s(50), apiVersion: s(10) }),
    interakt: z.object({ apiKey: s(500) }),
    gupshup: z.object({ apiKey: s(200), source: s(20), appName: s(100) }),
    twilio: z.object({ accountSid: s(100), authToken: s(200), from: s(40) }),
  }),
  'providers.email': z.object({
    active: z.enum(['LOG', 'SMTP']),
    smtp: z.object({ host: s(200), port: z.number().int().min(1).max(65535), secure: z.boolean(), user: s(200), pass: s(500), from: s(200) }),
  }),
};

const SUPER_ADMIN_KEYS = ['storage', 'providers.sms', 'providers.whatsapp', 'providers.email', 'otp.config'];
const PUBLIC_KEYS = ['company.profile', 'site.stats', 'funnel.options'];

module.exports = { SETTINGS_SCHEMAS, SUPER_ADMIN_KEYS, PUBLIC_KEYS };
