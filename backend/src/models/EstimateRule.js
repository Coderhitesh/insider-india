const { Schema, model, Types } = require('mongoose');

const estimateRuleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['ROOM', 'ADDON'], required: true },
    room: { type: String, enum: ['kitchens', 'bedrooms', 'washrooms', null], default: null },
    mode: { type: String, enum: ['FLAT', 'PERCENT'], default: 'FLAT' },
    min: { type: Number, default: 0, min: 0 },
    max: { type: Number, default: 0, min: 0 },
    packageOverrides: [{ _id: false, package: { type: Types.ObjectId, ref: 'Package' }, min: Number, max: Number }],
    icon: String,
    image: String,
    description: String,
    isDemoValue: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = model('EstimateRule', estimateRuleSchema);
