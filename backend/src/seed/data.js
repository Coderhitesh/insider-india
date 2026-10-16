const L = (lakh) => Math.round(lakh * 100000);

const PACKAGES = [
  {
    name: 'Economical',
    slug: 'economical',
    headline: 'Our base package with essential solutions for all your home interior needs.',
    description: 'Our base package with essential solutions for all your home interior needs.',
    features: ['Affordable pricing', 'Convenient interior designs', 'Furniture category', 'Basic accessories'],
    warranty: {},
    accent: 'sand',
    order: 1,
    pricing: [
      { bhk: '2BHK', min: L(5.5), max: L(9.5) },
      { bhk: '3BHK', min: L(6.5), max: L(12.5) },
      { bhk: '4BHK', min: L(10.5), max: L(14.5) },
    ],
  },
  {
    name: 'Premium Elegance',
    slug: 'premium-elegance',
    headline: 'Our superior package offering solutions to take your interiors to the next level.',
    description: 'Our superior package offering solutions to take your interiors to the next level.',
    features: ['Mid-range pricing', 'Premium designs', 'Wide range of accessories'],
    warranty: {},
    accent: 'terracotta',
    order: 2,
    isRecommended: true,
    pricing: [
      { bhk: '2BHK', min: L(7.5), max: L(12.5) },
      { bhk: '3BHK', min: L(9.5), max: L(18.5) },
      { bhk: '4BHK', min: L(12.5), max: L(21.5) },
    ],
  },
  {
    name: 'Luxer Silver',
    slug: 'luxer-silver',
    headline: 'Our high-end package for an elevated home interior experience.',
    description: 'Our high-end package for an elevated home interior experience.',
    features: ['Elite pricing', 'Lavish designs', 'Extensive range of accessories', '15-year warranty cover plan'],
    warranty: { years: 15, text: '15-year warranty cover plan' },
    accent: 'stone',
    order: 3,
    pricing: [
      { bhk: '2BHK', min: L(9.5), max: L(15.5) },
      { bhk: '3BHK', min: L(12.5), max: L(21.5) },
      { bhk: '4BHK', min: L(14.5), max: L(23.5) },
    ],
  },
  {
    name: 'Luxer Gold',
    slug: 'luxer-gold',
    headline: 'Our luxury package for the ultimate home interior experience.',
    description: 'Our luxury package for the ultimate home interior experience.',
    features: [
      'Luxury interior solutions', 'Luxury designs', 'Premium furniture', 'Extensive accessories', 'Premium hardware',
      'Soft-touch hinges', 'Soft-close mechanisms', 'Premium fittings', '20-year warranty cover plan',
    ],
    warranty: { years: 20, text: '20-year warranty cover plan' },
    accent: 'brass',
    order: 4,
    pricing: [
      { bhk: '2BHK', min: L(12.5), max: L(21.5) },
      { bhk: '3BHK', min: L(18.5), max: L(37.5) },
      { bhk: '4BHK', min: L(25.5), max: L(52.5) },
    ],
  },
];

const SERVICES = [
  ['Modern Kitchen', 'modern-kitchen', 'CookingPot'],
  ['Modern Wardrobe / Storage', 'modern-wardrobe-storage', 'Archive'],
  ['Wall Solutions / Wall Panelling', 'wall-panelling', 'PanelsTopLeft'],
  ['False Ceiling', 'false-ceiling', 'Layers'],
  ['Painting', 'painting', 'PaintRoller'],
  ['Furniture & Doors', 'furniture-doors', 'DoorOpen'],
  ['TV Units', 'tv-units', 'Tv'],
  ['Pooja Units', 'pooja-units', 'Flame'],
].map(([title, slug, icon], i) => ({ title, slug, icon, order: i + 1, showInBooking: true }));

