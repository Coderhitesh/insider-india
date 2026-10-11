const bcrypt = require('bcryptjs');
const { User, Lead, CustomerProfile } = require('../models');
const otpService = require('../services/otpService');
const tokenService = require('../services/tokenService');
const rbac = require('../services/rbacService');
const { audit } = require('../services/auditService');
const { logActivity } = require('../services/activityService');
const { loadLeadForAccess } = require('../services/leadAccess');
const { normalizeMobile } = require('../utils/phone');
const { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } = require('../utils/cookies');
const { publicUser, leadView } = require('../utils/serializers');
const { ok } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, OTP_BLOCKED_ROLES, LEAD_OPEN_STATUS } = require('../config/constants');

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', 12);

const meta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });
const requireMobile = (m) => {
  const n = normalizeMobile(m);
  if (!n) throw new ApiError(422, 'Enter a valid 10-digit Indian mobile number', 'VALIDATION_ERROR', [{ field: 'mobile', message: 'Invalid mobile number' }]);
  return n;
};

async function startSession(req, res, user) {
  const { accessToken, refreshToken } = await tokenService.issueSession(user, meta(req));
  setRefreshCookie(res, refreshToken);
  const permissions = await rbac.getEffectivePermissions(user);
  return { accessToken, user: publicUser(user, permissions) };
}

exports.sendOtp = asyncHandler(async (req, res) => {
  const mobile = requireMobile(req.body.mobile);
  let lead;
  if (req.body.leadId) {
    lead = await loadLeadForAccess(req, req.body.leadId, { token: req.body.leadToken });
    if (lead.mobile !== mobile) throw ApiError.badRequest('Mobile number does not match your request', 'MOBILE_MISMATCH');
  }
  const result = await otpService.sendOtp({ mobile, channel: req.body.channel, ip: req.ip });
  if (lead) {
    if (['NEW', 'IN_PROGRESS'].includes(lead.status)) lead.status = 'OTP_PENDING';
    lead.lastActivityAt = new Date();
    await lead.save();
    await logActivity({ lead: lead._id, type: 'OTP_SENT', message: `OTP sent via ${req.body.channel}` });
  }
  ok(res, result, 'Verification code sent');
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const mobile = requireMobile(req.body.mobile);

  let lead;
  if (req.body.leadId) {
    lead = await loadLeadForAccess(req, req.body.leadId, { token: req.body.leadToken });
    if (lead.mobile !== mobile) throw ApiError.badRequest('Mobile number does not match your request', 'MOBILE_MISMATCH');
  }

  let user = await User.findOne({ mobile });
  if (user && OTP_BLOCKED_ROLES.includes(user.role)) throw ApiError.forbidden('Please use the staff login', 'USE_STAFF_LOGIN');
  if (user && (user.status !== 'ACTIVE' || !user.loginEnabled)) throw ApiError.forbidden('This account is not active. Please contact support.', 'ACCOUNT_INACTIVE');

  await otpService.verifyOtp({ mobile, code: req.body.code });

  const now = new Date();
  if (!user) {
    user = await User.create({ name: lead?.name || req.body.name || '', mobile, role: ROLES.CUSTOMER, mobileVerified: true, lastLogin: now });
  } else {
    user.mobileVerified = true;
    user.lastLogin = now;
    if (!user.name && (lead?.name || req.body.name)) user.name = lead?.name || req.body.name;
    await user.save();
  }

  if (user.role === ROLES.CUSTOMER) {
    await CustomerProfile.updateOne(
      { user: user._id },
      { $setOnInsert: { user: user._id, city: lead?.city, utm: lead?.utm, source: lead?.source || 'WEBSITE' } },
      { upsert: true },
    );
  }

  // Claim any anonymous leads started with this mobile (abandoned-funnel recovery).
  await Lead.updateMany({ mobile, user: null }, { $set: { user: user._id, verifiedAt: now } });

  if (lead) {
    lead = await Lead.findById(lead._id);
    if (String(lead.user) === String(user._id)) {
      if (['NEW', 'IN_PROGRESS', 'OTP_PENDING'].includes(lead.status)) lead.status = 'VERIFIED';
      lead.verifiedAt = lead.verifiedAt || now;
      lead.stepsCompleted = [...new Set([...(lead.stepsCompleted || []), 'OTP'])];
      lead.currentStep = 'OTP';
      lead.resumeTokenHash = undefined;
      lead.lastActivityAt = now;
      await lead.save();
      await logActivity({ lead: lead._id, actor: user, type: 'OTP_VERIFIED', message: 'Mobile number verified' });
    }
  }

  const resume = lead
    ? null
    : await Lead.findOne({ user: user._id, status: { $in: LEAD_OPEN_STATUS }, booking: null }).sort({ lastActivityAt: -1 }).populate('services', 'title slug');

  const session = await startSession(req, res, user);
  if (lead) await lead.populate('services', 'title slug');
  ok(res, { ...session, lead: lead ? leadView(lead) : null, resumeLead: resume ? leadView(resume) : null }, 'Mobile number verified');
});

exports.refresh = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await tokenService.rotateRefreshToken(req.cookies?.[REFRESH_COOKIE], meta(req));
    setRefreshCookie(res, refreshToken);
    const permissions = await rbac.getEffectivePermissions(user);
    ok(res, { accessToken, user: publicUser(user, permissions) }, 'Session refreshed');
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
});

exports.logout = asyncHandler(async (req, res) => {
  await tokenService.revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  ok(res, {}, 'Logged out');
});

exports.logoutAll = asyncHandler(async (req, res) => {
  await tokenService.revokeAllForUser(req.user._id);
  clearRefreshCookie(res);
  ok(res, {}, 'Logged out from all devices');
});

exports.me = asyncHandler(async (req, res) => {
  const permissions = await rbac.getEffectivePermissions(req.user);
  ok(res, { user: publicUser(req.user, permissions) });
});

exports.staffLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const invalid = () => ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  const user = await User.findOne({ email }).select('+passwordHash +failedLoginAttempts +lockUntil');

  if (!user || user.role === ROLES.CUSTOMER || !user.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH); // equalise timing
    await audit(req, { action: 'STAFF_LOGIN_FAILED', entityType: 'User', meta: { email, reason: 'UNKNOWN' } });
    throw invalid();
  }
  if (user.lockUntil && user.lockUntil > new Date()) {
    const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new ApiError(423, `Account locked. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`, 'ACCOUNT_LOCKED');
  }
  if (user.status !== 'ACTIVE' || !user.loginEnabled) throw ApiError.forbidden('This account is disabled', 'ACCOUNT_INACTIVE');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    await audit(req, { action: 'STAFF_LOGIN_FAILED', entityType: 'User', entityId: user._id, actor: user._id, role: user.role });
    throw invalid();
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  await user.save();
  await audit(req, { action: 'STAFF_LOGIN', entityType: 'User', entityId: user._id, actor: user._id, role: user.role });

  ok(res, await startSession(req, res, user), 'Logged in');
});
