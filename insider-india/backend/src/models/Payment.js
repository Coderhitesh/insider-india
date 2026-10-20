const { Schema, model, Types } = require('mongoose');

// REFERRAL_CREDIT: paid from the customer's Refer & Earn wallet (not money received).
// COUPON: discount from a coupon code (not money received).
const METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'RAZORPAY', 'REFERRAL_CREDIT', 'COUPON', 'OTHER'];
const NON_CASH = ['REFERRAL_CREDIT', 'COUPON'];

// One money movement against a project. Offline payments are recorded by staff (status RECEIVED at once);
// online payments start as CREATED (Razorpay order) and become RECEIVED after signature/webhook verification.
const paymentSchema = new Schema(
  {
    paymentNumber: { type: String, required: true, unique: true }, // PAY-YYYY-NNNNNN, also the receipt number
    project: { type: Types.ObjectId, ref: 'ExecutionProject', required: true, index: true },
    booking: { type: Types.ObjectId, ref: 'Booking', index: true },
    customer: { type: Types.ObjectId, ref: 'User', index: true },
    scheduleItem: { type: Types.ObjectId }, // ExecutionProject.paymentSchedule[]._id (optional)
    scheduleLabel: String,
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: METHODS, required: true },
    status: { type: String, enum: ['CREATED', 'RECEIVED', 'FAILED', 'VOID'], default: 'RECEIVED', index: true },
    receivedAt: Date,
    reference: String, // UTR / cheque no. / transaction id
    note: String,
    recordedBy: { type: Types.ObjectId, ref: 'User' },
    razorpay: { orderId: { type: String, index: true }, paymentId: String, signature: String, method: String },
    voidedAt: Date,
    voidedBy: { type: Types.ObjectId, ref: 'User' },
    voidReason: String,
    coupon: { type: Types.ObjectId, ref: 'Coupon', index: true },
  },
  { timestamps: true },
);

paymentSchema.statics.METHODS = METHODS;
paymentSchema.statics.NON_CASH = NON_CASH;

module.exports = model('Payment', paymentSchema);
