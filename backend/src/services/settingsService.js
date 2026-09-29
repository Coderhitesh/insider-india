const { EventEmitter } = require('events');
const Setting = require('../models/Setting');
const { encrypt, decrypt } = require('../utils/crypto');

// Fields stored encrypted at rest and never returned to clients.
const SECRET_PATHS = {
  storage: ['cloudinary.apiSecret', 's3.secretAccessKey'],
  'providers.sms': ['msg91.authKey', 'twilio.authToken'],
  'providers.whatsapp': ['meta.accessToken', 'interakt.apiKey', 'gupshup.apiKey', 'twilio.authToken'],
  'providers.email': ['smtp.pass'],
};

const CACHE_TTL_MS = 30000;
const cache = new Map();
const events = new EventEmitter();

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  });
  o[keys[keys.length - 1]] = value;
}

const isMasked = (v) => typeof v === 'string' && v.startsWith('••••');

function transformSecrets(key, value, fn) {
  const paths = SECRET_PATHS[key];
  if (!paths || value == null || typeof value !== 'object') return value;
  const out = structuredClone(value);
  for (const p of paths) {
    const v = getPath(out, p);
    if (v !== undefined && v !== null && v !== '') setPath(out, p, fn(v));
  }
  return out;
}

async function get(key, fallback = null) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return structuredClone(hit.value);
  const doc = await Setting.findOne({ key }).lean();
  const value = doc ? transformSecrets(key, doc.value, decrypt) : fallback;
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value == null ? value : structuredClone(value);
}

async function exists(key) {
  return !!(await Setting.exists({ key }));
}

// Incoming masked/empty secret values keep the previously stored secret.
async function set(key, value, { userId, group, isPublic } = {}) {
  const current = (await get(key, {})) || {};
  const merged = structuredClone(value);
  for (const p of SECRET_PATHS[key] || []) {
    const incoming = getPath(merged, p);
    if (incoming === undefined || incoming === '' || isMasked(incoming)) setPath(merged, p, getPath(current, p) ?? '');
  }
  const update = { value: transformSecrets(key, merged, encrypt), updatedBy: userId };
  if (group) update.group = group;
  if (isPublic !== undefined) update.isPublic = isPublic;
  await Setting.findOneAndUpdate({ key }, { $set: update }, { upsert: true });
  cache.delete(key);
  events.emit('changed', key);
  return merged;
}

function redact(key, value) {
  const paths = SECRET_PATHS[key];
  if (!paths || value == null) return value;
  const out = structuredClone(value);
  for (const p of paths) {
    const v = getPath(out, p);
    if (v) setPath(out, p, `••••${String(v).slice(-4)}`);
  }
  return out;
}

async function getPublic() {
  const docs = await Setting.find({ isPublic: true }).lean();
  return Object.fromEntries(docs.map((d) => [d.key, d.value]));
}

const onChange = (fn) => events.on('changed', fn);
const clearCache = () => cache.clear();

module.exports = { get, set, exists, redact, getPublic, onChange, clearCache, SECRET_PATHS };
