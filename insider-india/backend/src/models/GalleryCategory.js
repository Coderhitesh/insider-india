const { Schema, model } = require('mongoose');

// Gallery category (Full home, Modular kitchen, Bedroom …). Managed in Admin → Website content → Gallery.
const galleryCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 600 },
    coverImage: String,
    seo: { title: String, description: String },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = model('GalleryCategory', galleryCategorySchema);
