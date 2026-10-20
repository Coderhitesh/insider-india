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
  commercialProjectTypes: ordered([
    opt('NEW_FITOUT', 'New Fit-out', { description: 'Complete interiors for a new office, shop or outlet.' }),
    opt('RENOVATION', 'Renovation / Refurbishment', { description: 'Upgrade or redesign an existing space.' }),
    opt('EXPANSION', 'Expansion', { description: 'Additional floor, area or branch.' }),
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
  // Commercial space types asked after the carpet area; UNIT/ADDON rules can be limited to some of them.
  commercialTypes: ordered([
    opt('OFFICE', 'Office / Co-working', { icon: 'Building2' }),
    opt('RETAIL', 'Retail / Showroom', { icon: 'Store' }),
    opt('RESTAURANT', 'Restaurant / Café', { icon: 'Coffee' }),
    opt('CLINIC', 'Clinic / Salon', { icon: 'Stethoscope' }),
    opt('OTHER', 'Other', { icon: 'LayoutGrid' }),
  ]),
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
  logoDarkUrl: '', // footer (red background); empty = built-in dark logo
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
    { key: 'handover', label: 'Handover guaranteed, otherwise we pay ₹1,000/day', value: '45 Days', visible: true },
    { key: 'designers', label: 'Designers', value: '500+', visible: true },
    { key: 'quotation', label: 'Item-wise quotation', value: '100%', visible: true },
    { key: 'consultations', label: 'Design Consultations', value: null, visible: false },
  ],
};

// Home page hero: two image sliders on the right (top + bottom). Empty lists fall back to the built-in photos.
const SITE_HERO = {
  intervalSeconds: 5,
  top: [],
  bottom: [],
  // Rotating home headline. `highlight`: words shown in brand red.
  headlines: [
    { text: 'Interiors designed around the way you live.', highlight: 'designed' },
    { text: 'Crafting spaces, building stories, sometimes dreams.', highlight: 'stories, dreams.' },
  ],
  headlineSeconds: 5,
};

// Online payments. NONE = only offline payments (cash/UPI/bank/cheque) are recorded by staff.
const PAYMENT_PROVIDER = { active: 'NONE', razorpay: { keyId: '', keySecret: '', webhookSecret: '' } };

// Refer & Earn. Off until management approves the terms. Slabs are chosen on the eligible project value
// (accepted quotation, excluding GST by default); `from` is the lower bound, `fromInclusive` whether it is included.
const REFERRAL_CONFIG = {
  enabled: false,
  programName: 'Refer & Earn',
  slabs: [
    { key: 'A', label: 'Up to ₹15 lakh', from: 0, fromInclusive: true, rewards: [25000, 45000, 55000] },
    { key: 'B', label: 'Above ₹15 lakh, below ₹20 lakh', from: 1500000, fromInclusive: false, rewards: [30000, 50000, 60000] },
    { key: 'C', label: '₹20 lakh and above', from: 2000000, fromInclusive: true, rewards: [35000, 55000, 65000] },
  ],
  afterLastLevel: 'REPEAT_LAST', // REPEAT_LAST | NONE
  countingPeriod: 'LIFETIME', // LIFETIME | FINANCIAL_YEAR | CALENDAR_YEAR
  payoutTrigger: 'AGREEMENT', // AGREEMENT (final quotation accepted) | ADVANCE (accepted + qualifying advance received)
  autoApprove: true, // credit the wallet automatically when the referral qualifies (staff can still hold/adjust)
  minAdvancePercent: 10,
  valueBasis: 'EXCL_GST', // EXCL_GST | INCL_GST
  // Rewards are not paid in cash: they are added to the referrer's wallet as credit for their own next project.
  maxRedeemPercent: 100, // max % of a project's value that can be paid with referral credit
  payoutWorkingDays: 15, // legacy (cash payouts) — unused
  tdsPercent: 0, // legacy — unused
  duplicateWindowDays: 180,
  maxSubmissionsPerDay: 10,
  terms: [
    'Refer genuine new customers for interior design, renovation, modular kitchens, furniture or turnkey projects.',
    'Your friend must register with your referral code or link (it is applied automatically when they open your link). The code only works for new customers registering for the first time — not for people already registered or already in discussion with us.',
    'The first valid referral we accept for a customer gets the credit. Duplicate, self, disputed or fraudulent referrals are rejected.',
    'A referral qualifies when your friend books with us and accepts the final quotation. The reward slab is based on the final accepted project value, excluding GST, refunds, cancelled work and unapproved variations.',
    'Rewards are not paid in cash and cannot be withdrawn or transferred. Approved rewards are added to your Refer & Earn wallet as credit.',
    'Use your wallet credit against your own next project with us: the credit is deducted from your project amount and you pay the remaining balance.',
    'Your second and third successful referrals earn the higher level rewards. One project counts once. Past rewards are not increased later.',
    'If the referred project is cancelled or its advance is refunded, the reward is withheld and the credit is removed from your wallet. Credit already used may be adjusted against your project balance.',
    'Share a customer’s details only with their permission. Do not promise discounts, collect payments on our behalf or misrepresent our services.',
    'We may change or end the program with notice; accepted referrals follow the terms in force when they were accepted.',
  ].join('\n'),
};

module.exports = { REFERRAL_CONFIG, OPERATIONS_CONFIG, MAPS_CONFIG, FUNNEL_OPTIONS, ESTIMATE_CONFIG, OTP_CONFIG, PRICING_CONFIG, COMPANY_PROFILE, SITE_STATS, SITE_HERO, PAYMENT_PROVIDER };
