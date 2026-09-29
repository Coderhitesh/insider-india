const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CONTRACTOR: 'CONTRACTOR',
  CUSTOMER: 'CUSTOMER',
});

const STAFF_PASSWORD_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CONTRACTOR];
const OTP_BLOCKED_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

const PERMISSIONS = [
  ['dashboard.view', 'Dashboard', 'View operations dashboard'],
  ['leads.view', 'Leads', 'View leads'],
  ['leads.create', 'Leads', 'Create leads manually'],
  ['leads.edit', 'Leads', 'Edit leads'],
  ['leads.delete', 'Leads', 'Delete leads'],
  ['leads.assign', 'Leads', 'Assign leads'],
  ['customers.view', 'Customers', 'View customers'],
  ['customers.edit', 'Customers', 'Edit customers'],
  ['contractors.view', 'Contractors', 'View contractors'],
  ['contractors.create', 'Contractors', 'Create contractors'],
  ['contractors.edit', 'Contractors', 'Edit contractors'],
  ['contractors.delete', 'Contractors', 'Delete contractors'],
  ['users.view', 'Users', 'View staff users'],
  ['users.manage', 'Users', 'Create/edit staff users'],
  ['roles.manage', 'Roles', 'Manage roles & permissions'],
  ['bookings.view', 'Bookings', 'View bookings'],
  ['bookings.edit', 'Bookings', 'Edit bookings'],
  ['bookings.assign', 'Bookings', 'Assign contractors to bookings'],
  ['site_visit.view', 'Site Visits', 'View site visits'],
  ['site_visit.manage', 'Site Visits', 'Schedule/record site visits & measurements'],
  ['quotations.view', 'Quotations', 'View quotations'],
  ['quotations.create', 'Quotations', 'Create quotations'],
  ['quotations.edit', 'Quotations', 'Edit quotations'],
  ['quotations.review', 'Quotations', 'Review contractor quotations'],
  ['quotations.approve', 'Quotations', 'Approve quotations'],
  ['quotations.send', 'Quotations', 'Send quotations to customers'],
  ['quotations.discount', 'Quotations', 'Apply discounts'],
  ['packages.view', 'Packages', 'View packages'],
  ['packages.manage', 'Packages', 'Manage packages, pricing, services & estimate rules'],
  ['content.manage', 'Content', 'Manage projects, testimonials, FAQs'],
  ['settings.view', 'Settings', 'View settings'],
  ['settings.manage', 'Settings', 'Manage settings, providers & storage'],
  ['notifications.send', 'Notifications', 'Send notifications / edit templates'],
  ['reports.view', 'Reports', 'View reports'],
  ['audit_logs.view', 'Audit', 'View audit logs'],
].map(([key, group, description]) => ({ key, group, description }));

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: PERMISSIONS.map((p) => p.key).filter((k) => !['settings.manage', 'roles.manage', 'audit_logs.view'].includes(k)),
  CONTRACTOR: [
    'leads.view', 'bookings.view', 'site_visit.view', 'site_visit.manage',
    'quotations.view', 'quotations.create', 'quotations.edit',
  ],
  CUSTOMER: [],
};

const LEAD_STATUS = [
  'NEW', 'IN_PROGRESS', 'OTP_PENDING', 'VERIFIED', 'QUALIFIED', 'BOOKED',
  'CONTRACTOR_ASSIGNED', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_COMPLETED',
  'QUOTATION_DRAFT', 'QUOTATION_REVIEW', 'QUOTATION_SENT', 'WON', 'LOST', 'CANCELLED',
];
const LEAD_OPEN_STATUS = ['NEW', 'IN_PROGRESS', 'OTP_PENDING', 'VERIFIED', 'QUALIFIED'];

const BOOKING_STATUS = [
  'CONFIRMED', 'CONTRACTOR_ASSIGNED', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_COMPLETED',
  'QUOTATION_IN_PROGRESS', 'QUOTATION_SENT', 'QUOTATION_ACCEPTED', 'QUOTATION_REJECTED',
  'PROJECT_STARTED', 'PROJECT_IN_PROGRESS', 'PROJECT_COMPLETED', 'CANCELLED',
];

