const { Schema, model } = require('mongoose');

const PROJECT_CATEGORIES = ['FULL_HOME', 'MODULAR_KITCHEN', 'BEDROOM', 'WARDROBE', 'LIVING_ROOM', 'RENOVATION', 'COMMERCIAL'];

const imageSchema = new Schema(
  { url: { type: String, required: true }, alt: String, caption: String, kind: { type: String, enum: ['GALLERY', 'BEFORE', 'AFTER'], default: 'GALLERY' } },
  { _id: false },
);

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, enum: PROJECT_CATEGORIES, required: true, index: true },
    city: String,
    locality: String,
    bhk: String,
    area: Number,
    packageName: String,
    summary: { type: String, maxlength: 500 },
    description: String,
    coverImage: String,
    images: { type: [imageSchema], default: [] },
    tags: { type: [String], default: [] },
    completedOn: Date,
    seo: { title: String, description: String },
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = model('Project', projectSchema);
module.exports.PROJECT_CATEGORIES = PROJECT_CATEGORIES;
