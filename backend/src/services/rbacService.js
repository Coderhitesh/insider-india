const Role = require('../models/Role');
const { ROLES } = require('../config/constants');

const TTL = 60000;
const cache = new Map();

async function getRolePermissions(roleKey) {
  const hit = cache.get(roleKey);
  if (hit && hit.expires > Date.now()) return hit.perms;
  const role = await Role.findOne({ key: roleKey }).lean();
  const perms = Array.isArray(role?.permissions) ? role.permissions : [];
  cache.set(roleKey, { perms, expires: Date.now() + TTL });
  return perms;
}

async function getEffectivePermissions(user) {
  if (!user) return new Set();
  if (user.role === ROLES.SUPER_ADMIN) return new Set(['*']);
  if (user.customPermissions) return new Set(user.permissions || []);
  const rolePerms = await getRolePermissions(user.role);
  return new Set([...rolePerms, ...(user.permissions || [])]);
}

const hasPermission = (set, key) => set.has('*') || set.has(key);
const invalidate = (roleKey) => (roleKey ? cache.delete(roleKey) : cache.clear());

module.exports = { getEffectivePermissions, hasPermission, invalidate };
