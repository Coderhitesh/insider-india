const { Schema, model, Types } = require('mongoose');

const testimonialSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    city: String,
    quote: { type: String, required: true, maxlength: 1500 },
    rating: { type: Number, min: 1, max: 5 },
    photo: String,
    project: { type: Types.ObjectId, ref: 'Project' },
    isPublished: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = model('Testimonial', testimonialSchema);
