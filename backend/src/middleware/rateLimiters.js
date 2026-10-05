const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { safeEqualHex, hmac } = require('../utils/crypto');

// Server-side rendering requests from the website all come from one IP; they carry INTERNAL_API_KEY instead.
const isInternal = (req) => {
  const key = req.get('x-internal-key');
  return Boolean(env.internalApiKey && key && safeEqualHex(hmac(key), hmac(env.internalApiKey)));
};

const make = (windowMs, limit, message, keyGenerator) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  skip: isInternal,
  handler: (req, res, next) => next(ApiError.tooMany(message)),
});

module.exports = {
  apiLimiter: make(15 * 60000, 600, 'Too many requests. Please slow down.'),
  otpSendLimiter: make(15 * 60000, 10, 'Too many verification requests. Please try again later.'),
  otpVerifyLimiter: make(15 * 60000, 30, 'Too many verification attempts. Please try again later.'),
  staffLoginLimiter: make(15 * 60000, 10, 'Too many login attempts. Please try again later.'),
  leadCreateLimiter: make(60 * 60000, 20, 'Too many submissions. Please try again later.'),
  uploadLimiter: make(15 * 60000, 40, 'Too many uploads. Please try again later.'),
  geoLimiter: make(15 * 60000, 150, 'Too many address lookups. Please try again shortly.', (req) => (req.user ? String(req.user._id) : req.ip)),
};
