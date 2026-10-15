const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const rbac = require('../services/rbacService');

const load = async (req) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!req.permissions) req.permissions = await rbac.getEffectivePermissions(req.user);
  return req.permissions;
};

const requirePermission = (...keys) => asyncHandler(async (req, res, next) => {
  const perms = await load(req);
  if (!keys.every((k) => rbac.hasPermission(perms, k))) throw ApiError.forbidden();
  next();
});

const requireAnyPermission = (...keys) => asyncHandler(async (req, res, next) => {
  const perms = await load(req);
  if (!keys.some((k) => rbac.hasPermission(perms, k))) throw ApiError.forbidden();
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  return next();
};

module.exports = { requirePermission, requireAnyPermission, requireRole };

// Any non-customer account (Super Admin, Admin, Contractor, custom staff roles).
const requireStaff = (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === 'CUSTOMER') return next(ApiError.forbidden());
  return next();
};

// Super Admin only — for storage, providers, OTP, role changes to SUPER_ADMIN.
const requireSuperAdmin = requireRole('SUPER_ADMIN');

module.exports.requireStaff = requireStaff;
module.exports.requireSuperAdmin = requireSuperAdmin;
