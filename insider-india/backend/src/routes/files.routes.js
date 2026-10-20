const path = require('path');
const router = require('express').Router();
const env = require('../config/env');
const LocalStorageProvider = require('../services/storage/LocalStorageProvider');
const { safeEqualHex } = require('../utils/crypto');
const ApiError = require('../utils/ApiError');

const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };

// Serves files written by LocalStorageProvider (development storage).
router.get('/*', (req, res, next) => {
  const key = path.posix.normalize(String(req.params[0] || ''));
  if (!/^(public|private)\/[\w-]+\/[\w-]+\.[a-z0-9]+$/i.test(key) || key.includes('..')) return next(ApiError.notFound('File not found'));
  if (key.startsWith('private/')) {
    const exp = Number(req.query.exp);
    if (!exp || exp < Date.now() / 1000 || !safeEqualHex(String(req.query.sig || ''), LocalStorageProvider.sign(key, exp))) {
      return next(ApiError.forbidden('This link has expired. Refresh the page to get a new one.', 'LINK_EXPIRED'));
    }
  }
  const ext = key.split('.').pop().toLowerCase();
  res.set({
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': key.startsWith('private/') ? 'private, no-store' : 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  });
  return res.sendFile(path.join(env.localStorageDir, key), (err) => { if (err && !res.headersSent) next(ApiError.notFound('File not found')); });
});

module.exports = router;
