const { BOOKING_STEPS } = require('../config/constants');

const isCommercial = (lead) => lead.propertyCategory === 'COMMERCIAL';
const commercialType = (lead) => lead.property?.commercialType || lead.estimateDraft?.commercialType;

function isStepComplete(lead, step) {
  const addr = lead.property?.address || {};
  switch (step) {
    case 'BASIC_INFO': return Boolean(lead.name && lead.mobile);
    // Answered explicitly, or known from the estimator / an older request that already chose a home requirement.
    case 'SPACE': return (lead.stepsCompleted || []).includes('SPACE') || Boolean(lead.estimate || lead.estimateDraft?.propertyCategory || lead.requirementType);
    case 'REQUIREMENT': return isCommercial(lead) || Boolean(lead.requirementType);
    case 'COMMERCIAL_DETAILS': return !isCommercial(lead) || Boolean(commercialType(lead) && lead.property?.area > 0);
    case 'POSSESSION': return Boolean(lead.possession);
    case 'OTP': return Boolean(lead.user && lead.verifiedAt);
    case 'LOCATION': return Boolean(addr.formattedAddress && addr.pincode);
    // Commercial spaces (from the estimator) have no home type / BHK — those steps are skipped.
    case 'PROPERTY_TYPE': return isCommercial(lead) || Boolean(lead.property?.propertyType);
    case 'BHK': return isCommercial(lead) || Boolean(lead.property?.bhk);
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

module.exports = { isStepComplete, computeNextStep, stepIndex, isCommercial, commercialType };
