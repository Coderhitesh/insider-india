const { Schema, model } = require('mongoose');

// Discount codes customers can apply to their project balance (Payments section).
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 200 },
    type: { type: String, enum: ['PERCENT', 'FLAT'], required: true },
    value: { type: Number, required: true, min: 0 }, // % or ₹
    maxDiscount: { type: Number, min: 0 }, // cap for PERCENT coupons (₹)
    minProjectValue: { type: Number, min: 0, default: 0 },
    appliesTo: { type: String, enum: ['ALL', 'RESIDENTIAL', 'COMMERCIAL'], default: 'ALL' },
    validFrom: Date,
    validTo: Date,
    usageLimit: { type: Number, min: 0 }, // total uses; empty = unlimited
    perCustomerLimit: { type: Number, min: 1, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

module.exports = model('Coupon', couponSchema);
