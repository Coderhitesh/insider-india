const { Schema, model, Types } = require('mongoose');

const mediaSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['CLOUDINARY', 'S3', 'LOCAL'], required: true },
    key: { type: String, required: true },
    url: String, // only for public media; private URLs are signed on demand
    isPrivate: { type: Boolean, default: true },
    mimeType: String,
    extension: String,
    size: Number,
    originalName: String,
    purpose: { type: String, required: true, index: true },
    meta: Schema.Types.Mixed,
    entityType: String,
    entityId: Types.ObjectId,
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

module.exports = model('Media', mediaSchema);
