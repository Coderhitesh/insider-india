const { Schema, model } = require('mongoose');

const notificationTemplateSchema = new Schema(
  {
    event: { type: String, required: true },
    channel: { type: String, enum: ['IN_APP', 'WHATSAPP', 'SMS', 'EMAIL'], required: true },
    name: String,
    title: String, // in-app title / email subject
    body: { type: String, required: true }, // {{variable}} placeholders
    // Provider-side template identifiers (WhatsApp approved template name, DLT/flow id, Twilio content SID)
    providerTemplateName: String,
    providerTemplateId: String,
    language: { type: String, default: 'en' },
    variableOrder: { type: [String], default: [] },
    otpButton: { type: Boolean, default: false }, // WhatsApp authentication template with copy-code button
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

notificationTemplateSchema.index({ event: 1, channel: 1 }, { unique: true });

module.exports = model('NotificationTemplate', notificationTemplateSchema);
