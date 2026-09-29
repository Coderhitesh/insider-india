const { ExecutionProject, Booking, User } = require('../models');
const { advance } = require('../services/bookingSync');
const { assertUsable, signedList } = require('../services/mediaService');
const { isContractor } = require('../services/scopeService');
const notifications = require('../services/notifications/notificationService');
const { audit } = require('../services/auditService');
const { logActivity } = require('../services/activityService');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { ok } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { PROJECT_STAGES, CHANNELS } = require('../config/constants');

const STAGE_LABEL = {
  DESIGN: 'Design', DESIGN_APPROVAL: 'Design Approval', MATERIAL_SELECTION: 'Material Selection', PRODUCTION: 'Production',
  SITE_EXECUTION: 'Site Execution', QUALITY_CHECK: 'Quality Check', HANDOVER: 'Handover', COMPLETED: 'Completed',
};

async function view(p, { customer = false } = {}) {
  const o = p.toObject ? p.toObject() : p;
  const updates = (o.updates || []).filter((u) => !customer || u.visibleToCustomer);
  const docs = (o.documents || []).filter((d) => !customer || d.visibleToCustomer);
  const docUrls = await signedList(docs.map((d) => d.media));
  const updateMedia = await signedList(updates.flatMap((u) => u.media || []));
  const byId = new Map([...docUrls, ...updateMedia].map((m) => [m.id, m]));
  return {
    id: String(o._id), projectNumber: o.projectNumber, bookingId: String(o.booking?._id || o.booking),
    bookingNumber: o.booking?.bookingNumber, quotationId: String(o.quotation),
    stage: o.stage, stageLabel: STAGE_LABEL[o.stage], stageIndex: PROJECT_STAGES.indexOf(o.stage) + 1, stageCount: PROJECT_STAGES.length,
    stages: (o.stages || []).map((s) => ({ stage: s.stage, label: STAGE_LABEL[s.stage], startedAt: s.startedAt, completedAt: s.completedAt, ...(customer ? {} : { note: s.note }) })),
    projectManager: o.projectManager?.name ? { name: o.projectManager.name, mobile: o.projectManager.mobile } : null,
    contractor: o.contractor?.name ? { name: o.contractor.name } : null,
    milestones: o.milestones, paymentSchedule: o.paymentSchedule, grandTotal: o.grandTotal,
    updates: updates.sort((a, b) => new Date(b.at) - new Date(a.at)).map((u) => ({
      id: String(u._id), text: u.text, at: u.at, media: (u.media || []).map((m) => byId.get(String(m))).filter(Boolean),
      ...(customer ? {} : { visibleToCustomer: u.visibleToCustomer }),
    })),
    documents: docs.map((d) => ({ title: d.title, visibleToCustomer: customer ? undefined : d.visibleToCustomer, file: byId.get(String(d.media)) || null })),
    startedAt: o.startedAt, completedAt: o.completedAt, createdAt: o.createdAt,
  };
}

const populate = [{ path: 'booking', select: 'bookingNumber' }, { path: 'projectManager', select: 'name mobile' }, { path: 'contractor', select: 'name' }];

async function load(req) {
  const p = await ExecutionProject.findById(req.params.id);
  if (!p) throw ApiError.notFound('Project not found');
  if (isContractor(req.user) && String(p.contractor) !== String(req.user._id)) throw ApiError.notFound('Project not found');
  return p;
}

const notifyCustomer = (p, stageLabel) => notifications.send({
  user: p.customer, event: 'PROJECT_STATUS_UPDATED', channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
  variables: { stage: stageLabel, link: `${env.frontendUrl}/account/projects/${p._id}` }, link: `/account/projects/${p._id}`,
});

// ── Staff ─────────────────────────────────────────────────────
exports.list = asyncHandler(async (req, res) => {
  const filter = isContractor(req.user) ? { contractor: req.user._id } : {};
  if (req.query.stage) filter.stage = String(req.query.stage).toUpperCase();
  const pg = parsePagination(req.query, { maxLimit: 200 });
  const [items, total] = await Promise.all([
    ExecutionProject.find(filter).sort({ updatedAt: -1 }).skip(pg.skip).limit(pg.limit).populate(populate).populate('customer', 'name').lean(),
    ExecutionProject.countDocuments(filter),
  ]);
  ok(res, { items: items.map((p) => ({ id: String(p._id), projectNumber: p.projectNumber, bookingNumber: p.booking?.bookingNumber, customer: p.customer?.name, contractor: p.contractor?.name, projectManager: p.projectManager?.name, stage: p.stage, stageLabel: STAGE_LABEL[p.stage], grandTotal: p.grandTotal, startedAt: p.startedAt, updatedAt: p.updatedAt })) }, 'OK', 200, pageMeta(pg, total));
});

exports.get = asyncHandler(async (req, res) => {
  const p = await load(req);
  await p.populate(populate);
  ok(res, { project: await view(p) });
});

exports.start = asyncHandler(async (req, res) => {
  const p = await load(req);
  if (p.startedAt) throw ApiError.conflict('Project already started', 'ALREADY_STARTED');
  p.startedAt = new Date();
  await p.save();
  const booking = await Booking.findById(p.booking);
  await advance(booking, { status: 'PROJECT_STARTED', event: 'PROJECT_STARTED', by: req.user._id, leadStatus: 'WON' });
  await audit(req, { action: 'PROJECT_STARTED', entityType: 'ExecutionProject', entityId: p._id });
  await logActivity({ booking: p.booking, actor: req.user, type: 'PROJECT_STARTED', message: `${p.projectNumber} started`, visibleToCustomer: true });
  notifyCustomer(p, 'Project Started');
  ok(res, { project: await view(p) }, 'Project started');
});

