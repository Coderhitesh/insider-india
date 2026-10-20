const { Schema, model } = require('mongoose');

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    logo: { type: String, required: true },
    website: String,
    isPublished: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = model('Brand', brandSchema);
