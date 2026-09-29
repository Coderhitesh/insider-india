const crypto = require('crypto');

// Strips MongoDB operator keys ($...) and dotted keys from user input.
function clean(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 10) return obj;
  if (Array.isArray(obj)) { obj.forEach((v) => clean(v, depth + 1)); return obj; }
  for (const k of Object.keys(obj)) {
    if (k.startsWith('$') || k.includes('.')) delete obj[k];
    else clean(obj[k], depth + 1);
  }
  return obj;
}

const sanitize = (req, res, next) => {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};

const requestId = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
};

module.exports = { sanitize, requestId };
