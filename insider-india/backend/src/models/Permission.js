const { Schema, model } = require('mongoose');

const permissionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    group: { type: String, required: true },
    description: String,
    isSystem: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = model('Permission', permissionSchema);
