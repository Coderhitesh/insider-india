const { Schema, model, Types } = require('mongoose');
const { addressSchema } = require('./shared');
const { SITE_CONDITIONS } = require('../config/constants');

const siteVisitSchema = new Schema(
  {
    booking: { type: Types.ObjectId, ref: 'Booking', required: true, index: true },
    lead: { type: Types.ObjectId, ref: 'Lead', required: true },
    contractor: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    contactPerson: { name: String, mobile: String },
    siteAddress: addressSchema,
    status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED', index: true },
    siteCondition: { type: String, enum: [...SITE_CONDITIONS, null], default: null },
    siteConditionNotes: String,
    notes: String,
    images: [{ type: Types.ObjectId, ref: 'Media' }],
    videos: [{ type: Types.ObjectId, ref: 'Media' }],
    floorPlans: [{ type: Types.ObjectId, ref: 'Media' }],
    documents: [{ type: Types.ObjectId, ref: 'Media' }],
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    rescheduleCount: { type: Number, default: 0 },
    reminderSentAt: { type: Date, default: null },
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

siteVisitSchema.index({ status: 1, scheduledAt: 1, reminderSentAt: 1 });

module.exports = model('SiteVisit', siteVisitSchema);
