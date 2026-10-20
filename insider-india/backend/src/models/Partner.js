const { Schema, model } = require('mongoose');

// Brand partner logos shown in the scrolling strip above the website footer.
const partnerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    logo: { type: String, required: true },
    url: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = model('Partner', partnerSchema);
