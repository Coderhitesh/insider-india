const crypto = require('crypto');
const env = require('../config/env');

const ENC_KEY = crypto.createHash('sha256').update(`enc:${env.encryptionKey}`).digest();
const HMAC_KEY = crypto.createHash('sha256').update(`hmac:${env.encryptionKey}`).digest();
const PREFIX = 'enc:v1:';

function encrypt(plain) {
  if (plain === undefined || plain === null || plain === '') return plain;
  if (typeof plain === 'string' && plain.startsWith(PREFIX)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
}

function decrypt(value) {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value;
  const [ivB, tagB, dataB] = value.slice(PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
}

const hmac = (v) => crypto.createHmac('sha256', HMAC_KEY).update(String(v)).digest('hex');

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && ba.length > 0 && crypto.timingSafeEqual(ba, bb);
}

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

module.exports = { encrypt, decrypt, hmac, safeEqualHex, randomToken };