// DEMO VALUES — not supplied in the brief. Review in Admin > Estimate Rules before launch.
const ESTIMATE_RULES = [
  { key: 'extra_kitchen', label: 'Additional modular kitchen', type: 'ROOM', room: 'kitchens', min: 150000, max: 300000 },
  { key: 'extra_bedroom', label: 'Additional bedroom', type: 'ROOM', room: 'bedrooms', min: 100000, max: 200000 },
  { key: 'extra_washroom', label: 'Additional washroom', type: 'ROOM', room: 'washrooms', min: 40000, max: 90000 },
  { key: 'sofa_set', label: 'Sofa Set', type: 'ADDON', icon: 'Sofa', min: 40000, max: 150000 },
  { key: 'wall_panelling', label: 'Wall Panelling', type: 'ADDON', icon: 'PanelsTopLeft', min: 30000, max: 120000 },
  { key: 'tv_unit', label: 'TV Unit', type: 'ADDON', icon: 'Tv', min: 25000, max: 90000 },
  { key: 'false_ceiling', label: 'False Ceiling', type: 'ADDON', icon: 'Layers', min: 40000, max: 150000 },
  { key: 'painting', label: 'Painting', type: 'ADDON', icon: 'PaintRoller', min: 30000, max: 100000 },
  { key: 'wardrobe', label: 'Wardrobe', type: 'ADDON', icon: 'Archive', min: 60000, max: 200000 },
  { key: 'storage', label: 'Storage', type: 'ADDON', icon: 'Boxes', min: 25000, max: 80000 },
  { key: 'furniture', label: 'Furniture', type: 'ADDON', icon: 'Armchair', min: 50000, max: 250000 },
  { key: 'pooja_unit', label: 'Pooja Unit', type: 'ADDON', icon: 'Flame', min: 20000, max: 80000 },
  { key: 'premium_lighting', label: 'Premium Lighting', type: 'ADDON', icon: 'Lamp', min: 30000, max: 120000 },
].map((r, i) => ({ mode: 'FLAT', isDemoValue: true, order: i + 1, ...r }));

const T = (event, channel, body, extra = {}) => ({ event, channel, body, name: `${event} (${channel})`, ...extra });

