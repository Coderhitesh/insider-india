const { Role, Permission, User } = require('../../models');
const rbac = require('../../services/rbacService');
const { audit } = require('../../services/auditService');
const { ok, created } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const view = (r, users) => ({ id: String(r._id), key: r.key, name: r.name, description: r.description, permissions: r.permissions, isSystem: r.isSystem, isStaff: r.isStaff, users });

exports.permissions = asyncHandler(async (req, res) => {
  const items = await Permission.find().sort({ group: 1, key: 1 }).lean();
  const groups = {};
  for (const p of items) (groups[p.group] ||= []).push({ key: p.key, description: p.description });
  ok(res, { groups: Object.entries(groups).map(([group, permissions]) => ({ group, permissions })) });
});

exports.list = asyncHandler(async (req, res) => {
  const [roles, counts] = await Promise.all([Role.find().sort({ isSystem: -1, key: 1 }).lean(), User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }])]);
  const C = new Map(counts.map((c) => [c._id, c.n]));
  ok(res, { items: roles.map((r) => view(r, C.get(r.key) || 0)) });
});

exports.create = asyncHandler(async (req, res) => {
  if (await Role.exists({ key: req.body.key })) throw ApiError.conflict('Role key already exists', 'DUPLICATE');
  const role = await Role.create({ ...req.body, isSystem: false, isStaff: true });
  await audit(req, { action: 'ROLE_CREATED', entityType: 'Role', entityId: role._id, after: req.body });
  created(res, { role: view(role.toObject(), 0) }, 'Role created');
});

exports.update = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw ApiError.notFound('Role not found');
  if (role.key === 'SUPER_ADMIN') throw ApiError.forbidden('The Super Admin role always has every permission');
  if (role.key === 'CUSTOMER' && req.body.permissions?.length) throw ApiError.badRequest('Customers cannot hold admin permissions');
  const before = { name: role.name, description: role.description, permissions: role.permissions };
  const { reason, ...data } = req.body;
  role.set(data);
  await role.save();
  rbac.invalidate(role.key);
  await audit(req, { action: 'ROLE_PERMISSIONS_CHANGED', entityType: 'Role', entityId: role._id, before, after: data, reason });
  ok(res, { role: view(role.toObject()) }, 'Role updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSystem) throw ApiError.forbidden('System roles cannot be deleted');
  const users = await User.countDocuments({ role: role.key });
  if (users) throw ApiError.conflict(`Move ${users} user(s) to another role first`, 'ROLE_IN_USE');
  await role.deleteOne();
  rbac.invalidate(role.key);
  await audit(req, { action: 'ROLE_DELETED', entityType: 'Role', entityId: role._id, before: { key: role.key, permissions: role.permissions } });
  ok(res, {}, 'Role deleted');
});
