const env = require('../config/env');

const REFRESH_COOKIE = 'ii_rt';
const baseOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  domain: env.cookie.domain,
  path: '/api/v1/auth',
});

const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), maxAge: env.jwt.refreshTtlDays * 86400000 });

const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, baseOptions());

module.exports = { REFRESH_COOKIE, setRefreshCookie, clearRefreshCookie };
