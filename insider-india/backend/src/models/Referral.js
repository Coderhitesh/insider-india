const { Schema, model, Types } = require('mongoose');

// Progress order. Statuses up to ADVANCE_RECEIVED move forward automatically from the linked booking;
// REWARD_APPROVED / REWARD_PAID are set by staff. REJECTED / WITHHELD are terminal-ish (can be reopened by staff).
const REFERRAL_STATUS = [
  'SUBMITTED', 'VERIFIED', 'CONTACTED', 'SITE_VISIT_DONE', 'QUOTATION_SHARED', 'AGREEMENT_SIGNED', 'ADVANCE_RECEIVED',
  'REWARD_APPROVED', 'REWARD_PAID', 'REJECTED', 'WITHHELD',
];

const referralSchema = new Schema(
  {
    referralNumber: { type: String, required: true, unique: true },
    referrer: { type: Types.ObjectId, ref: 'Referrer', required: true, index: true },
    referrerUser: { type: Types.ObjectId, ref: 'User', index: true },
    // SIGNUP: the customer registered with the referrer's code / link. ADMIN: attached by staff. FORM/LINK: legacy.
    source: { type: String, enum: ['SIGNUP', 'ADMIN', 'FORM', 'LINK'], default: 'SIGNUP' },
    since: Date, // bookings made on/after this date count (registration date)
    customer: {
      name: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, index: true },
      city: String,
      propertyType: String,
      budget: String,
      notes: String,
    },
    consentAt: Date,

    lead: { type: Types.ObjectId, ref: 'Lead' },
    customerUser: { type: Types.ObjectId, ref: 'User' },
    booking: { type: Types.ObjectId, ref: 'Booking', index: true },
    quotation: { type: Types.ObjectId, ref: 'Quotation' },
    project: { type: Types.ObjectId, ref: 'ExecutionProject' },
    linkedManually: { type: Boolean, default: false },

    status: { type: String, enum: REFERRAL_STATUS, default: 'SUBMITTED', index: true },
    checks: { duplicate: Boolean, duplicateReason: String, checkedAt: Date },
    rejectReason: String,
    withheldReason: String,

    // Locked when the referral qualifies (advance received / agreement signed per settings).
    qualifiedAt: Date,
    projectValue: Number,
    valueBasis: String,
    slabKey: String,
    slabLabel: String,
    level: Number,
    rewardCalculated: Number,
    rewardAmount: Number,
    payableBy: Date,

    approvedAt: Date,
    approvedBy: { type: Types.ObjectId, ref: 'User' },
    approvalNote: String,

    paidAt: Date,
    paidBy: { type: Types.ObjectId, ref: 'User' },
    payout: { method: String, reference: String, tdsAmount: Number, netAmount: Number, details: String },
    recoveryReview: { type: Boolean, default: false },

    timeline: [{ _id: false, status: String, at: { type: Date, default: Date.now }, by: { type: Types.ObjectId, ref: 'User' }, note: String, auto: Boolean }],
  },
  { timestamps: true },
);

referralSchema.statics.STATUS = REFERRAL_STATUS;

module.exports = model('Referral', referralSchema);
