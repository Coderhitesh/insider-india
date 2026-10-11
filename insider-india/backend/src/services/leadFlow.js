const { BOOKING_STEPS } = require('../config/constants');

function isStepComplete(lead, step) {
  const addr = lead.property?.address || {};
  switch (step) {
    case 'BASIC_INFO': return Boolean(lead.name && lead.mobile);
    case 'REQUIREMENT': return Boolean(lead.requirementType);
    case 'BUDGET': return Boolean(lead.budgetRange);
    case 'POSSESSION': return Boolean(lead.possession);
    case 'OTP': return Boolean(lead.user && lead.verifiedAt);
    case 'LOCATION': return Boolean(addr.formattedAddress && addr.pincode);
    case 'PROPERTY_TYPE': return Boolean(lead.property?.propertyType);
    case 'BHK': return Boolean(lead.property?.bhk);
    case 'PROJECT_TYPE': return Boolean(lead.projectType);
    case 'SERVICES': return (lead.services || []).length > 0;
    case 'FLOOR_PLAN': {
      const fp = lead.floorPlan || {};
      if (fp.hasFloorPlan === true) return (fp.media || []).length > 0;
      if (fp.hasFloorPlan === false) return typeof fp.measurementAssistance?.opted === 'boolean';
      return false;
    }
    default: return false;
  }
}

// First incomplete step, 'REVIEW' when ready to submit, 'SUBMITTED' once booked.
function computeNextStep(lead) {
  if (lead.booking) return 'SUBMITTED';
  return BOOKING_STEPS.find((s) => !isStepComplete(lead, s)) || 'REVIEW';
}

const stepIndex = (step) => BOOKING_STEPS.indexOf(step) + 1;

module.exports = { isStepComplete, computeNextStep, stepIndex };
