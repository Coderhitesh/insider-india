const { Schema, model, Types } = require('mongoose');
const { MEASUREMENT_UNITS, ROOM_TYPES } = require('../config/constants');

const rowSchema = new Schema({
  label: { type: String, required: true, trim: true, maxlength: 200 },
  width: Number,
  height: Number,
  length: Number,
  area: Number,
  quantity: { type: Number, default: 1 },
  unit: { type: String, enum: MEASUREMENT_UNITS, required: true },
  notes: String,
});

const roomSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ROOM_TYPES, default: 'CUSTOM' },
  notes: String,
  rows: { type: [rowSchema], default: [] },
});

// One measurement sheet per booking; FINAL sheets are locked and required before quotation submission.
const measurementSchema = new Schema(
  {
    booking: { type: Types.ObjectId, ref: 'Booking', required: true, unique: true },
    lead: { type: Types.ObjectId, ref: 'Lead', required: true },
    siteVisit: { type: Types.ObjectId, ref: 'SiteVisit' },
    recordedBy: { type: Types.ObjectId, ref: 'User', required: true },
    rooms: { type: [roomSchema], default: [] },
    notes: String,
    status: { type: String, enum: ['DRAFT', 'FINAL'], default: 'DRAFT' },
    finalizedAt: Date,
    finalizedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

module.exports = model('Measurement', measurementSchema);
