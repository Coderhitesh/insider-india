const bcrypt = require('bcryptjs');
const { User, ContractorProfile, Booking, Media } = require('../../models');
const rbac = require('../../services/rbacService');
const tokenService = require('../../services/tokenService');
const StorageService = require('../../services/storage/StorageService');
const { audit } = require('../../services/auditService');
const { nextNumber } = require('../../utils/sequence');
const { normalizeMobile } = require('../../utils/phone');
const { escapeRegex } = require('../../utils/text');
const { parsePagination, pageMeta } = require('../../utils/pagination');
const { ok, created } = require('../../utils/respond');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const FORBIDDEN_FOR_CONTRACTORS = ['roles.manage', 'settings.manage', 'users.manage', 'audit_logs.view'];
const OPEN = { $nin: ['CANCELLED', 'PROJECT_COMPLETED'] };

async function assertCanSetPermissions(req, body) {
  if (body.permissions === undefined && body.customPermissions === undefined) return;
  const perms = await rbac.getEffectivePermissions(req.user);
  if (!rbac.hasPermission(perms, 'roles.manage')) throw ApiError.forbidden('Only a Super Admin can change contractor permissions');
  const bad = (body.permissions || []).filter((p) => FORBIDDEN_FOR_CONTRACTORS.includes(p));
  if (bad.length) throw ApiError.badRequest(`Contractors cannot be granted: ${bad.join(', ')}`, 'PERMISSION_NOT_ALLOWED');
}

async function view(user, profile, openBookings) {
  let photoUrl = null;
  if (profile?.photo) {
    const m = await Media.findById(profile.photo).lean();
    if (m && !m.deletedAt) photoUrl = await StorageService.getUrl(m).catch(() => null);
  }
  return {
    id: String(user._id), name: user.name, mobile: user.mobile, email: user.email || null,
    status: user.status, isActive: user.status === 'ACTIVE', loginEnabled: user.loginEnabled,
    customPermissions: user.customPermissions, permissions: user.permissions || [],
    contractorCode: profile?.contractorCode, photo: profile?.photo ? String(profile.photo) : null, photoUrl,
    address: profile?.address || null, city: profile?.city || null, serviceAreas: profile?.serviceAreas || [],
    specializations: profile?.specializations || [], experienceYears: profile?.experienceYears ?? null, notes: profile?.notes || '',
    openBookings: openBookings ?? undefined, lastLogin: user.lastLogin, createdAt: user.createdAt,
  };
}

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = { role: 'CONTRACTOR' };
  if (q.active === 'true') filter.status = 'ACTIVE';
  if (q.active === 'false') filter.status = { $ne: 'ACTIVE' };
  if (q.q) {
    const rx = new RegExp(escapeRegex(String(q.q).slice(0, 100)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }];
  }
  let userIds;
  if (q.city || q.area || q.specialization) {
    const pf = {};
    if (q.city) pf.city = new RegExp(`^${escapeRegex(q.city)}$`, 'i');
    if (q.area) pf.serviceAreas = new RegExp(`^${escapeRegex(q.area)}$`, 'i');
    if (q.specialization) pf.specializations = new RegExp(`^${escapeRegex(q.specialization)}$`, 'i');
    userIds = await ContractorProfile.distinct('user', pf);
    filter._id = { $in: userIds };
  }
  const pg = parsePagination(q, { maxLimit: 200, defaultLimit: 50 });
  const [users, total] = await Promise.all([User.find(filter).sort({ name: 1 }).skip(pg.skip).limit(pg.limit).lean(), User.countDocuments(filter)]);
  const ids = users.map((u) => u._id);
  const [profiles, load] = await Promise.all([
    ContractorProfile.find({ user: { $in: ids } }).lean(),
    Booking.aggregate([{ $match: { assignedContractor: { $in: ids }, status: OPEN } }, { $group: { _id: '$assignedContractor', n: { $sum: 1 } } }]),
  ]);
  const P = new Map(profiles.map((p) => [String(p.user), p]));
  const W = new Map(load.map((l) => [String(l._id), l.n]));
  const items = await Promise.all(users.map((u) => view(u, P.get(String(u._id)), W.get(String(u._id)) || 0)));
  ok(res, { items }, 'OK', 200, pageMeta(pg, total));
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'CONTRACTOR' }).lean();
  if (!user) throw ApiError.notFound('Contractor not found');
  const [profile, openBookings] = await Promise.all([
    ContractorProfile.findOne({ user: user._id }).lean(),
    Booking.countDocuments({ assignedContractor: user._id, status: OPEN }),
  ]);
  ok(res, { contractor: await view(user, profile, openBookings) });
});