// providerTemplateName/Id must match templates approved with your WhatsApp/SMS provider.
const NOTIFICATION_TEMPLATES = [
  T('OTP', 'SMS', '{{otp}} is your {{company}} verification code. It is valid for {{expiry}} minutes. Do not share it with anyone.',
    { providerTemplateId: '', variableOrder: ['otp'] }),
  T('OTP', 'WHATSAPP', '{{otp}} is your verification code. For your security, do not share this code.',
    { providerTemplateName: 'insider_otp', variableOrder: ['otp'], otpButton: true }),

  T('BOOKING_CREATED', 'IN_APP', 'Your consultation request {{bookingNumber}} has been received. Our team will contact you shortly.', { title: 'Consultation request received' }),
  T('BOOKING_CREATED', 'WHATSAPP', 'Hi {{name}}, thank you for choosing {{company}}. Your consultation request {{bookingNumber}} has been received. Track it here: {{link}}',
    { providerTemplateName: 'insider_booking_created', variableOrder: ['name', 'bookingNumber', 'link'] }),
  T('BOOKING_CREATED', 'SMS', 'Hi {{name}}, your {{company}} consultation request {{bookingNumber}} is received. Track: {{link}}',
    { providerTemplateId: '', variableOrder: ['name', 'bookingNumber', 'link'] }),
  T('NEW_BOOKING_STAFF', 'IN_APP', '{{customerName}} ({{city}}) submitted booking {{bookingNumber}}.', { title: 'New booking received' }),

  T('CONTRACTOR_ASSIGNED', 'IN_APP', 'An expert, {{contractorName}}, has been assigned to your booking {{bookingNumber}}.', { title: 'Expert assigned' }),
  T('CONTRACTOR_ASSIGNED', 'WHATSAPP', 'Hi {{name}}, {{contractorName}} from {{company}} has been assigned to your booking {{bookingNumber}}. Details: {{link}}',
    { providerTemplateName: 'insider_expert_assigned', variableOrder: ['name', 'contractorName', 'bookingNumber', 'link'] }),
  T('CONTRACTOR_NEW_ASSIGNMENT', 'IN_APP', 'You have been assigned booking {{bookingNumber}} in {{city}}.', { title: 'New assignment' }),
  T('CONTRACTOR_NEW_ASSIGNMENT', 'WHATSAPP', 'Hi {{name}}, booking {{bookingNumber}} ({{city}}) has been assigned to you. Open: {{link}}',
    { providerTemplateName: 'insider_contractor_assignment', variableOrder: ['name', 'bookingNumber', 'city', 'link'] }),

  T('SITE_VISIT_SCHEDULED', 'IN_APP', 'Your site visit is scheduled for {{visitDate}} at {{visitTime}}.', { title: 'Site visit scheduled' }),
  T('SITE_VISIT_SCHEDULED', 'WHATSAPP', 'Hi {{name}}, your {{company}} site visit is scheduled for {{visitDate}} at {{visitTime}}. Details: {{link}}',
    { providerTemplateName: 'insider_site_visit_scheduled', variableOrder: ['name', 'visitDate', 'visitTime', 'link'] }),
  T('SITE_VISIT_REMINDER', 'IN_APP', 'Reminder: your site visit is on {{visitDate}} at {{visitTime}}.', { title: 'Site visit reminder' }),
  T('SITE_VISIT_REMINDER', 'WHATSAPP', 'Hi {{name}}, a reminder that your {{company}} site visit is on {{visitDate}} at {{visitTime}}.',
    { providerTemplateName: 'insider_site_visit_reminder', variableOrder: ['name', 'visitDate', 'visitTime'] }),

  T('QUOTATION_READY', 'IN_APP', 'Your quotation {{quotationNumber}} is ready for review.', { title: 'Your quotation is ready' }),
  T('QUOTATION_READY', 'WHATSAPP', 'Hi {{name}}, your interior quotation from {{company}} is ready. Log in to your dashboard to review it: {{link}}',
    { providerTemplateName: 'insider_quotation_ready', variableOrder: ['name', 'link'] }),
  T('QUOTATION_READY', 'SMS', 'Hi {{name}}, your {{company}} quotation is ready. Review: {{link}}', { providerTemplateId: '', variableOrder: ['name', 'link'] }),
  T('QUOTATION_READY', 'EMAIL', 'Hi {{name}},\n\nYour interior quotation {{quotationNumber}} from {{company}} is ready. Review it in your dashboard: {{link}}\n\nTeam {{company}}',
    { title: 'Your {{company}} quotation is ready' }),
  T('QUOTATION_REVISED', 'IN_APP', 'A revised quotation {{quotationNumber}} is ready for review.', { title: 'Revised quotation ready' }),
  T('QUOTATION_REVISED', 'WHATSAPP', 'Hi {{name}}, a revised quotation from {{company}} is ready. Review: {{link}}',
    { providerTemplateName: 'insider_quotation_revised', variableOrder: ['name', 'link'] }),
  T('QUOTATION_ACCEPTED', 'IN_APP', '{{customerName}} accepted quotation {{quotationNumber}}.', { title: 'Quotation accepted' }),

  T('QUOTATION_SUBMITTED', 'IN_APP', '{{contractorName}} submitted {{quotationNumber}} ({{amount}}) for booking {{bookingNumber}}.', { title: 'Quotation awaiting review' }),
  T('QUOTATION_RETURNED', 'IN_APP', '{{quotationNumber}} was returned for changes: {{note}}', { title: 'Quotation returned' }),
  T('QUOTATION_REVISION_REQUESTED', 'IN_APP', '{{customerName}} requested a revision of {{quotationNumber}}: {{note}}', { title: 'Revision requested' }),
  T('QUOTATION_REJECTED', 'IN_APP', '{{customerName}} rejected {{quotationNumber}}. {{note}}', { title: 'Quotation rejected' }),
  T('QUOTATION_REVISED', 'EMAIL', 'Hi {{name}},\n\nA revised quotation {{quotationNumber}} from {{company}} is ready. Review it here: {{link}}\n\nTeam {{company}}', { title: 'Your revised {{company}} quotation' }),
  T('PROJECT_UPDATE_POSTED', 'IN_APP', 'There is a new progress update on your project {{projectNumber}}.', { title: 'Project update' }),
  T('PROJECT_STATUS_UPDATED', 'IN_APP', 'Your project is now at stage: {{stage}}.', { title: 'Project update' }),
  T('PROJECT_STATUS_UPDATED', 'WHATSAPP', 'Hi {{name}}, your {{company}} project has moved to: {{stage}}. Details: {{link}}',
    { providerTemplateName: 'insider_project_update', variableOrder: ['name', 'stage', 'link'] }),
];

