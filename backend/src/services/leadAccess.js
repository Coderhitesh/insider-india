const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const { hmac, safeEqualHex } = require('../utils/crypto');

// Anonymous leads are accessed with the x-lead-token issued at creation;
// once verified, only the owning user (access token) can access them.
async function loadLeadForAccess(req, id, { token } = {}) {
  const lead = await Lead.findById(id).select('+resumeTokenHash');
  if (!lead) throw ApiError.notFound('Your session could not be found. Please start again.', 'LEAD_NOT_FOUND');
  if (lead.user) {
    if (!req.user || String(req.user._id) !== String(lead.user)) {
      throw ApiError.forbidden('Please verify your mobile number to continue', 'LEAD_AUTH_REQUIRED');
    }
    return lead;
  }
  const raw = token || req.get('x-lead-token');
  if (!raw || !lead.resumeTokenHash || !safeEqualHex(hmac(`lead:${raw}`), lead.resumeTokenHash)) {
    throw ApiError.forbidden('Your session has expired. Please start again.', 'LEAD_TOKEN_INVALID');
  }
  return lead;
}

module.exports = { loadLeadForAccess };
