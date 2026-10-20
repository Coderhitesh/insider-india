const { Schema, model, Types } = require('mongoose');

// Internal notes — never exposed to customers.
// visibility: STAFF = admins + assigned contractor; ADMIN_ONLY = admins only.
const noteSchema = new Schema(
  {
    lead: { type: Types.ObjectId, ref: 'Lead', index: true },
    booking: { type: Types.ObjectId, ref: 'Booking', index: true },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: [{ type: Types.ObjectId, ref: 'Media' }],
    visibility: { type: String, enum: ['STAFF', 'ADMIN_ONLY'], default: 'STAFF' },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
    createdByRole: String,
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('Note', noteSchema);
