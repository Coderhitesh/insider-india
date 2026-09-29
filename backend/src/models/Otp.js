const { Schema, model } = require('mongoose');

const deliverySchema = new Schema(
  { channel: String, status: String, provider: String, providerRef: String, error: String, at: { type: Date, default: Date.now } },
  { _id: false },
);

const otpSchema = new Schema(
  {
    mobile: { type: String, required: true },
    purpose: { type: String, required: true, default: 'LOGIN' },
    codeHash: { type: String, select: false, default: null },
    channel: { type: String, enum: ['SMS', 'WHATSAPP'] },
    expiresAt: Date,
    attempts: { type: Number, default: 0 },
    lastSentAt: Date,
    windowStartedAt: Date,
    sendCount: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    deliveries: { type: [deliverySchema], default: [] },
    ip: String,
    purgeAt: { type: Date, required: true },
  },
  { timestamps: true },
);

otpSchema.index({ mobile: 1, purpose: 1 }, { unique: true });
otpSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('Otp', otpSchema);
