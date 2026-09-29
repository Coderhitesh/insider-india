const { Schema, model, Types } = require('mongoose');

const activityLogSchema = new Schema(
  {
    lead: { type: Types.ObjectId, ref: 'Lead', index: true },
    booking: { type: Types.ObjectId, ref: 'Booking', index: true },
    quotation: { type: Types.ObjectId, ref: 'Quotation' },
    actor: { type: Types.ObjectId, ref: 'User' },
    actorRole: String,
    type: { type: String, required: true, index: true },
    message: String,
    meta: Schema.Types.Mixed,
    visibleToCustomer: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ lead: 1, createdAt: -1 });
activityLogSchema.index({ booking: 1, createdAt: -1 });

module.exports = model('ActivityLog', activityLogSchema);
