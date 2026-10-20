const { Schema, model, Types } = require('mongoose');

const notificationSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', index: true },
    event: { type: String, required: true },
    channel: { type: String, enum: ['IN_APP', 'WHATSAPP', 'SMS', 'EMAIL'], required: true },
    title: String,
    body: String,
    link: String,
    data: Schema.Types.Mixed,
    to: String,
    status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED', 'SKIPPED'], default: 'QUEUED' },
    provider: String,
    providerRef: String,
    error: String,
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, channel: 1, createdAt: -1 });
notificationSchema.index({ user: 1, channel: 1, readAt: 1 });

module.exports = model('Notification', notificationSchema);