const TIMELINE = Object.freeze({
  REQUIREMENT_SUBMITTED: 'Requirement Submitted',
  MOBILE_VERIFIED: 'Mobile Verified',
  BOOKING_CONFIRMED: 'Booking Confirmed',
  CONTRACTOR_ASSIGNED: 'Contractor Assigned',
  SITE_VISIT_SCHEDULED: 'Site Visit Scheduled',
  SITE_VISIT_COMPLETED: 'Site Visit Completed',
  MEASUREMENTS_RECORDED: 'Measurements Recorded',
  QUOTATION_DRAFTED: 'Quotation Drafted',
  QUOTATION_UNDER_REVIEW: 'Quotation Under Admin Review',
  QUOTATION_SENT: 'Quotation Sent to Customer',
  QUOTATION_VIEWED: 'Customer Viewed Quotation',
  QUOTATION_ACCEPTED: 'Quotation Accepted',
  QUOTATION_REJECTED: 'Quotation Rejected',
  QUOTATION_REVISED: 'Quotation Revised',
  PROJECT_STARTED: 'Project Started',
  PROJECT_IN_PROGRESS: 'Project In Progress',
  PROJECT_COMPLETED: 'Project Completed',
});

const BOOKING_STEPS = [
  'BASIC_INFO', 'REQUIREMENT', 'BUDGET', 'POSSESSION', 'OTP',
  'LOCATION', 'PROPERTY_TYPE', 'BHK', 'PROJECT_TYPE', 'SERVICES', 'FLOOR_PLAN',
];
const PRE_OTP_STEPS = ['BASIC_INFO', 'REQUIREMENT', 'BUDGET', 'POSSESSION'];

const CHANNELS = Object.freeze({ IN_APP: 'IN_APP', WHATSAPP: 'WHATSAPP', SMS: 'SMS', EMAIL: 'EMAIL' });

const IMG = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_PURPOSES = {
  FLOOR_PLAN: { mimes: ['application/pdf', ...IMG], isPrivate: true, maxMb: 15, permission: null },
  AVATAR: { mimes: IMG, isPrivate: false, maxMb: 5, permission: null },
  SITE_IMAGE: { mimes: IMG, isPrivate: true, maxMb: 15, permission: 'site_visit.manage' },
  SITE_DOCUMENT: { mimes: ['application/pdf', ...IMG], isPrivate: true, maxMb: 20, permission: 'site_visit.manage' },
  QUOTATION_ITEM_IMAGE: { mimes: IMG, isPrivate: true, maxMb: 10, permission: 'quotations.edit' },
  CONTENT_IMAGE: { mimes: IMG, isPrivate: false, maxMb: 10, permission: 'content.manage' },
  SITE_VIDEO: { mimes: ['video/mp4', 'video/webm', 'video/quicktime'], isPrivate: true, maxMb: 50, permission: 'site_visit.manage', setting: 'siteVideosEnabled' },
  PROJECT_UPDATE: { mimes: ['application/pdf', ...IMG], isPrivate: true, maxMb: 20, permission: 'bookings.edit' },
};
const MAX_UPLOAD_MB = 50;
const EXT_BY_MIME = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'video/mp4': ['mp4', 'm4v'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov'],
};

const QUOTATION_STATUS = ['DRAFT', 'UNDER_ADMIN_REVIEW', 'APPROVED', 'SENT_TO_CUSTOMER', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'SUPERSEDED'];
const CUSTOMER_VISIBLE_QUOTATION = ['SENT_TO_CUSTOMER', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED'];
const PROJECT_STAGES = ['DESIGN', 'DESIGN_APPROVAL', 'MATERIAL_SELECTION', 'PRODUCTION', 'SITE_EXECUTION', 'QUALITY_CHECK', 'HANDOVER', 'COMPLETED'];
const MEASUREMENT_UNITS = ['FT', 'INCH', 'SQFT', 'RFT', 'MM', 'CM', 'M', 'SQM', 'PCS'];
const ROOM_TYPES = ['LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'BALCONY', 'STUDY', 'POOJA_ROOM', 'DINING', 'FOYER', 'UTILITY', 'CUSTOM'];
const SITE_CONDITIONS = ['BARE_SHELL', 'SEMI_FURNISHED', 'FURNISHED', 'UNDER_CONSTRUCTION', 'RENOVATION_REQUIRED', 'OTHER'];

module.exports = {
  ROLES, STAFF_PASSWORD_ROLES, OTP_BLOCKED_ROLES, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS,
  LEAD_STATUS, LEAD_OPEN_STATUS, BOOKING_STATUS, TIMELINE,
  BOOKING_STEPS, PRE_OTP_STEPS, CHANNELS, UPLOAD_PURPOSES, MAX_UPLOAD_MB, EXT_BY_MIME,
  QUOTATION_STATUS, CUSTOMER_VISIBLE_QUOTATION, PROJECT_STAGES, MEASUREMENT_UNITS, ROOM_TYPES, SITE_CONDITIONS,
};
