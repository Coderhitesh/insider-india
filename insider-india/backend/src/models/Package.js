const { Schema, model } = require('mongoose');

// PackagePricing: BHK-specific indicative range (INR).
const packagePricingSchema = new Schema(
  { bhk: { type: String, required: true }, min: { type: Number, required: true, min: 0 }, max: { type: Number, required: true, min: 0 } },
  { _id: false },
);

const packageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    headline: String,
    description: String,
    features: { type: [String], default: [] },
    warranty: { years: Number, text: String },
    image: String,
    accent: { type: String, default: '' }, // design token e.g. "sand", "wine", "brass"
    pricing: { type: [packagePricingSchema], default: [] },
    // Used for Custom Area / Commercial estimates; leave empty for "price on request".
    areaRate: { minPerSqft: Number, maxPerSqft: Number },
    isRecommended: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

packageSchema.pre('validate', function validateRanges(next) {
  for (const p of this.pricing || []) {
    if (p.min > p.max) return next(new Error(`Pricing for ${p.bhk}: min cannot exceed max`));
  }
  const r = this.areaRate || {};
  if (r.minPerSqft && r.maxPerSqft && r.minPerSqft > r.maxPerSqft) return next(new Error('Area rate min cannot exceed max'));
  return next();
});

module.exports = model('Package', packageSchema);
