const { Schema, model, Types } = require('mongoose');
const { PROJECT_STAGES } = require('../config/constants');

// Post-acceptance project execution (distinct from the CMS portfolio `Project`).
const executionProjectSchema = new Schema(
  {
    projectNumber: { type: String, required: true, unique: true },
    booking: { type: Types.ObjectId, ref: 'Booking', required: true, unique: true },
    quotation: { type: Types.ObjectId, ref: 'Quotation', required: true },
    customer: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    contractor: { type: Types.ObjectId, ref: 'User', index: true },
    projectManager: { type: Types.ObjectId, ref: 'User' },
    stage: { type: String, enum: PROJECT_STAGES, default: 'DESIGN', index: true },
    stages: [{ _id: false, stage: String, startedAt: Date, completedAt: Date, note: String, by: { type: Types.ObjectId, ref: 'User' } }],
    milestones: [{ title: { type: String, required: true }, dueDate: Date, status: { type: String, enum: ['PENDING', 'DONE'], default: 'PENDING' }, completedAt: Date }],
    paymentSchedule: [{ label: String, percent: Number, amount: Number, dueOn: Date, status: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' }, paidAt: Date, reference: String }],
    updates: [{
      text: { type: String, required: true, maxlength: 3000 },
      media: [{ type: Types.ObjectId, ref: 'Media' }],
      visibleToCustomer: { type: Boolean, default: true },
      by: { type: Types.ObjectId, ref: 'User' },
      at: { type: Date, default: Date.now },
    }],
    documents: [{ _id: false, media: { type: Types.ObjectId, ref: 'Media' }, title: String, visibleToCustomer: { type: Boolean, default: true } }],
    grandTotal: Number,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

module.exports = model('ExecutionProject', executionProjectSchema);
