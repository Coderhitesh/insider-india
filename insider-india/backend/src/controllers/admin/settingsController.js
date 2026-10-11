const settings = require('../../services/settingsService');
const StorageService = require('../../services/storage/StorageService');
const { getProvider, PROVIDERS } = require('../../services/notifications/registry');
const { audit } = require('../../services/auditService');
const { SETTINGS_SCHEMAS, SUPER_ADMIN_KEYS, PUBLIC_KEYS } = require('../../validations/settings');
const D = require('../../config/defaults');
const env = require('../../config/env');
const { normalizeMobile } = require('../../utils/phone');
const { ok } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const DEFAULTS = {
  'company.profile': D.COMPANY_PROFILE, 'site.stats': D.SITE_STATS, 'funnel.options': D.FUNNEL_OPTIONS,
  'estimate.config': D.ESTIMATE_CONFIG, 'otp.config': D.OTP_CONFIG, 'pricing.config': D.PRICING_CONFIG, 'maps.config': D.MAPS_CONFIG, 'operations.config': D.OPERATIONS_CONFIG,
  storage: env.bootstrap.storage,
  'providers.sms': { active: 'LOG', msg91: { authKey: '', senderId: '' }, twilio: { accountSid: '', authToken: '', from: '' } },
  'providers.whatsapp': { active: 'LOG', meta: { accessToken: '', phoneNumberId: '', apiVersion: 'v20.0' }, interakt: { apiKey: '' }, gupshup: { apiKey: '', source: '', appName: '' }, twilio: { accountSid: '', authToken: '', from: '' } },
  'providers.email': { active: 'LOG', smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '' } },
};

const assertKey = (key) => { if (!SETTINGS_SCHEMAS[key]) throw ApiError.notFound('Unknown setting'); };
const assertAccess = (req, key) => {
  if (SUPER_ADMIN_KEYS.includes(key) && req.user.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only a Super Admin can view or change this setting');
};
const merged = async (key) => {
  const d = DEFAULTS[key];
  const v = await settings.get(key, null);
  return v && typeof v === 'object' && !Array.isArray(v) ? { ...d, ...v } : v ?? d;
};

exports.list = asyncHandler(async (req, res) => {
  const keys = Object.keys(SETTINGS_SCHEMAS).filter((k) => req.user.role === 'SUPER_ADMIN' || !SUPER_ADMIN_KEYS.includes(k));
  ok(res, { keys, superAdminOnly: SUPER_ADMIN_KEYS, providers: PROVIDERS, logProvidersAllowed: env.allowLogProviders });
});

exports.get = asyncHandler(async (req, res) => {
  const { key } = req.params;
  assertKey(key);
  assertAccess(req, key);
  ok(res, { key, value: settings.redact(key, await merged(key)) });
});

exports.update = asyncHandler(async (req, res) => {
  const { key } = req.params;
  assertKey(key);
  assertAccess(req, key);
  const parsed = SETTINGS_SCHEMAS[key].safeParse(req.body.value);
  if (!parsed.success) throw ApiError.validation(parsed.error);
  const value = parsed.data;

  if (key.startsWith('providers.') && value.active === 'LOG' && !env.allowLogProviders) {
    throw ApiError.badRequest('LOG provider is not allowed in production', 'LOG_PROVIDER_BLOCKED');
  }

  const before = settings.redact(key, await merged(key));
  const saved = await settings.set(key, value, { userId: req.user._id, group: key.split('.')[0], isPublic: PUBLIC_KEYS.includes(key) });
  const after = settings.redact(key, saved);
  await audit(req, { action: 'SETTINGS_UPDATED', entityType: 'Setting', before: { key, value: before }, after: { key, value: after }, reason: req.body.reason, meta: { key } });
  ok(res, { key, value: after }, 'Settings saved');
});

// 1×1 transparent PNG used to verify storage credentials end-to-end.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

exports.testStorage = asyncHandler(async (req, res) => {
  const started = Date.now();
  try {
    const stored = await StorageService.upload(PNG, { folder: 'healthcheck', mimeType: 'image/png', extension: 'png', isPrivate: true });
    const media = { ...stored, isPrivate: true, extension: 'png' };
    const url = await StorageService.getUrl(media, { expiresInSeconds: 60 });
    await StorageService.delete(media);
    await audit(req, { action: 'STORAGE_TESTED', entityType: 'Setting', meta: { provider: stored.provider, ok: true } });
    ok(res, { ok: true, provider: stored.provider, signedUrl: Boolean(url), ms: Date.now() - started }, 'Storage is working');
  } catch (err) {
    await audit(req, { action: 'STORAGE_TESTED', entityType: 'Setting', meta: { ok: false, error: err.message } });
    throw new ApiError(502, `Storage test failed: ${err.message}`, 'STORAGE_TEST_FAILED');
  }
});

exports.testProvider = asyncHandler(async (req, res) => {
  const { kind } = req.params;
  if (!['sms', 'whatsapp', 'email'].includes(kind)) throw ApiError.notFound('Unknown provider type');
  const to = kind === 'email' ? String(req.body.to || '').trim().toLowerCase() : normalizeMobile(req.body.to);
  if (!to || (kind === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))) throw ApiError.badRequest(kind === 'email' ? 'Enter a valid email' : 'Enter a valid mobile number');

  const provider = await getProvider(kind);
  const body = 'This is a test message from INSIDER INDIA LLP admin settings.';
  const template = kind === 'whatsapp' && req.body.templateName ? { name: String(req.body.templateName), language: 'en', variables: [] } : undefined;
  const r = await provider.send({ to, subject: 'Provider test', body, template });
  await audit(req, { action: 'PROVIDER_TESTED', entityType: 'Setting', meta: { kind, provider: provider.name, ok: r.ok, error: r.error } });
  if (!r.ok) throw new ApiError(502, `Test failed (${provider.name}): ${r.error || 'unknown error'}`, 'PROVIDER_TEST_FAILED');
  ok(res, { ok: true, provider: provider.name, providerRef: r.providerRef }, 'Test message sent');
});
