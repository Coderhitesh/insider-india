const settings = require('../settingsService');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');

const SMS = { LOG: require('./providers/sms/log'), MSG91: require('./providers/sms/msg91'), TWILIO: require('./providers/sms/twilio') };
const WHATSAPP = {
  LOG: require('./providers/whatsapp/log'),
  META: require('./providers/whatsapp/meta'),
  INTERAKT: require('./providers/whatsapp/interakt'),
  GUPSHUP: require('./providers/whatsapp/gupshup'),
  TWILIO: require('./providers/whatsapp/twilio'),
};
const EMAIL = { LOG: require('./providers/email/log'), SMTP: require('./providers/email/smtp') };

const cache = new Map();
settings.onChange((key) => { if (key.startsWith('providers.')) cache.clear(); });

async function build(kind, factories) {
  const cfg = (await settings.get(`providers.${kind}`, {})) || {};
  const active = String(cfg.active || 'LOG').toUpperCase();
  if (active === 'LOG' && !env.allowLogProviders) {
    throw ApiError.unavailable(`No ${kind.toUpperCase()} provider configured`, 'PROVIDER_NOT_CONFIGURED');
  }
  const factory = factories[active];
  if (!factory) throw ApiError.unavailable(`Unknown ${kind} provider ${active}`, 'PROVIDER_UNKNOWN');
  const sub = cfg[active.toLowerCase()] || {};
  return factory(sub);
}

async function getProvider(kind) {
  const hit = cache.get(kind);
  if (hit && hit.expires > Date.now()) return hit.provider;
  const factories = { sms: SMS, whatsapp: WHATSAPP, email: EMAIL }[kind];
  const provider = await build(kind, factories);
  cache.set(kind, { provider, expires: Date.now() + 60000 });
  return provider;
}

module.exports = { getProvider, PROVIDERS: { sms: Object.keys(SMS), whatsapp: Object.keys(WHATSAPP), email: Object.keys(EMAIL) } };
