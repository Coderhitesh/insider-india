const { Schema, model, Types } = require('mongoose');

const estimateRuleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true },
    // ROOM: extra rooms over the size's included count (residential). ADDON: yes/no element.
    // UNIT: counted items priced per unit — chairs/workstations, cabins, cafeteria… (commercial).
    type: { type: String, enum: ['ROOM', 'ADDON', 'UNIT'], required: true },
    appliesTo: { type: String, enum: ['RESIDENTIAL', 'COMMERCIAL', 'BOTH'], default: 'RESIDENTIAL' },
    // Commercial space types this rule is shown for (empty = all types).
    commercialTypes: { type: [String], default: [] },
    unitLabel: String,
    defaultQty: { type: Number, default: 0, min: 0 },
    maxQty: { type: Number, default: 50, min: 1 },
    room: { type: String, enum: ['kitchens', 'bedrooms', 'washrooms', null], default: null },
    mode: { type: String, enum: ['FLAT', 'PERCENT'], default: 'FLAT' },
    min: { type: Number, default: 0, min: 0 },
    max: { type: Number, default: 0, min: 0 },
    packageOverrides: [{ _id: false, package: { type: Types.ObjectId, ref: 'Package' }, min: Number, max: Number }],
    icon: String,
    image: String,
    description: String,
    isDemoValue: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = model('EstimateRule', estimateRuleSchema);
