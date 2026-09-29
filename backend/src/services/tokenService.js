const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { RefreshToken, User } = require('../models');
const { hmac, randomToken } = require('../utils/crypto');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, tv: user.tokenVersion || 0 },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl, issuer: env.jwt.issuer, audience: env.jwt.audience },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret, { issuer: env.jwt.issuer, audience: env.jwt.audience });
}

async function issueRefreshToken(user, { ip, userAgent, family } = {}) {
  const raw = randomToken(48);
  const doc = await RefreshToken.create({
    user: user._id,
    tokenHash: hmac(`${env.jwt.refreshSecret}:${raw}`),
    family: family || randomToken(16),
    expiresAt: new Date(Date.now() + env.jwt.refreshTtlDays * 86400000),
    ip,
    userAgent,
  });
  return { raw, doc };
}

async function issueSession(user, meta) {
  const { raw } = await issueRefreshToken(user, meta);
  return { accessToken: signAccessToken(user), refreshToken: raw };
}

async function rotateRefreshToken(raw, meta = {}) {
  if (!raw) throw ApiError.unauthorized('Session expired. Please log in again.', 'REFRESH_REQUIRED');
  const tokenHash = hmac(`${env.jwt.refreshSecret}:${raw}`);
  const now = new Date();

  const current = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, revokedReason: 'ROTATED' } },
    { new: true },
  );

  if (!current) {
    const reused = await RefreshToken.findOne({ tokenHash });
    if (reused && reused.revokedReason === 'ROTATED') {
      await RefreshToken.updateMany({ family: reused.family, revokedAt: null }, { $set: { revokedAt: now, revokedReason: 'REUSE_DETECTED' } });
      logger.warn('Refresh token reuse detected; family revoked', { user: String(reused.user), family: reused.family });
    }
    throw ApiError.unauthorized('Session expired. Please log in again.', 'REFRESH_INVALID');
  }

  const user = await User.findById(current.user);
  if (!user || user.status !== 'ACTIVE' || !user.loginEnabled) throw ApiError.unauthorized('Account unavailable', 'ACCOUNT_UNAVAILABLE');

  const { raw: next, doc } = await issueRefreshToken(user, { ...meta, family: current.family });
  await RefreshToken.updateOne({ _id: current._id }, { $set: { replacedBy: doc._id } });
  return { user, accessToken: signAccessToken(user), refreshToken: next };
}

async function revokeRefreshToken(raw) {
  if (!raw) return;
  await RefreshToken.updateOne(
    { tokenHash: hmac(`${env.jwt.refreshSecret}:${raw}`), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } },
  );
}

async function revokeAllForUser(userId, reason = 'LOGOUT_ALL') {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: reason } });
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

module.exports = { signAccessToken, verifyAccessToken, issueSession, rotateRefreshToken, revokeRefreshToken, revokeAllForUser };
