const { Schema, model, Types } = require('mongoose');
const { addressSchema } = require('./shared');
const { BOOKING_STATUS } = require('../config/constants');

const timelineSchema = new Schema({
  event: { type: String, required: true },
  label: String,
  at: { type: Date, default: Date.now },
  by: { type: Types.ObjectId, ref: 'User' },
  visibleToCustomer: { type: Boolean, default: true },
  meta: Schema.Types.Mixed,
});

const bookingSchema = new Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    lead: { type: Types.ObjectId, ref: 'Lead', required: true, unique: true },
    customer: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    property: { type: Types.ObjectId, ref: 'Property' },
    snapshot: {
      name: String,
      mobile: String,
      address: addressSchema,
      requirementType: String,
      budgetRange: String,
      possession: String,
      propertyType: String,
      bhk: String,
      projectType: String,
      services: [{ _id: false, service: { type: Types.ObjectId, ref: 'Service' }, title: String }],
      labels: Schema.Types.Mixed,
    },
    floorPlan: {
      hasFloorPlan: Boolean,
      media: [{ type: Types.ObjectId, ref: 'Media' }],
      measurementAssistance: { opted: Boolean, charge: { type: Number, default: 0 } },
    },
    estimate: { type: Types.ObjectId, ref: 'Estimate' },
    package: { type: Types.ObjectId, ref: 'Package' },
    status: { type: String, enum: BOOKING_STATUS, default: 'CONFIRMED', index: true },
    assignedContractor: { type: Types.ObjectId, ref: 'User', index: true },
    assignedAdmin: { type: Types.ObjectId, ref: 'User' },
    assignment: { assignedBy: { type: Types.ObjectId, ref: 'User' }, assignedAt: Date, remarks: String },
    assignmentHistory: [{
      _id: false,
      contractor: { type: Types.ObjectId, ref: 'User' },
      assignedBy: { type: Types.ObjectId, ref: 'User' },
      assignedAt: Date,
      remarks: String,
      unassignedAt: Date,
    }],
    siteVisitAt: Date,
    timeline: { type: [timelineSchema], default: [] },
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true },
);

bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ 'snapshot.address.city': 1 });

module.exports = model('Booking', bookingSchema);
