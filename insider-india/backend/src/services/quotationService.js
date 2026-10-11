const { Quotation, Booking, User, Package, Media, ExecutionProject } = require('../models');
const settings = require('./settingsService');
const StorageService = require('./storage/StorageService');
const { renderQuotationPdf } = require('./quotationPdf');
const { registerMetric } = require('./dashboardService');
const { assertUsable } = require('./mediaService');
const { compute } = require('./quotationCalc');
const { nextNumber } = require('../utils/sequence');
const ApiError = require('../utils/ApiError');
const { COMPANY_PROFILE, OPERATIONS_CONFIG } = require('../config/defaults');
const { CUSTOMER_VISIBLE_QUOTATION } = require('../config/constants');

const MONEY_FIELDS = ['quantity', 'unitPrice', 'materialPrice', 'labourPrice', 'taxPercent'];

// ── Views ────────────────────────────────────────────────────
function staffView(q, { contractor = false } = {}) {
  const o = q.toObject ? q.toObject() : q;
  return {
    id: String(o._id), quotationNumber: o.quotationNumber, displayNumber: o.displayNumber, version: o.version, isLatest: o.isLatest,
    bookingId: String(o.booking?._id || o.booking), leadId: String(o.lead), customerId: String(o.customer?._id || o.customer),
    contractor: o.contractor?.name ? { id: String(o.contractor._id), name: o.contractor.name } : (o.contractor ? String(o.contractor) : null),
    packageId: o.package ? String(o.package) : null,
    status: o.status, sections: o.sections, discounts: o.discounts, additionalCharges: o.additionalCharges,
    gstPercent: o.gstPercent, paymentSchedule: o.paymentSchedule, validUntil: o.validUntil, totals: o.totals,
    contractorGrandTotal: o.contractorGrandTotal, contractorNotes: o.contractorNotes, adminNotes: o.adminNotes,
    customerNotes: o.customerNotes, customerResponse: o.customerResponse,
    ...(contractor ? {} : { priceChanges: o.priceChanges }),
    hasPdf: Boolean(o.pdf),
    submittedAt: o.submittedAt, reviewedAt: o.reviewedAt, approvedAt: o.approvedAt, sentAt: o.sentAt, viewedAt: o.viewedAt,
    acceptedAt: o.acceptedAt, rejectedAt: o.rejectedAt, revisionRequestedAt: o.revisionRequestedAt, supersededAt: o.supersededAt,
    createdAt: o.createdAt, updatedAt: o.updatedAt,
  };
}

// Customers never see cost splits, internal notes, price-change history or discount reasons.
function customerView(q) {
  const o = q.toObject ? q.toObject() : q;
  return {
    id: String(o._id), displayNumber: o.displayNumber, version: o.version, isLatest: o.isLatest,
    bookingId: String(o.booking?._id || o.booking), status: o.status,
    canRespond: o.isLatest && o.status === 'SENT_TO_CUSTOMER' && (!o.validUntil || new Date(o.validUntil) > new Date()),
    sections: (o.sections || []).map((s) => ({
      id: String(s._id), title: s.title, notes: s.notes, subtotal: s.subtotal,
      items: s.items.map((i) => ({
        id: String(i._id), name: i.name, category: i.category, description: i.description, material: i.material, finish: i.finish,
        dimensions: i.dimensions, length: i.length, width: i.width, height: i.height, quantity: i.quantity, unit: i.unit,
        unitPrice: i.unitPrice, amount: i.amount, notes: i.notes, customFields: i.customFields,
        image: i.image ? String(i.image) : null, referenceImage: i.referenceImage ? String(i.referenceImage) : null,
      })),
    })),
    discounts: (o.discounts || []).map((d) => ({ label: d.label || (d.type === 'PROMOTIONAL' ? 'Promotional discount' : 'Discount'), amount: d.amount })),
    additionalCharges: (o.additionalCharges || []).map((c) => ({ label: c.label, amount: c.amount })),
    gstPercent: o.gstPercent,
    totals: {
      subtotal: o.totals.subtotal, discountTotal: o.totals.discountTotal, additionalCharges: o.totals.additionalCharges,
      taxableAmount: o.totals.taxableAmount, gstAmount: o.totals.gstAmount, roundOff: o.totals.roundOff, grandTotal: o.totals.grandTotal,
    },
    paymentSchedule: o.paymentSchedule, validUntil: o.validUntil, notes: o.customerNotes,
    hasPdf: Boolean(o.pdf), sentAt: o.sentAt, viewedAt: o.viewedAt, acceptedAt: o.acceptedAt, rejectedAt: o.rejectedAt,
    revisionRequestedAt: o.revisionRequestedAt, customerResponse: o.customerResponse,
  };
}