async function checkPhoto(photo, req) {
  if (!photo) return;
  const m = await Media.findOne({ _id: photo, deletedAt: null, purpose: { $in: ['AVATAR', 'CONTENT_IMAGE'] } }).lean();
  if (!m) throw ApiError.badRequest('Upload a valid profile photo', 'INVALID_PHOTO');
  if (String(m.owner) !== String(req.user._id)) throw ApiError.badRequest('Upload a valid profile photo', 'INVALID_PHOTO');
}

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  await assertCanSetPermissions(req, b.customPermissions ? b : {});
  const mobile = normalizeMobile(b.mobile);
  if (!mobile) throw ApiError.badRequest('Enter a valid 10-digit mobile number', 'VALIDATION_ERROR');
  const email = b.email || undefined;
  if (await User.exists({ mobile })) throw ApiError.conflict('An account with this mobile already exists', 'DUPLICATE');
  if (email && (await User.exists({ email }))) throw ApiError.conflict('An account with this email already exists', 'DUPLICATE');
  if (b.password && !email) throw ApiError.badRequest('Email is required for password login', 'EMAIL_REQUIRED');
  await checkPhoto(b.photo, req);

  const user = await User.create({
    name: b.name, mobile, email, role: 'CONTRACTOR', mobileVerified: false,
    status: b.isActive ? 'ACTIVE' : 'INACTIVE', loginEnabled: b.loginEnabled,
    customPermissions: b.customPermissions, permissions: b.customPermissions ? b.permissions : [],
    passwordHash: b.password ? await bcrypt.hash(b.password, 12) : undefined,
    createdBy: req.user._id,
  });
  let profile;
  try {
    profile = await ContractorProfile.create({
      user: user._id,
      contractorCode: b.contractorCode || await nextNumber('CT'),
      photo: b.photo || undefined, address: b.address, city: b.city,
      serviceAreas: b.serviceAreas, specializations: b.specializations, experienceYears: b.experienceYears, notes: b.notes,
    });
  } catch (err) {
    await user.deleteOne();
    throw err;
  }
  await audit(req, { action: 'CONTRACTOR_CREATED', entityType: 'User', entityId: user._id, after: { name: b.name, mobile, email, customPermissions: b.customPermissions, permissions: user.permissions } });
  created(res, { contractor: await view(user.toObject(), profile.toObject(), 0) }, 'Contractor created');
});

exports.update = asyncHandler(async (req, res) => {
  const b = req.body;
  const user = await User.findOne({ _id: req.params.id, role: 'CONTRACTOR' });
  if (!user) throw ApiError.notFound('Contractor not found');
  await assertCanSetPermissions(req, b);
  await checkPhoto(b.photo, req);

  const before = { name: user.name, mobile: user.mobile, email: user.email, status: user.status, loginEnabled: user.loginEnabled, customPermissions: user.customPermissions, permissions: user.permissions };
  if (b.mobile !== undefined) {
    const m = normalizeMobile(b.mobile);
    if (!m) throw ApiError.badRequest('Enter a valid 10-digit mobile number', 'VALIDATION_ERROR');
    if (m !== user.mobile && (await User.exists({ mobile: m }))) throw ApiError.conflict('Mobile already in use', 'DUPLICATE');
    user.mobile = m;
  }
  if (b.email !== undefined) {
    const e = b.email || undefined;
    if (e && e !== user.email && (await User.exists({ email: e }))) throw ApiError.conflict('Email already in use', 'DUPLICATE');
    user.email = e;
  }
  if (b.name !== undefined) user.name = b.name;
  if (b.isActive !== undefined) user.status = b.isActive ? 'ACTIVE' : 'INACTIVE';
  if (b.loginEnabled !== undefined) user.loginEnabled = b.loginEnabled;
  if (b.customPermissions !== undefined) user.customPermissions = b.customPermissions;
  if (b.permissions !== undefined) user.permissions = b.permissions;
  if (!user.customPermissions) user.permissions = [];
  if (b.password) user.passwordHash = await bcrypt.hash(b.password, 12);
  await user.save();

  const profileFields = ['photo', 'address', 'city', 'serviceAreas', 'specializations', 'experienceYears', 'notes', 'contractorCode'];
  const set = Object.fromEntries(profileFields.filter((f) => b[f] !== undefined).map((f) => [f, b[f]]));
  if (Object.keys(set).length) await ContractorProfile.updateOne({ user: user._id }, { $set: set });

  if (b.isActive === false || b.loginEnabled === false || b.password) await tokenService.revokeAllForUser(user._id, 'CONTRACTOR_UPDATED');

  const after = { name: user.name, mobile: user.mobile, email: user.email, status: user.status, loginEnabled: user.loginEnabled, customPermissions: user.customPermissions, permissions: user.permissions };
  const permsChanged = JSON.stringify(before.permissions) !== JSON.stringify(after.permissions) || before.customPermissions !== after.customPermissions;
  await audit(req, { action: permsChanged ? 'CONTRACTOR_PERMISSIONS_CHANGED' : 'CONTRACTOR_UPDATED', entityType: 'User', entityId: user._id, before, after, reason: b.reason });

  const profile = await ContractorProfile.findOne({ user: user._id }).lean();
  ok(res, { contractor: await view(user.toObject(), profile) }, 'Contractor updated');
});

// Contractors with history are deactivated, never hard-deleted.
exports.remove = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'CONTRACTOR' });
  if (!user) throw ApiError.notFound('Contractor not found');
  const open = await Booking.countDocuments({ assignedContractor: user._id, status: OPEN });
  if (open) throw ApiError.conflict(`Reassign ${open} open booking(s) before removing this contractor`, 'HAS_OPEN_BOOKINGS', { openBookings: open });
  const everAssigned = await Booking.exists({ 'assignmentHistory.contractor': user._id });
  await tokenService.revokeAllForUser(user._id, 'CONTRACTOR_REMOVED');
  if (everAssigned) {
    user.status = 'INACTIVE';
    user.loginEnabled = false;
    await user.save();
  } else {
    await ContractorProfile.deleteOne({ user: user._id });
    await user.deleteOne();
  }
  await audit(req, { action: everAssigned ? 'CONTRACTOR_DEACTIVATED' : 'CONTRACTOR_DELETED', entityType: 'User', entityId: user._id, before: { name: user.name, mobile: user.mobile }, reason: req.body?.reason });
  ok(res, { deactivated: Boolean(everAssigned) }, everAssigned ? 'Contractor has history, so the account was deactivated' : 'Contractor deleted');
});
