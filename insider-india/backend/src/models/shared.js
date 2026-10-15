const { Schema } = require('mongoose');

const addressSchema = new Schema(
  {
    formattedAddress: { type: String, trim: true, maxlength: 500 },
    placeId: { type: String, trim: true, maxlength: 300 },
    lat: Number,
    lng: Number,
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    pincode: { type: String, trim: true, maxlength: 10 },
  },
  { _id: false },
);

module.exports = { addressSchema };
