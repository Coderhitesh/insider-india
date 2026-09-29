/* Idempotent seed: inserts missing records only — never overwrites admin-edited data. */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const settings = require('../services/settingsService');
const M = require('../models');
const { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, ROLES } = require('../config/constants');
const D = require('../config/defaults');
const { PACKAGES, SERVICES, ESTIMATE_RULES, NOTIFICATION_TEMPLATES, FAQS } = require('./data');
const { normalizeMobile } = require('../utils/phone');

const log = (...a) => console.log('[seed]', ...a);

async function upsertMany(Model, docs, keyFn) {
  let inserted = 0;
  for (const doc of docs) {
    const r = await Model.updateOne(keyFn(doc), { $setOnInsert: doc }, { upsert: true });
    if (r.upsertedCount) inserted += 1;
  }
  return inserted;
}

async function seedSetting(key, value, { group, isPublic = false } = {}) {
  if (await settings.exists(key)) return false;
  await settings.set(key, value, { group, isPublic });
  return true;
}

async function run() {
  await connectDB();
  await Promise.all(Object.values(M).map((m) => m.createIndexes()));

  log('permissions +', await upsertMany(M.Permission, PERMISSIONS.map((p) => ({ ...p, isSystem: true })), (p) => ({ key: p.key })));

  const allKeys = PERMISSIONS.map((p) => p.key);
  const roles = [
    { key: ROLES.SUPER_ADMIN, name: 'Super Admin', description: 'Full access', permissions: allKeys, isSystem: true, isStaff: true },
    { key: ROLES.ADMIN, name: 'Admin', description: 'Operations', permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN, isSystem: true, isStaff: true },
    { key: ROLES.CONTRACTOR, name: 'Contractor', description: 'Field expert — default permissions, overridable per contractor', permissions: DEFAULT_ROLE_PERMISSIONS.CONTRACTOR, isSystem: true, isStaff: true },
    { key: ROLES.CUSTOMER, name: 'Customer', description: 'Customer portal', permissions: [], isSystem: true, isStaff: false },
  ];
  log('roles +', await upsertMany(M.Role, roles, (r) => ({ key: r.key })));
  // Super Admin always holds every permission (including newly added ones).
  await M.Role.updateOne({ key: ROLES.SUPER_ADMIN }, { $set: { permissions: allKeys } });

  if (env.seed.email) {
    const email = env.seed.email.toLowerCase();
    const exists = await M.User.findOne({ email });
    if (!exists) {
      const generated = !env.seed.password;
      const password = env.seed.password || crypto.randomBytes(12).toString('base64url');
      if (password.length < 10) throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 10 characters');
      await M.User.create({
        name: env.seed.name,
        email,
        mobile: normalizeMobile(env.seed.mobile) || undefined,
        role: ROLES.SUPER_ADMIN,
        passwordHash: await bcrypt.hash(password, 12),
        mobileVerified: Boolean(normalizeMobile(env.seed.mobile)),
      });
      log(`super admin created: ${email}`);
      if (generated) log(`GENERATED PASSWORD (shown once, change after first login): ${password}`);
    } else {
      log(`super admin exists: ${email}`);
    }
  } else {
    log('SEED_SUPER_ADMIN_EMAIL not set — skipping super admin');
  }

  log('packages +', await upsertMany(M.Package, PACKAGES, (p) => ({ slug: p.slug })));
  log('services +', await upsertMany(M.Service, SERVICES, (s) => ({ slug: s.slug })));
  log('estimate rules +', await upsertMany(M.EstimateRule, ESTIMATE_RULES, (r) => ({ key: r.key })));
  if (!(await M.Faq.exists({}))) log('faqs (unpublished drafts) +', (await M.Faq.insertMany(FAQS)).length);
  log('notification templates +', await upsertMany(M.NotificationTemplate, NOTIFICATION_TEMPLATES, (t) => ({ event: t.event, channel: t.channel })));

  const b = env.bootstrap;
  const created = [];
  const s = async (key, value, opts) => { if (await seedSetting(key, value, opts)) created.push(key); };
  await s('company.profile', D.COMPANY_PROFILE, { group: 'company', isPublic: true });
  await s('site.stats', D.SITE_STATS, { group: 'content', isPublic: true });
  await s('funnel.options', D.FUNNEL_OPTIONS, { group: 'funnel', isPublic: true });
  await s('estimate.config', D.ESTIMATE_CONFIG, { group: 'estimate' });
  await s('otp.config', D.OTP_CONFIG, { group: 'otp' });
  await s('pricing.config', D.PRICING_CONFIG, { group: 'pricing' });
  await s('maps.config', D.MAPS_CONFIG, { group: 'maps' });
  await s('operations.config', D.OPERATIONS_CONFIG, { group: 'operations' });
  await s('storage', b.storage, { group: 'storage' });
  await s('providers.sms', {
    active: b.sms.active,
    msg91: { authKey: b.sms.active === 'MSG91' ? b.sms.apiKey : '', senderId: b.sms.senderId },
    twilio: { accountSid: '', authToken: '', from: '' },
  }, { group: 'providers' });
  await s('providers.whatsapp', {
    active: b.whatsapp.active,
    meta: { accessToken: b.whatsapp.active === 'META' ? b.whatsapp.token : '', phoneNumberId: b.whatsapp.phoneNumberId, apiVersion: 'v20.0' },
    interakt: { apiKey: b.whatsapp.active === 'INTERAKT' ? b.whatsapp.token : '' },
    gupshup: { apiKey: b.whatsapp.active === 'GUPSHUP' ? b.whatsapp.token : '', source: '', appName: '' },
    twilio: { accountSid: '', authToken: '', from: '' },
  }, { group: 'providers' });
  await s('providers.email', {
    active: b.smtp.host ? 'SMTP' : 'LOG',
    smtp: { host: b.smtp.host, port: b.smtp.port, secure: b.smtp.port === 465, user: b.smtp.user, pass: b.smtp.pass, from: b.smtp.from },
  }, { group: 'providers' });
  log('settings +', created.length ? created.join(', ') : 'none');

  if (b.sms.otpTemplateId) {
    await M.NotificationTemplate.updateOne({ event: 'OTP', channel: 'SMS', providerTemplateId: '' }, { $set: { providerTemplateId: b.sms.otpTemplateId } });
  }

  log('done');
}

run()
  .catch((err) => { console.error('[seed] failed:', err); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await disconnectDB(); });