exports.setStage = asyncHandler(async (req, res) => {
  const p = await load(req);
  if (!p.startedAt) throw ApiError.conflict('Start the project first', 'NOT_STARTED');
  const { stage, note } = req.body;
  if (stage === p.stage) throw ApiError.conflict('Project is already at this stage', 'NO_CHANGE');
  if (p.stage === 'COMPLETED') throw ApiError.conflict('Project is completed', 'COMPLETED');
  const now = new Date();
  const current = p.stages.find((s) => s.stage === p.stage && !s.completedAt);
  if (current) current.completedAt = now;
  const before = p.stage;
  p.stage = stage;
  p.stages.push({ stage, startedAt: now, completedAt: stage === 'COMPLETED' ? now : undefined, note, by: req.user._id });
  if (stage === 'COMPLETED') p.completedAt = now;
  await p.save();

  const booking = await Booking.findById(p.booking);
  if (stage === 'COMPLETED') await advance(booking, { status: 'PROJECT_COMPLETED', event: 'PROJECT_COMPLETED', by: req.user._id });
  else await advance(booking, { status: 'PROJECT_IN_PROGRESS', event: booking.status === 'PROJECT_IN_PROGRESS' ? null : 'PROJECT_IN_PROGRESS', by: req.user._id });
  await audit(req, { action: 'PROJECT_STAGE_CHANGED', entityType: 'ExecutionProject', entityId: p._id, before: { stage: before }, after: { stage }, reason: note });
  await logActivity({ booking: p.booking, actor: req.user, type: 'PROJECT_STATUS_UPDATED', message: `${STAGE_LABEL[before]} → ${STAGE_LABEL[stage]}`, visibleToCustomer: true });
  notifyCustomer(p, STAGE_LABEL[stage]);
  ok(res, { project: await view(p) }, 'Stage updated');
});

exports.update = asyncHandler(async (req, res) => {
  const p = await load(req);
  if (isContractor(req.user)) throw ApiError.forbidden('Only admins can edit project plans and payments');
  const b = req.body;
  const before = { projectManager: p.projectManager, paymentSchedule: p.paymentSchedule?.map((x) => ({ label: x.label, amount: x.amount, status: x.status })) };
  if (b.projectManager !== undefined) {
    if (b.projectManager) {
      const pm = await User.findOne({ _id: b.projectManager, role: { $ne: 'CUSTOMER' }, status: 'ACTIVE' }).select('_id').lean();
      if (!pm) throw ApiError.badRequest('Project manager not found', 'INVALID_USER');
    }
    p.projectManager = b.projectManager || undefined;
  }
  if (b.milestones) p.milestones = b.milestones.map((m) => ({ ...m, completedAt: m.status === 'DONE' ? (p.milestones.id(m._id)?.completedAt || new Date()) : undefined }));
  if (b.paymentSchedule) p.paymentSchedule = b.paymentSchedule.map((x) => ({ ...x, paidAt: x.status === 'PAID' ? (p.paymentSchedule.id(x._id)?.paidAt || new Date()) : undefined }));
  if (b.documents) {
    await assertUsable(b.documents.map((d) => d.media), req.user, ['PROJECT_UPDATE', 'SITE_IMAGE', 'SITE_DOCUMENT'], 'documents');
    p.documents = b.documents;
  }
  await p.save();
  await audit(req, { action: b.paymentSchedule ? 'PROJECT_PAYMENTS_UPDATED' : 'PROJECT_UPDATED', entityType: 'ExecutionProject', entityId: p._id, before, after: { projectManager: p.projectManager, paymentSchedule: p.paymentSchedule?.map((x) => ({ label: x.label, amount: x.amount, status: x.status })) }, reason: b.reason });
  await p.populate(populate);
  ok(res, { project: await view(p) }, 'Project updated');
});

exports.postUpdate = asyncHandler(async (req, res) => {
  const p = await load(req);
  const media = await assertUsable(req.body.media, req.user, ['PROJECT_UPDATE', 'SITE_IMAGE', 'SITE_VIDEO'], 'media');
  p.updates.push({ text: req.body.text, media, visibleToCustomer: req.body.visibleToCustomer, by: req.user._id });
  await p.save();
  await logActivity({ booking: p.booking, actor: req.user, type: 'PROJECT_UPDATE_POSTED', message: req.body.text.slice(0, 140), visibleToCustomer: req.body.visibleToCustomer });
  if (req.body.visibleToCustomer) {
    notifications.send({ user: p.customer, event: 'PROJECT_UPDATE_POSTED', channels: [CHANNELS.IN_APP], variables: { projectNumber: p.projectNumber }, link: `/account/projects/${p._id}` });
  }
  ok(res, { project: await view(p) }, 'Update posted');
});

// ── Customer ─────────────────────────────────────────────────
exports.mine = asyncHandler(async (req, res) => {
  const items = await ExecutionProject.find({ customer: req.user._id }).sort({ createdAt: -1 }).populate('booking', 'bookingNumber').lean();
  ok(res, { items: items.map((p) => ({ id: String(p._id), projectNumber: p.projectNumber, bookingNumber: p.booking?.bookingNumber, stage: p.stage, stageLabel: STAGE_LABEL[p.stage], stageIndex: PROJECT_STAGES.indexOf(p.stage) + 1, stageCount: PROJECT_STAGES.length, startedAt: p.startedAt, completedAt: p.completedAt })) });
});

exports.customerGet = asyncHandler(async (req, res) => {
  const p = await ExecutionProject.findOne({ _id: req.params.id, customer: req.user._id }).populate(populate);
  if (!p) throw ApiError.notFound('Project not found');
  ok(res, { project: await view(p, { customer: true }) });
});
