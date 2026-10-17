const { Enquiry } = require('../models');
const notifications = require('../services/notifications/notificationService');
const { audit } = require('../services/auditService');
const { nextNumber } = require('../utils/sequence');
const { normalizeMobile } = require('../utils/phone');
const { escapeRegex } = require('../utils/text');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const view = (e) => ({
  id: String(e._id), enquiryNumber: e.enquiryNumber, name: e.name, mobile: e.mobile, email: e.email || null, city: e.city || null,
  topic: e.topic, message: e.message, preferredContact: e.preferredContact, status: e.status,
  assignedTo: e.assignedTo?._id ? { id: String(e.assignedTo._id), name: e.assignedTo.name } : null,
  notes: (e.notes || []).map((n) => ({ text: n.text, by: n.byName, at: n.at })),
  page: e.page || null, utm: e.utm, createdAt: e.createdAt, resolvedAt: e.resolvedAt || null,
});

/** Public: Contact page form. Honeypot + rate limit + duplicate guard (same number + message within 10 minutes). */
exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  if (b.website) return created(res, { enquiryNumber: null }, 'Thank you! We will get back to you shortly.'); // bot filled the hidden field
  const mobile = normalizeMobile(b.mobile);
  if (!mobile) throw new ApiError(422, 'Enter a valid 10-digit mobile number', 'VALIDATION_ERROR', [{ field: 'mobile', message: 'Invalid mobile number' }]);
  const dup = await Enquiry.findOne({ mobile, message: b.message, createdAt: { $gte: new Date(Date.now() - 10 * 60000) } }).select('enquiryNumber').lean();
  if (dup) return ok(res, { enquiryNumber: dup.enquiryNumber }, 'We already have your message. Our team will get back to you shortly.');
  const e = await Enquiry.create({
    enquiryNumber: await nextNumber('ENQ'), name: b.name, mobile, email: b.email || undefined, city: b.city, topic: b.topic,
    message: b.message, preferredContact: b.preferredContact, user: req.user?._id, page: b.page, utm: b.utm,
  });
  notifications.notifyStaff({
    event: 'ENQUIRY_RECEIVED', link: `/admin/enquiries?open=${e._id}`, data: { enquiryId: String(e._id) },
    variables: { title: `New enquiry ${e.enquiryNumber}`, body: `${e.name} (+91 ${e.mobile}): ${e.message.slice(0, 120)}` },
  });
  created(res, { enquiryNumber: e.enquiryNumber }, 'Thank you! We have received your message and will get back to you shortly.');
});

// ── Staff ──
exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = {};
  if (q.status && Enquiry.STATUS.includes(String(q.status))) filter.status = String(q.status);
  if (q.topic && Enquiry.TOPICS.includes(String(q.topic))) filter.topic = String(q.topic);
  if (q.q) {
    const rx = new RegExp(escapeRegex(String(q.q).slice(0, 80)), 'i');
    filter.$or = [{ enquiryNumber: rx }, { name: rx }, { mobile: rx }, { email: rx }, { message: rx }];
  }
  const pg = parsePagination(q, { maxLimit: 200 });
  const [items, total, counts] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('assignedTo', 'name').lean(),
    Enquiry.countDocuments(filter),
    Enquiry.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  ok(res, { items: items.map(view), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) }, 'OK', 200, pageMeta(pg, total));
});

exports.get = asyncHandler(async (req, res) => {
  const e = await Enquiry.findById(req.params.id).populate('assignedTo', 'name').lean();
  if (!e) throw ApiError.notFound('Enquiry not found');
  ok(res, { enquiry: view(e) });
});

exports.update = asyncHandler(async (req, res) => {
  const e = await Enquiry.findById(req.params.id);
  if (!e) throw ApiError.notFound('Enquiry not found');
  const b = req.body;
  const before = { status: e.status };
  if (b.status && b.status !== e.status) {
    e.status = b.status;
    e.resolvedAt = b.status === 'RESOLVED' ? new Date() : undefined;
    e.notes.push({ text: `Status → ${b.status.replace('_', ' ').toLowerCase()}`, by: req.user._id, byName: req.user.name });
  }
  if (b.assignedTo !== undefined) e.assignedTo = b.assignedTo || undefined;
  if (b.note) e.notes.push({ text: b.note, by: req.user._id, byName: req.user.name });
  await e.save();
  await audit(req, { action: 'ENQUIRY_UPDATED', entityType: 'Enquiry', entityId: e._id, before, after: { status: e.status }, reason: b.note });
  await e.populate('assignedTo', 'name');
  ok(res, { enquiry: view(e.toObject()) }, 'Enquiry updated');
});
