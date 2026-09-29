const { Schema, model, Types } = require('mongoose');

const adjustmentSchema = new Schema({ key: String, label: String, type: String, qty: Number, min: Number, max: Number }, { _id: false });

const resultSchema = new Schema(
  {
    package: { type: Types.ObjectId, ref: 'Package' },
    packageName: String,
    packageSlug: String,
    available: Boolean,
    reason: String,
    basis: String,
    baseMin: Number,
    baseMax: Number,
    adjustments: [adjustmentSchema],
    finalMin: Number,
    finalMax: Number,
    warranty: { years: Number, text: String },
  },
  { _id: false },
);

const estimateSchema = new Schema(
  {
    estimateNumber: { type: String, required: true, unique: true },
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    lead: { type: Types.ObjectId, ref: 'Lead', index: true },
    inputs: {
      propertyCategory: String,
      bhk: String,
      area: Number,
      kitchens: Number,
      bedrooms: Number,
      washrooms: Number,
      addons: [String],
    },
    results: [resultSchema],
    selectedPackage: { type: Types.ObjectId, ref: 'Package' },
    baseMin: Number,
    baseMax: Number,
    adjustments: [adjustmentSchema],
    finalMin: Number,
    finalMax: Number,
    disclaimer: String,
  },
  { timestamps: true },
);

module.exports = model('Estimate', estimateSchema);
