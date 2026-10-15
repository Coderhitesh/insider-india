// Customer-facing wording for internal statuses.
export const BOOKING_STATUS = {
  CONFIRMED: ['Request received', 'neutral'],
  CONTRACTOR_ASSIGNED: ['Expert assigned', 'neutral'],
  SITE_VISIT_SCHEDULED: ['Site visit scheduled', 'action'],
  SITE_VISIT_COMPLETED: ['Site visit done', 'neutral'],
  QUOTATION_IN_PROGRESS: ['Preparing quotation', 'neutral'],
  QUOTATION_SENT: ['Quotation ready', 'action'],
  QUOTATION_ACCEPTED: ['Quotation accepted', 'good'],
  QUOTATION_REJECTED: ['Quotation declined', 'muted'],
  PROJECT_STARTED: ['Project started', 'good'],
  PROJECT_IN_PROGRESS: ['Project in progress', 'good'],
  PROJECT_COMPLETED: ['Completed', 'good'],
  CANCELLED: ['Cancelled', 'muted'],
};

export const QUOTATION_STATUS = {
  SENT_TO_CUSTOMER: ['Awaiting your response', 'action'],
  ACCEPTED: ['Accepted', 'good'],
  REJECTED: ['Declined', 'muted'],
  REVISION_REQUESTED: ['Revision requested', 'neutral'],
};

export const PROJECT_STAGES = [
  ['DESIGN', 'Design'], ['DESIGN_APPROVAL', 'Design approval'], ['MATERIAL_SELECTION', 'Material selection'], ['PRODUCTION', 'Production'],
  ['SITE_EXECUTION', 'Site execution'], ['QUALITY_CHECK', 'Quality check'], ['HANDOVER', 'Handover'], ['COMPLETED', 'Completed'],
];

export const UNIT = { FT: 'ft', INCH: 'in', SQFT: 'sq ft', RFT: 'running ft', MM: 'mm', CM: 'cm', M: 'm', SQM: 'sq m', PCS: 'pc' };

export const TIMELINE_EXPECTED = [
  ['REQUIREMENT_SUBMITTED', 'Requirement submitted'], ['MOBILE_VERIFIED', 'Mobile verified'], ['BOOKING_CONFIRMED', 'Booking confirmed'],
  ['CONTRACTOR_ASSIGNED', 'Expert assigned'], ['SITE_VISIT_SCHEDULED', 'Site visit scheduled'], ['SITE_VISIT_COMPLETED', 'Site visit completed'],
  ['MEASUREMENTS_RECORDED', 'Measurements recorded'], ['QUOTATION_SENT', 'Quotation sent to you'], ['QUOTATION_ACCEPTED', 'Quotation accepted'],
  ['PROJECT_STARTED', 'Project started'], ['PROJECT_IN_PROGRESS', 'Project in progress'], ['PROJECT_COMPLETED', 'Project completed'],
];
