const User = require('../models/User');
const { verifyAccessToken } = require('../services/tokenService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

async function resolveUser(token) {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (e) {
    const expired = e.name === 'TokenExpiredError';
    throw ApiError.unauthorized(expired ? 'Session expired' : 'Invalid session', expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
  }
  const user = await User.findById(payload.sub).lean();
  if (!user || user.status !== 'ACTIVE' || !user.loginEnabled || (user.tokenVersion || 0) !== payload.tv) {
    throw ApiError.unauthorized('Session is no longer valid', 'SESSION_REVOKED');
  }
  return user;
}

const authenticate = asyncHandler(async (req, res, next) => {
  const token = bearer(req);
  if (!token) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  req.user = await resolveUser(token);
  next();
});

// Attaches req.user when a valid token is present; silently continues otherwise.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = bearer(req);
  if (token) {
    try { req.user = await resolveUser(token); } catch { req.user = null; }
  }
  next();
});

module.exports = { authenticate, optionalAuth };