// Draft FAQs describing the process defined in the brief. Seeded UNPUBLISHED — review wording, then publish from Admin.
const FAQS = [
  ['Is the online estimate my final price?', 'No. The estimate is indicative, based on the details you share. Your final quotation is prepared only after an expert site visit, actual measurements, material selection and scope verification.'],
  ['What happens after I book a consultation?', 'Our team reviews your request and assigns an expert, who schedules a site visit to take measurements and understand your requirements. You then receive a detailed quotation in your dashboard.'],
  ["I don't have a floor plan. Can I still book?", 'Yes. You can opt for expert measurement assistance while booking; our expert prepares measurements during the site visit. This is an additional charge, shown clearly before you confirm.'],
  ['How will I receive my quotation?', 'Once reviewed and approved, your quotation is published to your customer dashboard and we notify you on WhatsApp. You can download the PDF, accept it, request a revision or reject it.'],
  ['Do I need a password to log in?', 'No. You log in with a one-time verification code sent to your mobile number by SMS or WhatsApp.'],
].map(([question, answer], i) => ({ question, answer, category: 'PROCESS', isPublished: false, order: i + 1 }));

// Commercial estimate: per-sq-ft base by package (carpet area × rate) for the basic fit-out of the space;
// furniture and rooms (workstations, cabins, cafeteria …) are added per unit on top. Starting values — edit in Admin → Packages.
const COMMERCIAL_AREA_RATES = {
  economical: { minPerSqft: 600, maxPerSqft: 900 },
  'premium-elegance': { minPerSqft: 900, maxPerSqft: 1300 },
  'luxer-silver': { minPerSqft: 1300, maxPerSqft: 1800 },
  'luxer-gold': { minPerSqft: 1800, maxPerSqft: 2600 },
};