// ── Editing ─────────────────────────────────────────────────
function snapshotItems(q) {
  const m = new Map();
  for (const s of q.sections) for (const i of s.items) m.set(String(i._id), { name: i.name, ...Object.fromEntries(MONEY_FIELDS.map((f) => [f, i[f] ?? null])) });
  return m;
}

function diffItems(before, q) {
  const changes = [];
  const after = snapshotItems(q);
  for (const [id, b] of before) {
    const a = after.get(id);
    if (!a) { changes.push({ itemId: id, itemName: b.name, field: 'ITEM_REMOVED', before: b, after: null }); continue; }
    for (const f of MONEY_FIELDS) if ((b[f] ?? null) !== (a[f] ?? null)) changes.push({ itemId: id, itemName: a.name, field: f, before: b[f], after: a[f] });
  }
  for (const [id, a] of after) if (!before.has(id)) changes.push({ itemId: id, itemName: a.name, field: 'ITEM_ADDED', before: null, after: a });
  return changes;
}

/**
 * Applies a validated edit payload. ctx: { user, isAdmin, canDiscount }
 * Returns list of non-item monetary changes (discounts, GST, charges).
 */
async function applyEdits(q, body, { user, isAdmin, canDiscount }) {
  const extra = [];
  const adminOnly = ['gstPercent', 'paymentSchedule', 'validUntil', 'adminNotes'].filter((f) => body[f] !== undefined);
  if (adminOnly.length && !isAdmin) throw ApiError.forbidden(`Only an admin can change: ${adminOnly.join(', ')}`);
  if ((body.discounts !== undefined || body.waiveMeasurementCharge !== undefined) && !canDiscount) {
    throw ApiError.forbidden('You do not have permission to apply discounts');
  }

  if (body.sections) {
    const known = new Set();
    for (const s of q.sections) { known.add(String(s._id)); for (const i of s.items) known.add(String(i._id)); }
    const mediaIds = [];
    const sections = body.sections.map((s) => {
      const sec = { ...s };
      if (sec._id && !known.has(String(sec._id))) delete sec._id;
      sec.items = s.items.map((i) => {
        const it = { ...i };
        if (it._id && !known.has(String(it._id))) delete it._id;
        if (it.image) mediaIds.push(it.image);
        if (it.referenceImage) mediaIds.push(it.referenceImage);
        return it;
      });
      return sec;
    });
    if (mediaIds.length) await assertUsable(mediaIds, user, ['QUOTATION_ITEM_IMAGE', 'SITE_IMAGE'], 'sections');
    q.sections = sections;
  }

  if (body.additionalCharges) {
    const system = q.additionalCharges.filter((c) => c.system);
    const before = q.totals?.additionalCharges;
    q.additionalCharges = [...system, ...body.additionalCharges.map((c) => ({ ...c, system: null }))];
    extra.push({ field: 'ADDITIONAL_CHARGES', before, after: body.additionalCharges });
  }
  if (body.waiveMeasurementCharge) {
    const had = q.additionalCharges.find((c) => c.system === 'MEASUREMENT_ASSISTANCE');
    if (had) {
      q.additionalCharges = q.additionalCharges.filter((c) => c.system !== 'MEASUREMENT_ASSISTANCE');
      extra.push({ field: 'MEASUREMENT_CHARGE_WAIVED', before: had.amount, after: 0 });
    }
  }
  if (body.discounts) {
    extra.push({ field: 'DISCOUNTS', before: q.discounts.map((d) => ({ type: d.type, mode: d.mode, value: d.value })), after: body.discounts });
    q.discounts = body.discounts.map((d) => ({ ...d, addedBy: user._id }));
  }
  if (body.gstPercent !== undefined && body.gstPercent !== q.gstPercent) {
    extra.push({ field: 'GST_PERCENT', before: q.gstPercent, after: body.gstPercent });
    q.gstPercent = body.gstPercent;
  }
  if (body.paymentSchedule) q.paymentSchedule = body.paymentSchedule;
  if (body.validUntil !== undefined) q.validUntil = body.validUntil || undefined;
  for (const f of ['contractorNotes', 'adminNotes', 'customerNotes']) if (body[f] !== undefined) q[f] = body[f];
  return extra;
}

