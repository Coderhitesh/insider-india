const { Schema, model } = require('mongoose');

const roleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z][A-Z0-9_]{1,40}$/ },
    name: { type: String, required: true, trim: true },
    description: String,
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    isStaff: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = model('Role', roleSchema);
