const path = require('path');
const env = require('../config/env');

// Files served by this API live under FILES_PREFIX. In the database we keep only the path
// ("/api/v1/files/public/…"), never the host, so a domain/port change never breaks images.
const FILES_PREFIX = '/api/v1/files/';
const ABSOLUTE_FILE_URL = /^https?:\/\/[^/\s]+(\/api\/v1\/files\/[^\s]*)$/i;

/** "http://localhost:5991/api/v1/files/public/x.jpg" → "/api/v1/files/public/x.jpg"; anything else unchanged. */
function toStoredPath(value) {
  if (typeof value !== 'string') return value;
  const m = value.trim().match(ABSOLUTE_FILE_URL);
  return m ? m[1] : value;
}

/** Deep-normalises every string in a plain object/array (used on API responses and the migration). */
function normalizeDeep(value, seen = new WeakSet()) {
  if (typeof value === 'string') return toStoredPath(value);
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) return value;
  if (value._bsontype) return value; // ObjectId, Decimal128 …
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => normalizeDeep(v, seen));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = normalizeDeep(v, seen);
  return out;
}

/** Absolute URL for server-side consumers (WhatsApp/email links). */
function toAbsolute(value) {
  if (typeof value !== 'string' || !value.startsWith(FILES_PREFIX)) return value;
  return `${env.apiPublicUrl}${value}`;
}

/** Local disk path for a public stored file path, or null. */
function localPublicFile(value) {
  const p = toStoredPath(value);
  if (typeof p !== 'string' || !p.startsWith(`${FILES_PREFIX}public/`)) return null;
  const key = decodeURIComponent(p.slice(FILES_PREFIX.length).split('?')[0]);
  const file = path.resolve(env.localStorageDir, key);
  return file.startsWith(path.resolve(env.localStorageDir) + path.sep) ? file : null;
}

module.exports = { FILES_PREFIX, toStoredPath, normalizeDeep, toAbsolute, localPublicFile };
