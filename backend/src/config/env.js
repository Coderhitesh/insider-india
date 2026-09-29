const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const list = (v, d = '') => String(v || d).split(',').map((s) => s.trim()).filter(Boolean);
const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));
const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const REQUIRED = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
if (isProd) {
  for (const k of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY']) {
    if (process.env[k].length < 32) throw new Error(`${k} must be at least 32 characters in production`);
  }
}

const origins = list(process.env.FRONTEND_URL, 'http://localhost:3000');

module.exports = {
  nodeEnv,
  isProd,
  port: int(process.env.PORT, 5000),
  trustProxy: int(process.env.TRUST_PROXY, 1),
  corsOrigins: origins,
  frontendUrl: origins[0],
  mongoUri: process.env.MONGODB_URI,
  mongoAutoIndex: bool(process.env.MONGO_AUTO_INDEX, true),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtlDays: int(process.env.JWT_REFRESH_TTL_DAYS, 30),
    issuer: 'insider-india',
    audience: 'insider-india-api',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: bool(process.env.COOKIE_SECURE, isProd),
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
  },
  encryptionKey: process.env.ENCRYPTION_KEY,
  allowLogProviders: bool(process.env.ALLOW_LOG_PROVIDERS, !isProd),
  logLevel: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  google: { mapsServerKey: process.env.GOOGLE_MAPS_API_KEY || '' },
  bootstrap: {
    storage: {
      active: (process.env.STORAGE_PROVIDER || 'CLOUDINARY').toUpperCase(),
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || '',
        folder: process.env.CLOUDINARY_FOLDER || 'insider-india',
      },
      s3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        region: process.env.AWS_REGION || 'ap-south-1',
        bucket: process.env.AWS_S3_BUCKET || '',
        cdnUrl: process.env.AWS_CDN_URL || '',
        prefix: 'insider-india',
      },
    },
    whatsapp: {
      active: (process.env.WHATSAPP_PROVIDER || 'LOG').toUpperCase(),
      token: process.env.WHATSAPP_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    },
    sms: {
      active: (process.env.SMS_PROVIDER || 'LOG').toUpperCase(),
      apiKey: process.env.SMS_API_KEY || '',
      senderId: process.env.SMS_SENDER_ID || '',
      otpTemplateId: process.env.SMS_OTP_TEMPLATE_ID || '',
    },
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: int(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || '',
    },
  },
  seed: {
    name: process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SEED_SUPER_ADMIN_EMAIL || '',
    password: process.env.SEED_SUPER_ADMIN_PASSWORD || '',
    mobile: process.env.SEED_SUPER_ADMIN_MOBILE || '',
  },
};