// Commercial rules (UNIT = counted, priced per unit). Starting values — edit in Admin → Estimate rules.
const U = (key, label, unitLabel, min, max, extra = {}) => ({ key, label, type: 'UNIT', appliesTo: 'COMMERCIAL', unitLabel, min, max, maxQty: 500, isDemoValue: true, ...extra });
const A = (key, label, icon, min, max, extra = {}) => ({ key, label, type: 'ADDON', appliesTo: 'COMMERCIAL', icon, min, max, isDemoValue: true, ...extra });
const COMMERCIAL_RULES = [
  U('c_workstations', 'Workstations / chairs', 'seats', 12000, 25000, { icon: 'Armchair', defaultQty: 10, commercialTypes: ['OFFICE', 'OTHER'], order: 101 }),
  U('c_cabins', 'Manager cabins', 'cabins', 80000, 200000, { icon: 'DoorClosed', defaultQty: 1, commercialTypes: ['OFFICE', 'CLINIC', 'OTHER'], order: 102 }),
  U('c_conference', 'Conference rooms', 'rooms', 200000, 500000, { icon: 'Presentation', commercialTypes: ['OFFICE', 'OTHER'], order: 103 }),
  U('c_meeting', 'Meeting / discussion rooms', 'rooms', 100000, 250000, { icon: 'Users', commercialTypes: ['OFFICE', 'OTHER'], order: 104 }),
  U('c_reception', 'Reception area', 'areas', 150000, 400000, { icon: 'ConciergeBell', defaultQty: 1, order: 105 }),
  U('c_cafeteria', 'Cafeteria / pantry', 'areas', 150000, 500000, { icon: 'Coffee', commercialTypes: ['OFFICE', 'CLINIC', 'OTHER'], order: 106 }),
  U('c_washrooms', 'Washrooms', 'washrooms', 60000, 150000, { icon: 'Bath', defaultQty: 1, order: 107 }),
  U('c_server_room', 'Server / IT room', 'rooms', 100000, 300000, { icon: 'Server', commercialTypes: ['OFFICE'], order: 108 }),
  U('c_storage', 'Store room', 'rooms', 40000, 100000, { icon: 'Boxes', order: 109 }),
  U('c_display_units', 'Display units / shelving', 'units', 30000, 100000, { icon: 'LayoutGrid', defaultQty: 4, commercialTypes: ['RETAIL'], order: 110 }),
  U('c_cash_counter', 'Cash / billing counter', 'counters', 50000, 150000, { icon: 'Receipt', defaultQty: 1, commercialTypes: ['RETAIL', 'RESTAURANT'], order: 111 }),
  U('c_trial_rooms', 'Trial rooms', 'rooms', 40000, 100000, { icon: 'Shirt', commercialTypes: ['RETAIL'], order: 112 }),
  U('c_dining_seats', 'Dining seats', 'seats', 8000, 20000, { icon: 'Utensils', defaultQty: 20, commercialTypes: ['RESTAURANT'], order: 113 }),
  U('c_bar_counter', 'Bar / service counter', 'counters', 100000, 300000, { icon: 'Wine', commercialTypes: ['RESTAURANT'], order: 114 }),
  U('c_kitchen', 'Commercial kitchen', 'kitchens', 300000, 800000, { icon: 'CookingPot', commercialTypes: ['RESTAURANT'], order: 115 }),
  U('c_consult_rooms', 'Consultation / treatment rooms', 'rooms', 150000, 300000, { icon: 'Stethoscope', commercialTypes: ['CLINIC'], order: 116 }),
  U('c_waiting', 'Waiting area', 'areas', 100000, 250000, { icon: 'Sofa', commercialTypes: ['CLINIC', 'RETAIL', 'OTHER'], order: 117 }),
  A('c_glass_partitions', 'Glass partitions', 'PanelsTopLeft', 100000, 400000, { order: 130 }),
  A('c_false_ceiling', 'False ceiling', 'Layers', 80000, 300000, { order: 131 }),
  A('c_acoustic', 'Acoustic panels', 'AudioLines', 60000, 250000, { order: 132 }),
  A('c_branding_wall', 'Branding / feature wall', 'Sparkles', 50000, 200000, { order: 133 }),
  A('c_flooring', 'Flooring (vinyl / carpet / tiles)', 'Grid3x3', 100000, 500000, { order: 134 }),
  A('c_lighting', 'Lighting', 'Lamp', 60000, 250000, { order: 135 }),
  A('c_electrical', 'Electrical & networking', 'Cable', 80000, 300000, { order: 136 }),
  A('c_painting', 'Painting', 'PaintRoller', 40000, 150000, { order: 137 }),
];

module.exports = { PACKAGES, SERVICES, ESTIMATE_RULES, COMMERCIAL_RULES, COMMERCIAL_AREA_RATES, NOTIFICATION_TEMPLATES, FAQS };
