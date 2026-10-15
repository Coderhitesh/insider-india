const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

async function logActivity({ lead, booking, quotation, actor, type, message, meta, visibleToCustomer = false }) {
  try {
    await ActivityLog.create({
      lead,
      booking,
      quotation,
      actor: actor?._id || actor,
      actorRole: actor?.role,
      type,
      message,
      meta,
      visibleToCustomer,
    });
  } catch (err) {
    logger.error('Activity log write failed', { type, error: err.message });
  }
}

module.exports = { logActivity };
