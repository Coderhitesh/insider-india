const crypto = require('crypto');
const Otp = require('../models/Otp');
const settings = require('./settingsService');
const { deliverOtp } = require('./notifications/notificationService');
const { hmac, safeEqualHex } = require('../utils/crypto');
const { maskMobile } = require('../utils/phone');
const ApiError = require('../utils/ApiError');
const { OTP_CONFIG } = require('../config/defaults');

async function getConfig() {
  const cfg = { ...OTP_CONFIG, ...((await settings.get('otp.config', {})) || {}) };
  cfg.length = Math.min(8, Math.max(4, Number(cfg.length) || 4));
  return cfg;
}

const generateCode = (len) => String(crypto.randomInt(0, 10 ** len)).padStart(len, '0');
const hashCode = (mobile, purpose, code) => hmac(`otp:${mobile}:${purpose}:${code}`);

async function sendOtp({ mobile, channel = 'SMS', purpose = 'LOGIN', ip }) {
  const cfg = await getConfig();
  if (!cfg.channels.includes(channel)) throw ApiError.badRequest(`${channel} delivery is not enabled`, 'OTP_CHANNEL_DISABLED');

  const now = Date.now();
  const existing = await Otp.findOne({ mobile, purpose }).lean();
  let windowStartedAt = new Date(now);
  let sendCount = 0;

  if (existing) {
    const since = existing.lastSentAt ? now - new Date(existing.lastSentAt).getTime() : Infinity;
    const cooldownMs = cfg.resendCooldownSeconds * 1000;
    if (since < cooldownMs) {
      const retryAfter = Math.ceil((cooldownMs - since) / 1000);
      throw ApiError.tooMany(`Please wait ${retryAfter}s before requesting a new code`, 'OTP_COOLDOWN', { retryAfter });
    }
    if (existing.windowStartedAt && now - new Date(existing.windowStartedAt).getTime() < 3600000) {
      windowStartedAt = existing.windowStartedAt;
      sendCount = existing.sendCount || 0;
    }
    if (sendCount >= cfg.maxSendsPerHour) {
      throw ApiError.tooMany('Too many verification codes requested. Please try again in an hour.', 'OTP_SEND_LIMIT');
    }
  }

  const code = generateCode(cfg.length);
  await Otp.findOneAndUpdate(
    { mobile, purpose },
    {
      $set: {
        codeHash: hashCode(mobile, purpose, code),
        channel,
        expiresAt: new Date(now + cfg.expiryMinutes * 60000),
        attempts: 0,
        lastSentAt: new Date(now),
        windowStartedAt,
        sendCount: sendCount + 1,
        consumedAt: null,
        ip,
        purgeAt: new Date(now + 86400000),
      },
    },
    { upsert: true },
  );

  const result = await deliverOtp({ mobile, code, channel, expiryMinutes: cfg.expiryMinutes });
  await Otp.updateOne(
    { mobile, purpose },
    { $push: { deliveries: { $each: [{ channel, status: result.ok ? 'SENT' : 'FAILED', provider: result.provider, providerRef: result.providerRef, error: result.error }], $slice: -20 } } },
  );

  if (!result.ok) {
    // Allow an immediate retry on the other channel after a delivery failure.
    await Otp.updateOne({ mobile, purpose }, { $set: { lastSentAt: new Date(0) } });
    const other = channel === 'SMS' ? 'WhatsApp' : 'SMS';
    throw new ApiError(502, `We couldn't send the code via ${channel === 'SMS' ? 'SMS' : 'WhatsApp'}. Please try ${other}.`, 'OTP_DELIVERY_FAILED');
  }

  return {
    maskedMobile: maskMobile(mobile),
    channel,
    length: cfg.length,
    expiresIn: cfg.expiryMinutes * 60,
    resendIn: cfg.resendCooldownSeconds,
  };
}

async function verifyOtp({ mobile, code, purpose = 'LOGIN' }) {
  const cfg = await getConfig();
  const now = new Date();

  // Atomically reserve an attempt so parallel guesses can't exceed the limit.
  const rec = await Otp.findOneAndUpdate(
    { mobile, purpose, consumedAt: null, codeHash: { $ne: null }, attempts: { $lt: cfg.maxAttempts } },
    { $inc: { attempts: 1 } },
    { new: true },
  ).select('+codeHash');

  if (!rec) {
    const exists = await Otp.findOne({ mobile, purpose }).lean();
    if (exists && exists.consumedAt === null && exists.attempts >= cfg.maxAttempts) {
      throw ApiError.tooMany('Too many incorrect attempts. Please request a new code.', 'OTP_ATTEMPTS_EXCEEDED');
    }
    throw ApiError.badRequest('Please request a new verification code', 'OTP_NOT_FOUND');
  }
  if (rec.expiresAt < now) throw ApiError.badRequest('This code has expired. Please request a new one.', 'OTP_EXPIRED');

  if (!safeEqualHex(rec.codeHash, hashCode(mobile, purpose, code))) {
    const remaining = Math.max(0, cfg.maxAttempts - rec.attempts);
    throw new ApiError(400, remaining ? 'Incorrect code. Please try again.' : 'Too many incorrect attempts. Please request a new code.',
      remaining ? 'OTP_INVALID' : 'OTP_ATTEMPTS_EXCEEDED', [], { remainingAttempts: remaining });
  }

  const consumed = await Otp.updateOne({ _id: rec._id, consumedAt: null }, { $set: { consumedAt: now, codeHash: null } });
  if (!consumed.modifiedCount) throw ApiError.badRequest('This code has already been used', 'OTP_USED');
  return true;
}

module.exports = { sendOtp, verifyOtp, getConfig };
