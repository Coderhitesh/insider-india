const { Package, Service, EstimateRule, NotificationTemplate, Project, Testimonial, Faq, Estimate, Booking, Lead, User, Notification, Media, AuditLog } = require('../../models');
const { crud } = require('./crudFactory');
const v = require('../../validations/admin');
const StorageService = require('../../services/storage/StorageService');
const { audit } = require('../../services/auditService');
const { parseRange } = require('../../utils/dateRange');
const { escapeRegex } = require('../../utils/text');
const { parsePagination, pageMeta } = require('../../utils/pagination');
const { ok } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

// Financial fields — every change is written to the audit log with before/after.
exports.packages = crud({
  Model: Package, entityType: 'Package', createSchema: v.packageSchemas.create, updateSchema: v.packageSchemas.update,
  searchFields: ['name', 'slug'], slugFrom: 'name',
  auditFields: ['name', 'slug', 'pricing', 'areaRate', 'warranty', 'features', 'isActive', 'isRecommended'],
  inUse: async (d) => Boolean((await Estimate.exists({ 'results.package': d._id })) || (await Booking.exists({ package: d._id }))),
});

exports.services = crud({
  Model: Service, entityType: 'Service', createSchema: v.serviceSchemas.create, updateSchema: v.serviceSchemas.update,
  searchFields: ['title', 'slug'], slugFrom: 'title',
  filters: (q) => (q.context === 'booking' ? { showInBooking: true } : {}),
  inUse: async (d) => Boolean((await Lead.exists({ services: d._id })) || (await Booking.exists({ 'snapshot.services.service': d._id }))),
});

exports.estimateRules = crud({
  Model: EstimateRule, entityType: 'EstimateRule', createSchema: v.ruleSchemas.create, updateSchema: v.ruleSchemas.update,
  searchFields: ['key', 'label'], auditFields: ['key', 'label', 'type', 'room', 'mode', 'min', 'max', 'packageOverrides', 'isActive'],
  filters: (q) => (q.type ? { type: q.type } : {}),
  inUse: async (d) => Boolean(await Estimate.exists({ 'inputs.addons': d.key })),
});

exports.templates = crud({
  Model: NotificationTemplate, entityType: 'NotificationTemplate', createSchema: v.templateSchemas.create, updateSchema: v.templateSchemas.update,
  searchFields: ['event', 'name', 'body'], sort: { event: 1, channel: 1 },
  filters: (q) => ({ ...(q.event ? { event: q.event } : {}), ...(q.channel ? { channel: q.channel } : {}) }),
});

exports.projects = crud({
  Model: Project, entityType: 'Project', createSchema: v.projectSchemas.create, updateSchema: v.projectSchemas.update,
  searchFields: ['title', 'city', 'locality'], slugFrom: 'title',
  filters: (q) => (q.category ? { category: q.category } : {}),
});

exports.testimonials = crud({
  Model: Testimonial, entityType: 'Testimonial', createSchema: v.testimonialSchemas.create, updateSchema: v.testimonialSchemas.update,
  searchFields: ['name', 'city', 'quote'],
});

exports.faqs = crud({
  Model: Faq, entityType: 'Faq', createSchema: v.faqSchemas.create, updateSchema: v.faqSchemas.update,
  searchFields: ['question', 'answer'], filters: (q) => (q.category ? { category: String(q.category).toUpperCase() } : {}),
});

// ── Manual in-app notification ────────────────────────────────
exports.sendNotification = asyncHandler(async (req, res) => {
  const { userIds, title, body, link } = req.body;
  const users = await User.find({ _id: { $in: userIds }, status: 'ACTIVE' }).select('_id').lean();
  if (!users.length) throw ApiError.badRequest('No active recipients', 'NO_RECIPIENTS');
  await Notification.insertMany(users.map((u) => ({ user: u._id, event: 'ADMIN_MESSAGE', channel: 'IN_APP', title, body, link, status: 'SENT' })));
  await audit(req, { action: 'NOTIFICATION_SENT', entityType: 'Notification', meta: { recipients: users.length, title } });
  ok(res, { sent: users.length }, `Sent to ${users.length} user(s)`);
});

exports.notificationLog = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { maxLimit: 200, defaultLimit: 50 });
  const filter = {};
  for (const f of ['event', 'channel', 'status']) if (req.query[f]) filter[f] = String(req.query[f]);
  if (req.query.user) filter.user = req.query.user;
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('user', 'name mobile role').lean(),
    Notification.countDocuments(filter),
  ]);
  ok(res, { items: items.map((n) => ({ id: String(n._id), user: n.user ? { id: String(n.user._id), name: n.user.name, role: n.user.role } : null, event: n.event, channel: n.channel, status: n.status, to: n.to, provider: n.provider, error: n.error, title: n.title, createdAt: n.createdAt })) }, 'OK', 200, pageMeta(pg, total));
});

// ── Audit log ─────────────────────────────────────────────────
exports.auditLogs = asyncHandler(async (req, res) => {
  const q = req.query;
  const pg = parsePagination(q, { maxLimit: 200, defaultLimit: 50 });
  const filter = {};
  if (q.action) filter.action = new RegExp(`^${escapeRegex(String(q.action).toUpperCase())}`);
  if (q.entityType) filter.entityType = String(q.entityType);
  if (q.entityId && /^[a-f\d]{24}$/i.test(q.entityId)) filter.entityId = q.entityId;
  if (q.actor && /^[a-f\d]{24}$/i.test(q.actor)) filter.actor = q.actor;
  if (q.range || q.from || q.to) { const { start, end } = parseRange(q, 'all'); filter.createdAt = { $gte: start, $lte: end }; }
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('actor', 'name email role').lean(),
    AuditLog.countDocuments(filter),
  ]);
  ok(res, {
    items: items.map((a) => ({
      id: String(a._id), action: a.action, entityType: a.entityType, entityId: a.entityId ? String(a.entityId) : null,
      actor: a.actor ? { id: String(a.actor._id), name: a.actor.name, email: a.actor.email } : null, role: a.role,
      before: a.before, after: a.after, reason: a.reason, meta: a.meta, ip: a.ip, userAgent: a.userAgent, createdAt: a.createdAt,
    })),
  }, 'OK', 200, pageMeta(pg, total));
});

// ── Uploads ───────────────────────────────────────────────────
exports.uploads = asyncHandler(async (req, res) => {
  const q = req.query;
  const pg = parsePagination(q, { maxLimit: 200, defaultLimit: 50 });
  const filter = { deletedAt: q.deleted === 'true' ? { $ne: null } : null };
  if (q.purpose) filter.purpose = String(q.purpose).toUpperCase();
  if (q.provider) filter.provider = String(q.provider).toUpperCase();
  if (q.owner && /^[a-f\d]{24}$/i.test(q.owner)) filter.owner = q.owner;
  const [items, total] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('owner', 'name role').lean(),
    Media.countDocuments(filter),
  ]);
  const withUrls = await Promise.all(items.map(async (m) => ({
    id: String(m._id), originalName: m.originalName, mimeType: m.mimeType, size: m.size, purpose: m.purpose, provider: m.provider,
    isPrivate: m.isPrivate, owner: m.owner ? { id: String(m.owner._id), name: m.owner.name, role: m.owner.role } : null,
    url: m.deletedAt ? null : await StorageService.getUrl(m).catch(() => null), deletedAt: m.deletedAt, createdAt: m.createdAt,
  })));
  ok(res, { items: withUrls }, 'OK', 200, pageMeta(pg, total));
});
