const { Schema, model, Types } = require('mongoose');

const customerProfileSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    city: { type: String, trim: true },
    source: { type: String, default: 'WEBSITE' },
    utm: { source: String, medium: String, campaign: String, term: String, content: String },
    preferredChannel: { type: String, enum: ['WHATSAPP', 'SMS', 'CALL'], default: 'WHATSAPP' },
    marketingConsent: { type: Boolean, default: false },
    consentAt: Date,
  },
  { timestamps: true },
);

module.exports = model('CustomerProfile', customerProfileSchema);