// ── PDF & send ──────────────────────────────────────────────
async function buildPdf(q) {
  const [booking, customer, contractor, pkg, company] = await Promise.all([
    Booking.findById(q.booking).lean(),
    User.findById(q.customer).select('name mobile email').lean(),
    q.contractor ? User.findById(q.contractor).select('name').lean() : null,
    q.package ? Package.findById(q.package).select('name warranty').lean() : null,
    settings.get('company.profile', COMPANY_PROFILE),
  ]);
  return renderQuotationPdf({
    q, company: { ...COMPANY_PROFILE, ...(company || {}) }, customer: customer || {}, booking,
    contractorName: contractor?.name, packageDoc: pkg, labels: booking?.snapshot?.labels || {},
  });
}

async function storePdf(q, user) {
  const buffer = await buildPdf(q);
  const stored = await StorageService.upload(buffer, { folder: 'quotations', mimeType: 'application/pdf', extension: 'pdf', isPrivate: true });
  return Media.create({
    owner: user._id, provider: stored.provider, key: stored.key, url: null, isPrivate: true, mimeType: 'application/pdf',
    extension: 'pdf', size: stored.size || buffer.length, originalName: `${q.displayNumber}.pdf`, purpose: 'QUOTATION_PDF',
    meta: stored.meta, entityType: 'Quotation', entityId: q._id,
  });
}

async function defaultValidity() {
  const ops = { ...OPERATIONS_CONFIG, ...((await settings.get('operations.config', {})) || {}) };
  return ops.validityDays ? new Date(Date.now() + ops.validityDays * 86400000) : undefined;
}

async function createExecutionProject(q) {
  const exists = await ExecutionProject.findOne({ booking: q.booking }).select('_id').lean();
  if (exists) return exists;
  return ExecutionProject.create({
    projectNumber: await nextNumber('PRJ'),
    booking: q.booking, quotation: q._id, customer: q.customer, contractor: q.contractor,
    stage: 'DESIGN', stages: [{ stage: 'DESIGN', startedAt: new Date() }],
    paymentSchedule: (q.paymentSchedule || []).map((p) => ({ label: p.label, percent: p.percent, amount: p.amount })),
    grandTotal: q.totals.grandTotal,
  });
}

// ── Dashboard metrics ───────────────────────────────────────
registerMetric('quotations', async ({ start, end }, scope) => {
  const match = { isLatest: true, createdAt: { $gte: start, $lte: end }, ...(scope.assignedContractor ? { contractor: scope.assignedContractor } : {}) };
  // Summed in JS (bounded by the date range) so it works on any Mongo-compatible server.
  const docs = await Quotation.find(match).select('status totals.grandTotal').limit(50000).lean();
  const acc = {};
  for (const d of docs) {
    const r = (acc[d.status] ||= { _id: d.status, n: 0, value: 0 });
    r.n += 1;
    r.value += Number(d.totals?.grandTotal) || 0;
  }
  const rows = Object.values(acc);
  const by = Object.fromEntries(rows.map((r) => [r._id, r]));
  const sum = (keys, k) => keys.reduce((s, x) => s + (by[x]?.[k] || 0), 0);
  const sent = sum(CUSTOMER_VISIBLE_QUOTATION, 'n');
  return {
    total: rows.reduce((s, r) => s + r.n, 0),
    draft: by.DRAFT?.n || 0,
    underReview: by.UNDER_ADMIN_REVIEW?.n || 0,
    approved: by.APPROVED?.n || 0,
    sent,
    accepted: by.ACCEPTED?.n || 0,
    rejected: by.REJECTED?.n || 0,
    revisionRequested: by.REVISION_REQUESTED?.n || 0,
    sentValue: sum(CUSTOMER_VISIBLE_QUOTATION, 'value'),
    acceptedValue: by.ACCEPTED?.value || 0,
    acceptanceRate: sent ? Math.round(((by.ACCEPTED?.n || 0) / sent) * 1000) / 10 : 0,
  };
});

module.exports = { staffView, customerView, snapshotItems, diffItems, applyEdits, compute, buildPdf, storePdf, defaultValidity, createExecutionProject };
