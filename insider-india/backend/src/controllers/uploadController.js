const path = require('path');
const FileType = require('file-type');
const { Media, Lead } = require('../models');
const StorageService = require('../services/storage/StorageService');
const rbac = require('../services/rbacService');
const { audit } = require('../services/auditService');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { UPLOAD_PURPOSES, EXT_BY_MIME } = require('../config/constants');
const settings = require('../services/settingsService');
const { OPERATIONS_CONFIG } = require('../config/defaults');

const mediaView = (m, url) => ({
  id: String(m._id),
  originalName: m.originalName,
  mimeType: m.mimeType,
  size: m.size,
  purpose: m.purpose,
  isPrivate: m.isPrivate,
  url: url ?? (m.isPrivate ? null : m.url),
  createdAt: m.createdAt,
});

const safeName = (name) => path.basename(String(name || 'file')).replace(/[^\w.\- ]+/g, '_').slice(0, 150);

exports.upload = asyncHandler(async (req, res) => {
  const purpose = String(req.body.purpose || '').toUpperCase();
  const cfg = UPLOAD_PURPOSES[purpose];
  if (!cfg) throw ApiError.badRequest('Invalid upload purpose', 'INVALID_PURPOSE');
  if (!req.file) throw ApiError.badRequest('Please choose a file', 'FILE_REQUIRED');

  if (cfg.permission) {
    const perms = await rbac.getEffectivePermissions(req.user);
    if (!rbac.hasPermission(perms, cfg.permission)) throw ApiError.forbidden();
  }
  if (cfg.setting) {
    const ops = { ...OPERATIONS_CONFIG, ...((await settings.get('operations.config', {})) || {}) };
    if (!ops[cfg.setting]) throw ApiError.forbidden('This upload type is disabled', 'UPLOAD_DISABLED');
  }
  if (req.file.size > cfg.maxMb * 1024 * 1024) throw new ApiError(413, `File must be under ${cfg.maxMb} MB`, 'FILE_TOO_LARGE');

  // Trust magic bytes, not the client-declared mimetype.
  const detected = await FileType.fromBuffer(req.file.buffer);
  if (!detected || !cfg.mimes.includes(detected.mime)) {
    throw new ApiError(415, `Unsupported file type for ${purpose.toLowerCase().replace(/_/g, ' ')}`, 'FILE_TYPE_NOT_ALLOWED');
  }
  const declaredExt = path.extname(req.file.originalname || '').slice(1).toLowerCase();
  if (!EXT_BY_MIME[detected.mime].includes(declaredExt)) {
    throw new ApiError(415, 'File extension does not match its content', 'FILE_EXTENSION_MISMATCH');
  }

  let stored;
  try {
    stored = await StorageService.upload(req.file.buffer, {
      folder: purpose.toLowerCase().replace(/_/g, '-'),
      mimeType: detected.mime,
      extension: detected.ext,
      isPrivate: cfg.isPrivate,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error('Storage upload failed', { error: err.message, purpose });
    throw new ApiError(502, 'Upload failed. Please try again.', 'UPLOAD_FAILED');
  }

  const media = await Media.create({
    owner: req.user._id,
    provider: stored.provider,
    key: stored.key,
    url: stored.url,
    isPrivate: cfg.isPrivate,
    mimeType: detected.mime,
    extension: detected.ext,
    size: stored.size || req.file.size,
    originalName: safeName(req.file.originalname),
    purpose,
    meta: stored.meta,
  });

  const url = media.isPrivate ? await StorageService.getUrl(media).catch(() => null) : media.url;
  created(res, { media: mediaView(media, url) }, 'Uploaded');
});

async function loadOwnedOrStaff(req, id, permission) {
  const media = await Media.findOne({ _id: id, deletedAt: null });
  if (!media) throw ApiError.notFound('File not found');
  if (String(media.owner) !== String(req.user._id)) {
    const perms = await rbac.getEffectivePermissions(req.user);
    if (!rbac.hasPermission(perms, permission)) throw ApiError.notFound('File not found');
  }
  return media;
}

exports.getUrl = asyncHandler(async (req, res) => {
  const media = await loadOwnedOrStaff(req, req.params.id, 'bookings.view');
  const url = await StorageService.getUrl(media, { expiresInSeconds: 900 });
  ok(res, { url, expiresIn: media.isPrivate ? 900 : null });
});

exports.remove = asyncHandler(async (req, res) => {
  const media = await loadOwnedOrStaff(req, req.params.id, 'settings.manage');

  // Files attached to a submitted booking are part of the record and can't be removed by the customer.
  const lockedLead = await Lead.findOne({ 'floorPlan.media': media._id, booking: { $ne: null } }).select('_id').lean();
  if (lockedLead && String(media.owner) === String(req.user._id)) {
    throw ApiError.conflict('This file is part of a submitted booking and cannot be removed', 'MEDIA_LOCKED');
  }

  await Lead.updateMany({ 'floorPlan.media': media._id, booking: null }, { $pull: { 'floorPlan.media': media._id } });
  media.deletedAt = new Date();
  await media.save();
  try {
    await StorageService.delete(media);
  } catch (err) {
    logger.error('Storage delete failed (record soft-deleted)', { media: String(media._id), error: err.message });
  }
  if (String(media.owner) !== String(req.user._id)) {
    await audit(req, { action: 'MEDIA_DELETED', entityType: 'Media', entityId: media._id, before: { owner: media.owner, purpose: media.purpose } });
  }
  ok(res, {}, 'File removed');
});
