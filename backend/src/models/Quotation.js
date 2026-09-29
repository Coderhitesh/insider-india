const { Schema, model, Types } = require('mongoose');
const { QUOTATION_STATUS } = require('../config/constants');

const n = { type: Number, default: 0 };

// QuotationItem
const itemSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, trim: true, maxlength: 80 },
  description: { type: String, maxlength: 2000 },
  material: { type: String, maxlength: 200 },
  finish: { type: String, maxlength: 200 },
  dimensions: { type: String, maxlength: 120 },
  length: Number,
  width: Number,
  height: Number,
  quantity: { type: Number, default: 1, min: 0 },
  unit: { type: String, default: 'PCS' },
  unitPrice: n,
  materialPrice: n,
  labourPrice: n,
  taxPercent: { type: Number, default: null }, // null → quotation GST
  notes: { type: String, maxlength: 1000 },
  image: { type: Types.ObjectId, ref: 'Media' },
  referenceImage: { type: Types.ObjectId, ref: 'Media' },
  customFields: [{ _id: false, label: String, value: String }],
  // computed server-side
  materialTotal: n,
  labourTotal: n,
  amount: n,
  discountShare: n,
  taxableAmount: n,
  taxAmount: n,
  total: n,
});

// QuotationSection
const sectionSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, trim: true, maxlength: 80 },
  notes: { type: String, maxlength: 2000 },
  items: { type: [itemSchema], default: [] },
  subtotal: n,
});

const discountSchema = new Schema({
  type: { type: String, enum: ['ADMIN', 'PROMOTIONAL'], required: true },
  mode: { type: String, enum: ['PERCENT', 'FLAT'], required: true },
  value: { type: Number, required: true, min: 0 },
  label: String,
  reason: String,
  amount: n,
  addedBy: { type: Types.ObjectId, ref: 'User' },
});

const chargeSchema = new Schema({
  label: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  taxable: { type: Boolean, default: true },
  system: { type: String, default: null }, // e.g. MEASUREMENT_ASSISTANCE
});

const priceChangeSchema = new Schema({
  itemId: Types.ObjectId,
  itemName: String,
  field: String,
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  reason: String,
  by: { type: Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
}, { _id: false });

/**
 * One document per version (QuotationVersion). quotationNumber is shared across versions;
 * displayNumber = QT-YYYY-NNNNNN-Vn. Older versions are never modified after being superseded.
 */
const quotationSchema = new Schema(
  {
    quotationNumber: { type: String, required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    displayNumber: { type: String, required: true, unique: true },
    isLatest: { type: Boolean, default: true },
    previousVersion: { type: Types.ObjectId, ref: 'Quotation' },

    booking: { type: Types.ObjectId, ref: 'Booking', required: true },
    lead: { type: Types.ObjectId, ref: 'Lead', required: true },
    customer: { type: Types.ObjectId, ref: 'User', required: true },
    contractor: { type: Types.ObjectId, ref: 'User', index: true },
    measurement: { type: Types.ObjectId, ref: 'Measurement' },
    package: { type: Types.ObjectId, ref: 'Package' },

    sections: { type: [sectionSchema], default: [] },
    discounts: { type: [discountSchema], default: [] },
    additionalCharges: { type: [chargeSchema], default: [] },
    gstPercent: { type: Number, default: 18, min: 0, max: 28 },
    paymentSchedule: [{ _id: false, label: String, percent: Number, amount: Number }],
    validUntil: Date,

    totals: {
      materialTotal: n, labourTotal: n, subtotal: n, discountTotal: n, additionalCharges: n,
      measurementAssistanceCharge: n, taxableAmount: n, gstAmount: n, roundOff: n, grandTotal: n,
    },
    contractorGrandTotal: Number, // snapshot when contractor submitted

    contractorNotes: { type: String, maxlength: 5000 },
    adminNotes: { type: String, maxlength: 5000 },
    customerNotes: { type: String, maxlength: 5000 }, // shown to customer / printed on PDF
    customerResponse: { note: String, at: Date },

    status: { type: String, enum: QUOTATION_STATUS, default: 'DRAFT', index: true },
    priceChanges: { type: [priceChangeSchema], default: [] },

    createdBy: { type: Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Types.ObjectId, ref: 'User' },
    approvedBy: { type: Types.ObjectId, ref: 'User' },
    sentBy: { type: Types.ObjectId, ref: 'User' },

    submittedAt: Date,
    reviewedAt: Date,
    approvedAt: Date,
    sentAt: Date,
    viewedAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    revisionRequestedAt: Date,
    supersededAt: Date,

    pdf: { type: Types.ObjectId, ref: 'Media' },
    pdfGeneratedAt: Date,
  },
  { timestamps: true },
);

quotationSchema.index({ quotationNumber: 1, version: 1 }, { unique: true });
quotationSchema.index({ booking: 1 }, { unique: true, partialFilterExpression: { isLatest: true } });
quotationSchema.index({ status: 1, updatedAt: -1 });
quotationSchema.index({ booking: 1, version: -1 });
quotationSchema.index({ customer: 1, sentAt: -1 });

module.exports = model('Quotation', quotationSchema);
