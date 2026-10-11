const { Schema, model, Types } = require('mongoose');
const { addressSchema } = require('./shared');

const contractorProfileSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    contractorCode: { type: String, required: true, unique: true, trim: true },
    photo: { type: Types.ObjectId, ref: 'Media' },
    address: addressSchema,
    city: { type: String, trim: true, index: true },
    serviceAreas: { type: [String], default: [] },
    specializations: { type: [String], default: [] },
    experienceYears: { type: Number, min: 0, max: 80 },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

contractorProfileSchema.index({ serviceAreas: 1 });

module.exports = model('ContractorProfile', contractorProfileSchema);
