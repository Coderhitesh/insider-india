const { Media } = require('../models');
const StorageService = require('./storage/StorageService');
const { ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');

// Validates media ids for attachment: must exist, not be deleted, match purpose,
// and be owned by the actor (admins may attach any file).
async function assertUsable(ids, user, purposes, field = 'media') {
  const unique = [...new Set((ids || []).map(String))];
  if (!unique.length) return [];
  const filter = { _id: { $in: unique }, deletedAt: null };
  if (purposes) filter.purpose = { $in: purposes };
  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role)) filter.owner = user._id;
  const found = await Media.countDocuments(filter);
  if (found !== unique.length) throw new ApiError(422, 'One or more files are invalid. Please re-upload.', 'VALIDATION_ERROR', [{ field, message: 'Invalid file' }]);
  return unique;
}

async function signedList(ids) {
  if (!ids?.length) return [];
  const media = await Media.find({ _id: { $in: ids }, deletedAt: null }).lean();
  return Promise.all(media.map(async (m) => ({
    id: String(m._id), originalName: m.originalName, mimeType: m.mimeType, size: m.size,
    url: await StorageService.getUrl(m).catch(() => null),
  })));
}

module.exports = { assertUsable, signedList };
