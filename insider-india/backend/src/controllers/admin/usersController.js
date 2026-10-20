const bcrypt = require('bcryptjs');
const { User, Role } = require('../../models');
const tokenService = require('../../services/tokenService');
const { audit } = require('../../services/auditService');
const { normalizeMobile } = require('../../utils/phone');
const { escapeRegex } = require('../../utils/text');
const { parsePagination, pageMeta } = require('../../utils/pagination');
const { ok, created } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const NON_STAFF_ROLES = ['CUSTOMER', 'CONTRACTOR']; // contractors are managed via /admin/contractors
const view = (u) => ({
  id: String(u._id), name: u.name, email: u.email, mobile: u.mobile || null, role: u.role, status: u.status,
  loginEnabled: u.loginEnabled, permissions: u.permissions || [], lastLogin: u.lastLogin, createdAt: u.createdAt,
});

async function assertAssignableRole(req, roleKey) {
  if (NON_STAFF_ROLES.includes(roleKey)) throw ApiError.badRequest('Use the contractor/customer screens for this role', 'INVALID_ROLE');
  const role = await Role.findOne({ key: roleKey }).lean();
  if (!role || !role.isStaff) throw ApiError.badRequest('Role not found', 'INVALID_ROLE');
  if (roleKey === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only a Super Admin can grant Super Admin');
}

async function assertNotLastSuperAdmin(user, change) {
  if (user.role !== 'SUPER_ADMIN') return;
  const demoting = (change.role && change.role !== 'SUPER_ADMIN') || (change.status && change.status !== 'ACTIVE') || change.loginEnabled === false;
  if (!demoting) return;
  const others = await User.countDocuments({ role: 'SUPER_ADMIN', status: 'ACTIVE', _id: { $ne: user._id } });
  if (!others) throw ApiError.conflict('At least one active Super Admin is required', 'LAST_SUPER_ADMIN');
}

exports.list = asyncHandler(async (req, res) => {
  const filter = { role: { $nin: NON_STAFF_ROLES } };
  if (req.query.role) filter.role = String(req.query.role).toUpperCase();
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 100)), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const pg = parsePagination(req.query);
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), User.countDocuments(filter)]);
  ok(res, { items: items.map(view) }, 'OK', 200, pageMeta(pg, total));
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  await assertAssignableRole(req, b.role);
  if (b.permissions.length && req.user.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only a Super Admin can grant extra permissions');
  const mobile = b.mobile ? normalizeMobile(b.mobile) : undefined;
  if (b.mobile && !mobile) throw ApiError.badRequest('Invalid mobile number', 'VALIDATION_ERROR');
  if (await User.exists({ email: b.email })) throw ApiError.conflict('Email already in use', 'DUPLICATE');
  if (mobile && (await User.exists({ mobile }))) throw ApiError.conflict('Mobile already in use', 'DUPLICATE');
  const user = await User.create({
    name: b.name, email: b.email, mobile, role: b.role, permissions: b.permissions,
    passwordHash: await bcrypt.hash(b.password, 12), createdBy: req.user._id,
  });
  await audit(req, { action: 'STAFF_CREATED', entityType: 'User', entityId: user._id, after: { name: b.name, email: b.email, role: b.role, permissions: b.permissions } });
  created(res, { user: view(user) }, 'User created');
});

exports.update = asyncHandler(async (req, res) => {
  const b = req.body;
  const user = await User.findOne({ _id: req.params.id, role: { $nin: NON_STAFF_ROLES } });
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only a Super Admin can modify a Super Admin');
  if (String(user._id) === String(req.user._id) && (b.role || b.status || b.loginEnabled === false)) {
    throw ApiError.badRequest('You cannot change your own role or status', 'SELF_CHANGE');
  }
  if (b.role) await assertAssignableRole(req, b.role);
  if (b.permissions && req.user.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only a Super Admin can change permissions');
  await assertNotLastSuperAdmin(user, b);

  const before = { name: user.name, role: user.role, status: user.status, loginEnabled: user.loginEnabled, permissions: user.permissions, mobile: user.mobile };
  if (b.mobile !== undefined) {
    const m = b.mobile ? normalizeMobile(b.mobile) : undefined;
    if (b.mobile && !m) throw ApiError.badRequest('Invalid mobile number', 'VALIDATION_ERROR');
    if (m && m !== user.mobile && (await User.exists({ mobile: m }))) throw ApiError.conflict('Mobile already in use', 'DUPLICATE');
    user.mobile = m;
  }
  for (const f of ['name', 'role', 'status', 'loginEnabled', 'permissions']) if (b[f] !== undefined) user[f] = b[f];
  await user.save();
  if (b.role || (b.status && b.status !== 'ACTIVE') || b.loginEnabled === false) await tokenService.revokeAllForUser(user._id, 'STAFF_UPDATED');

  const after = { name: user.name, role: user.role, status: user.status, loginEnabled: user.loginEnabled, permissions: user.permissions, mobile: user.mobile };
  const action = before.role !== after.role ? 'ROLE_CHANGED' : JSON.stringify(before.permissions) !== JSON.stringify(after.permissions) ? 'PERMISSIONS_CHANGED' : 'STAFF_UPDATED';
  await audit(req, { action, entityType: 'User', entityId: user._id, before, after, reason: b.reason });
  ok(res, { user: view(user) }, 'User updated');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: { $ne: 'CUSTOMER' } });
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') throw ApiError.forbidden();
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  await user.save();
  await tokenService.revokeAllForUser(user._id, 'PASSWORD_RESET');
  await audit(req, { action: 'PASSWORD_RESET', entityType: 'User', entityId: user._id });
  ok(res, {}, 'Password reset. The user has been signed out of all devices.');
});

exports.forceLogout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') throw ApiError.forbidden();
  await tokenService.revokeAllForUser(user._id, 'FORCED_LOGOUT');
  await audit(req, { action: 'FORCED_LOGOUT', entityType: 'User', entityId: user._id });
  ok(res, {}, 'User signed out of all devices');
});

// Self-service password change for any staff account.
exports.changeOwnPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user.passwordHash || !(await bcrypt.compare(String(req.body.currentPassword || ''), user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect', 'INVALID_PASSWORD');
  }
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await tokenService.revokeAllForUser(user._id, 'PASSWORD_CHANGED');
  await audit(req, { action: 'PASSWORD_CHANGED', entityType: 'User', entityId: user._id });
  ok(res, {}, 'Password changed. Please log in again.');
});
