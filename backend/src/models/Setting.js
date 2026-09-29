const { Schema, model, Types } = require('mongoose');

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed },
    group: { type: String, default: 'general' },
    isPublic: { type: Boolean, default: false },
    updatedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false },
);

module.exports = model('Setting', settingSchema);
