const { Schema, model, Types } = require('mongoose');

// One photo in the website gallery.
const galleryImageSchema = new Schema(
  {
    category: { type: Types.ObjectId, ref: 'GalleryCategory', required: true, index: true },
    image: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 120 },
    alt: { type: String, trim: true, maxlength: 200 },
    isPublished: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = model('GalleryImage', galleryImageSchema);
