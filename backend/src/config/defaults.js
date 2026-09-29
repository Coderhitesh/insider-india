// Default configuration documents. Seeded into `settings` once;
// afterwards the DB copy (managed from Admin) is the source of truth.
const opt = (value, label, extra = {}) => ({ value, label, active: true, ...extra });
const ordered = (arr) => arr.map((o, i) => ({ ...o, order: i + 1 }));

const FUNNEL_OPTIONS = {
  cities: ordered(['Delhi', 'Noida', 'Greater Noida', 'Gurugram', 'Ghaziabad', 'Faridabad', 'Other'].map((c) => opt(c, c))),
  requirementTypes: ordered([
    opt('FULL_HOME', 'Full Home Interior', { description: 'End-to-end design and execution for every room.' }),
    opt('KITCHEN_WARDROBE_STORAGE', 'Kitchen, Wardrobe & Storage', { description: 'Modular kitchens, wardrobes and storage solutions.' }),
    opt('CIVIL_FULL_HOME', 'Civil Work + Full Home Interior', { description: 'Structural and civil changes along with complete interiors.' }),
  ]),
  budgetRanges: ordered([
    opt('5_10L', '₹5L – ₹10L', { min: 500000, max: 1000000 }),
    opt('10_15L', '₹10L – ₹15L', { min: 1000000, max: 1500000 }),
    opt('15_25L', '₹15L – ₹25L', { min: 1500000, max: 2500000 }),
    opt('25_40L', '₹25L – ₹40L', { min: 2500000, max: 4000000 }),
    opt('40L_PLUS', '₹40L+', { min: 4000000 }),
    opt('NOT_SURE', 'Not Sure Yet'),
  ]),
  possessionOptions: ordered([
    opt('HAVE_POSSESSION', 'Yes, I already have possession'),
    opt('WITHIN_1M', 'Within 1 month'),
    opt('WITHIN_3M', 'Within 3 months'),
    opt('WITHIN_6M', 'Within 6 months'),
    opt('MORE_THAN_6M', 'More than 6 months'),
  ]),
  propertyTypes: ordered([
    opt('APARTMENT', 'Apartment', { image: '' }),
    opt('VILLA', 'Villa', { image: '' }),
    opt('INDEPENDENT_HOUSE', 'Independent House', { image: '' }),
  ]),
  bhkOptions: ordered([
    opt('1BHK', 'Studio / 1 BHK'),
    opt('2BHK', '2 BHK'),
    opt('3BHK', '3 BHK'),
    opt('4BHK', '4 BHK'),
    opt('5BHK_PLUS', '5 BHK & Above'),
  ]),
  projectTypes: ordered([
    opt('NEW_HOME', 'New Home Interior'),
    opt('RENOVATION', 'Renovation'),
    opt('RESALE', 'Resale Property Interior'),
  ]),
};

const ESTIMATE_CONFIG = {
  residentialSizes: ordered([
    opt('1BHK', 'Studio / 1 BHK'),
    opt('2BHK', '2 BHK'),
    opt('3BHK', '3 BHK'),
    opt('4BHK', '4 BHK'),
    opt('5BHK_PLUS', '5 BHK+'),
    opt('CUSTOM', 'Custom Area'),
  ]),
  // Rooms already covered by the base package price for each size.
  includedRooms: {
    '1BHK': { kitchens: 1, bedrooms: 1, washrooms: 1 },
    '2BHK': { kitchens: 1, bedrooms: 2, washrooms: 2 },
    '3BHK': { kitchens: 1, bedrooms: 3, washrooms: 3 },
    '4BHK': { kitchens: 1, bedrooms: 4, washrooms: 4 },
    '5BHK_PLUS': { kitchens: 1, bedrooms: 5, washrooms: 5 },
    CUSTOM: { kitchens: 0, bedrooms: 0, washrooms: 0 },
    COMMERCIAL: { kitchens: 0, bedrooms: 0, washrooms: 0 },
  },
  defaultCounters: {
    '1BHK': { kitchens: 1, bedrooms: 1, washrooms: 1 },
    '2BHK': { kitchens: 1, bedrooms: 2, washrooms: 2 },
    '3BHK': { kitchens: 1, bedrooms: 3, washrooms: 3 },
    '4BHK': { kitchens: 1, bedrooms: 4, washrooms: 4 },
    '5BHK_PLUS': { kitchens: 1, bedrooms: 5, washrooms: 5 },
    CUSTOM: { kitchens: 1, bedrooms: 2, washrooms: 2 },
    COMMERCIAL: { kitchens: 0, bedrooms: 0, washrooms: 1 },
  },
  counterLimits: { kitchens: { min: 0, max: 4 }, bedrooms: { min: 0, max: 10 }, washrooms: { min: 0, max: 10 } },
  areaLimits: { min: 100, max: 200000 },
  roundTo: 10000,
  disclaimer:
    'This is an indicative estimate based on the information provided. Final pricing will be prepared after an expert site visit, actual measurements, material selection and scope verification.',
};

const OTP_CONFIG = {
  length: 4,
  expiryMinutes: 5,
  resendCooldownSeconds: 30,
  maxAttempts: 5,
  maxSendsPerHour: 5,
  channels: ['SMS', 'WHATSAPP'],
};

const PRICING_CONFIG = {
  floorPlanAssistanceCharge: 1999,
  defaultGstPercent: 18,
  currency: 'INR',
};

const COMPANY_PROFILE = {
  name: 'INSIDER INDIA LLP',
  tagline: 'Interiors Designed Around the Way You Live.',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  gstNumber: '',
  logoUrl: '',
  faviconUrl: '',
  social: { instagram: '', facebook: '', youtube: '', linkedin: '' },
  quotationFooter: '',
  terms: '',
  warrantyContent: '',
};

// Left empty on purpose: payment milestones and validity are business terms to be set by the company.
const OPERATIONS_CONFIG = { validityDays: null, paymentSchedule: [], siteVideosEnabled: false, reminderHoursBefore: 24 };

const MAPS_CONFIG = { autocompleteEnabled: true, regionCodes: ['in'] };

// Left null/hidden on purpose — never publish invented numbers.
const SITE_STATS = {
  items: [
    { key: 'years', label: 'Years of Experience', value: null, visible: false },
    { key: 'projects', label: 'Projects Completed', value: null, visible: false },
    { key: 'warranty', label: 'Warranty Cover', value: 'Up to 20 Years', visible: true },
    { key: 'consultations', label: 'Design Consultations', value: null, visible: false },
  ],
};

module.exports = { OPERATIONS_CONFIG, MAPS_CONFIG, FUNNEL_OPTIONS, ESTIMATE_CONFIG, OTP_CONFIG, PRICING_CONFIG, COMPANY_PROFILE, SITE_STATS };
