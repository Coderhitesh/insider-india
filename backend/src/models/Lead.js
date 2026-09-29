const { Schema, model, Types } = require('mongoose');
const { addressSchema } = require('./shared');
const { LEAD_STATUS } = require('../config/constants');

const leadSchema = new Schema(
  {
    leadNumber: { type: String, required: true, unique: true },
    user: { type: Types.ObjectId, ref: 'User', index: true, default: null },
    flow: { type: String, enum: ['BOOKING', 'ESTIMATE'], required: true },
    source: { type: String, default: 'WEBSITE' },
    name: { type: String, trim: true, maxlength: 120 },
    mobile: { type: String, required: true, index: true },
    city: { type: String, trim: true, maxlength: 80 },
    status: { type: String, enum: LEAD_STATUS, default: 'NEW', index: true },
    currentStep: { type: String, default: 'BASIC_INFO' },
    stepsCompleted: { type: [String], default: [] },
    requirementType: String,
    budgetRange: String,
    possession: String,
    propertyCategory: { type: String, enum: ['RESIDENTIAL', 'COMMERCIAL'], default: 'RESIDENTIAL' },
    property: {
      address: addressSchema,
      propertyType: String,
      bhk: String,
      area: Number,
    },
    projectType: String,
    services: [{ type: Types.ObjectId, ref: 'Service' }],
    floorPlan: {
      hasFloorPlan: { type: Boolean, default: null },
      media: [{ type: Types.ObjectId, ref: 'Media' }],
      measurementAssistance: {
        opted: { type: Boolean, default: null },
        charge: { type: Number, default: 0 },
        confirmedAt: Date,
      },
    },
    estimateDraft: { type: Schema.Types.Mixed },
    estimate: { type: Types.ObjectId, ref: 'Estimate' },
    booking: { type: Types.ObjectId, ref: 'Booking' },
    assignedContractor: { type: Types.ObjectId, ref: 'User', index: true },
    assignedAdmin: { type: Types.ObjectId, ref: 'User', index: true },
    assignment: { assignedBy: { type: Types.ObjectId, ref: 'User' }, assignedAt: Date, remarks: String },
    lostReason: { type: String, maxlength: 500 },
    utm: { source: String, medium: String, campaign: String, term: String, content: String },
    referrer: String,
    landingPage: String,
    resumeTokenHash: { type: String, select: false },
    verifiedAt: Date,
    bookedAt: Date,
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, minimize: false },
);

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ city: 1 });
leadSchema.index({ 'property.address.city': 1 });
leadSchema.index({ 'property.bhk': 1 });
leadSchema.index({ mobile: 1, createdAt: -1 });

module.exports = model('Lead', leadSchema);
