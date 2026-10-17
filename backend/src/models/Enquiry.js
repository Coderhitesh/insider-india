const { Schema, model, Types } = require('mongoose');

const ENQUIRY_TOPICS = ['GENERAL', 'NEW_PROJECT', 'EXISTING_PROJECT', 'COMMERCIAL', 'PARTNERSHIP', 'CAREERS', 'FEEDBACK', 'OTHER'];
const ENQUIRY_STATUS = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];

// General enquiries from the Contact page (not the booking funnel).
const enquirySchema = new Schema(
  {
    enquiryNumber: { type: String, required: true, unique: true }, // ENQ-YYYY-NNNNNN
    name: { type: String, required: true, trim: true, maxlength: 120 },
    mobile: { type: String, required: true, index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 80 },
    topic: { type: String, enum: ENQUIRY_TOPICS, default: 'GENERAL', index: true },
    message: { type: String, required: true, maxlength: 3000 },
    preferredContact: { type: String, enum: ['CALL', 'WHATSAPP', 'EMAIL'], default: 'CALL' },
    status: { type: String, enum: ENQUIRY_STATUS, default: 'NEW', index: true },
    assignedTo: { type: Types.ObjectId, ref: 'User' },
    notes: [{ _id: false, text: String, by: { type: Types.ObjectId, ref: 'User' }, byName: String, at: { type: Date, default: Date.now } }],
    user: { type: Types.ObjectId, ref: 'User' },
    page: String,
    utm: { source: String, medium: String, campaign: String, term: String, content: String },
    resolvedAt: Date,
  },
  { timestamps: true },
);
enquirySchema.index({ createdAt: -1 });
enquirySchema.statics.TOPICS = ENQUIRY_TOPICS;
enquirySchema.statics.STATUS = ENQUIRY_STATUS;

module.exports = model('Enquiry', enquirySchema);
