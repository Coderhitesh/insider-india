const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

async function audit(req, { action, entityType, entityId, before, after, reason, meta, actor, role } = {}) {
  try {
    await AuditLog.create({
      actor: actor || req?.user?._id,
      role: role || req?.user?.role,
      action,
      entityType,
      entityId,
      before,
      after,
      reason,
      meta,
      ip: req?.ip,
      userAgent: req?.get?.('user-agent'),
    });
  } catch (err) {
    logger.error('Audit log write failed', { action, error: err.message });
  }
}

module.exports = { audit };
