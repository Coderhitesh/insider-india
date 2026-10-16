const { Schema, model, Types } = require('mongoose');

const REFERRER_TYPES = ['CUSTOMER', 'FRIEND', 'PROPERTY_DEALER', 'BROKER', 'PARTNER', 'OTHER'];

// A person enrolled in Refer & Earn. One per customer account; identified by a unique Referral ID (code).
const referrerSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, trim: true },
    mobile: { type: String, index: true },
    city: String,
    type: { type: String, enum: REFERRER_TYPES, default: 'CUSTOMER' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
    suspendedReason: String,
    termsAcceptedAt: Date,
    // Payout details. Account number and PAN are stored encrypted; only last 4 are shown by default.
    payout: {
      method: { type: String, enum: ['UPI', 'BANK', null], default: null },
      upiId: String,
      accountName: String,
      accountNumberEnc: String,
      accountLast4: String,
      ifsc: String,
      bankName: String,
      panEnc: String,
      panLast4: String,
      updatedAt: Date,
    },
    adminNotes: String,
    walletLockUntil: Date, // short lock while credit is being applied (prevents double spending)
  },
  { timestamps: true },
);

referrerSchema.statics.TYPES = REFERRER_TYPES;

module.exports = model('Referrer', referrerSchema);
