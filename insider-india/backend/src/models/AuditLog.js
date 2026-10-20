const { Schema, model, Types } = require('mongoose');

const auditLogSchema = new Schema(
  {
    actor: { type: Types.ObjectId, ref: 'User', index: true },
    role: String,
    action: { type: String, required: true, index: true },
    entityType: { type: String, index: true },
    entityId: { type: Types.ObjectId },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    reason: String,
    meta: Schema.Types.Mixed,
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = model('AuditLog', auditLogSchema);
