const { Schema, model, Types } = require('mongoose');
const { addressSchema } = require('./shared');

const propertySchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: ['RESIDENTIAL', 'COMMERCIAL'], default: 'RESIDENTIAL' },
    address: addressSchema,
    propertyType: String,
    bhk: String,
    area: Number,
  },
  { timestamps: true },
);

module.exports = model('Property', propertySchema);
