const { Note, Lead, Booking, Media } = require('../../models');
const rbac = require('../../services/rbacService');
const { assertAssigned, isContractor } = require('../../services/scopeService');
const { logActivity } = require('../../services/activityService');
const { audit } = require('../../services/auditService');
const { ok, created } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

async function loadParent(req) {
  const { type, id } = req.params;
  const Model = type === 'leads' ? Lead : Booking;
  const doc = await Model.findById(id).select('assignedContractor lead').lean();
  if (!doc) throw ApiError.notFound('Record not found');
  assertAssigned(req.user, doc);
  const perms = await rbac.getEffectivePermissions(req.user);
  if (!rbac.hasPermission(perms, type === 'leads' ? 'leads.view' : 'bookings.view')) throw ApiError.forbidden();
  return { doc, field: type === 'leads' ? 'lead' : 'booking' };
}

const view = (n) => ({
  id: String(n._id), text: n.text, visibility: n.visibility, attachments: n.attachments || [],
  createdBy: n.createdBy ? { id: String(n.createdBy._id || n.createdBy), name: n.createdBy.name, role: n.createdBy.role } : null,
  createdAt: n.createdAt,
});

exports.list = asyncHandler(async (req, res) => {
  const { doc, field } = await loadParent(req);
  const filter = { [field]: doc._id, deletedAt: null, ...(isContractor(req.user) ? { visibility: 'STAFF' } : {}) };
  const notes = await Note.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name role').populate('attachments', 'originalName mimeType size').lean();
  ok(res, { items: notes.map(view) });
});

exports.create = asyncHandler(async (req, res) => {
  const { doc, field } = await loadParent(req);
  const { text, attachments } = req.body;
  const visibility = isContractor(req.user) ? 'STAFF' : req.body.visibility;
  if (attachments.length) {
    const count = await Media.countDocuments({ _id: { $in: attachments }, owner: req.user._id, deletedAt: null });
    if (count !== new Set(attachments).size) throw ApiError.badRequest('One or more attachments are invalid', 'INVALID_ATTACHMENT');
  }
  const note = await Note.create({ [field]: doc._id, text, attachments, visibility, createdBy: req.user._id, createdByRole: req.user.role });
  await logActivity({ lead: field === 'lead' ? doc._id : doc.lead, booking: field === 'booking' ? doc._id : undefined, actor: req.user, type: 'NOTE_ADDED', message: 'Internal note added' });
  await note.populate('createdBy', 'name role');
  created(res, { note: view(note.toObject()) }, 'Note added');
});

exports.remove = asyncHandler(async (req, res) => {
  await loadParent(req);
  const note = await Note.findOne({ _id: req.params.noteId, deletedAt: null });
  if (!note) throw ApiError.notFound('Note not found');
  const perms = await rbac.getEffectivePermissions(req.user);
  const own = String(note.createdBy) === String(req.user._id);
  if (!own && !rbac.hasPermission(perms, 'leads.delete')) throw ApiError.forbidden('You can only delete your own notes');
  note.deletedAt = new Date();
  await note.save();
  await audit(req, { action: 'NOTE_DELETED', entityType: 'Note', entityId: note._id, before: { text: note.text } });
  ok(res, {}, 'Note deleted');
});
