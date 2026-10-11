const { Notification, NotificationTemplate, User } = require('../../models');
const { getProvider } = require('./registry');
const { render } = require('../../utils/template');
const settings = require('../settingsService');
const logger = require('../../utils/logger');
const { CHANNELS } = require('../../config/constants');

const PROVIDER_KIND = { SMS: 'sms', WHATSAPP: 'whatsapp', EMAIL: 'email' };

async function getTemplate(event, channel) {
  return NotificationTemplate.findOne({ event, channel, isActive: true }).lean();
}

async function baseVariables(vars) {
  const company = (await settings.get('company.profile', {})) || {};
  return { company: company.name || 'INSIDER INDIA LLP', ...vars };
}

function templatePayload(tpl, vars) {
  const order = tpl.variableOrder || [];
  return {
    name: tpl.providerTemplateName,
    id: tpl.providerTemplateId,
    language: tpl.language,
    variables: order.map((k) => vars[k]),
    namedVariables: Object.fromEntries(order.map((k) => [k, vars[k]])),
  };
}

async function dispatch(channel, { to, subject, body, template }) {
  try {
    const provider = await getProvider(PROVIDER_KIND[channel]);
    return await provider.send({ to, subject, body, template });
  } catch (err) {
    return { ok: false, provider: 'NONE', error: err.message };
  }
}

// OTP delivery — returns { ok, provider, providerRef, error }. Never logs the code outside LOG providers.
async function deliverOtp({ mobile, code, channel, expiryMinutes }) {
  const tpl = await getTemplate('OTP', channel);
  const vars = await baseVariables({ otp: code, expiry: expiryMinutes });
  const body = render(tpl?.body || '{{otp}} is your {{company}} verification code. Valid for {{expiry}} minutes.', vars);
  const template = tpl ? { ...templatePayload(tpl, vars), urlButtonParam: tpl.otpButton ? code : undefined } : undefined;
  return dispatch(channel, { to: mobile, body, template });
}

/**
 * NotificationService.send({ user, event, channels, variables, data, link })
 * user: User doc/id. Missing template for a channel => channel skipped (IN_APP falls back to variables.title/body).
 */
async function send({ user, event, channels = [CHANNELS.IN_APP], variables = {}, data, link }) {
  const results = [];
  try {
    const u = user && user._id ? user : await User.findById(user).lean();
    if (!u) return results;
    const vars = await baseVariables({ name: u.name || 'there', ...variables });

    for (const channel of channels) {
      const tpl = await getTemplate(event, channel);
      if (!tpl && channel !== CHANNELS.IN_APP) {
        results.push({ channel, status: 'SKIPPED', reason: 'NO_TEMPLATE' });
        continue;
      }
      const title = render(tpl?.title || vars.title || '', vars);
      const body = render(tpl?.body || vars.body || '', vars);
      const doc = { user: u._id, event, channel, title, body, link: link || vars.link, data };

      if (channel === CHANNELS.IN_APP) {
        await Notification.create({ ...doc, status: 'SENT' });
        results.push({ channel, status: 'SENT' });
        continue;
      }

      const to = channel === CHANNELS.EMAIL ? u.email : u.mobile;
      if (!to) {
        await Notification.create({ ...doc, status: 'SKIPPED', error: 'No recipient address' });
        results.push({ channel, status: 'SKIPPED', reason: 'NO_RECIPIENT' });
        continue;
      }
      const r = await dispatch(channel, { to, subject: title, body, template: templatePayload(tpl, vars) });
      await Notification.create({ ...doc, to, status: r.ok ? 'SENT' : 'FAILED', provider: r.provider, providerRef: r.providerRef, error: r.error });
      if (!r.ok) logger.warn('Notification delivery failed', { event, channel, error: r.error });
      results.push({ channel, status: r.ok ? 'SENT' : 'FAILED' });
    }
  } catch (err) {
    logger.error('NotificationService.send failed', { event, error: err.message });
  }
  return results;
}

// In-app notification to all active staff holding any of the given roles.
async function notifyStaff({ event, variables = {}, data, link, roles = ['SUPER_ADMIN', 'ADMIN'] }) {
  try {
    const staff = await User.find({ role: { $in: roles }, status: 'ACTIVE' }).select('_id name').lean();
    const tpl = await getTemplate(event, CHANNELS.IN_APP);
    const vars = await baseVariables(variables);
    const docs = staff.map((s) => ({
      user: s._id,
      event,
      channel: CHANNELS.IN_APP,
      title: render(tpl?.title || vars.title || event, { ...vars, staffName: s.name }),
      body: render(tpl?.body || vars.body || '', { ...vars, staffName: s.name }),
      link,
      data,
      status: 'SENT',
    }));
    if (docs.length) await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    logger.error('notifyStaff failed', { event, error: err.message });
  }
}

module.exports = { send, notifyStaff, deliverOtp };
