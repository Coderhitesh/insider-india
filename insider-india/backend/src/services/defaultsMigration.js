const { EstimateRule, Package, Permission, Role } = require('../models');
const { PERMISSIONS } = require('../config/constants');
const { COMMERCIAL_RULES, COMMERCIAL_AREA_RATES } = require('../seed/data');
const logger = require('../utils/logger');

/**
 * Adds data introduced after the first seed, without touching anything the admin already edited:
 * commercial estimate rules (inserted only if their key is missing) and per-sq-ft rates for packages
 * that have none. Idempotent; runs on every start.
 */
const GALLERY_CATEGORIES = ['Full Home', 'Modular Kitchen', 'Bedroom', 'Living Room', 'Wardrobe', 'Dining', 'Kids Room', 'Bathroom', 'Pooja Room', 'False Ceiling', 'Office & Commercial', 'Renovation'];

async function ensureDefaults() {
  // Booking funnel for commercial spaces: home-only services are tagged, commercial services added once.
  const { Service } = require('../models');
  const { HOME_ONLY_SERVICES, SERVICES } = require('../seed/data');
  await Service.updateMany({ slug: { $in: HOME_ONLY_SERVICES }, scope: { $exists: false } }, { $set: { scope: 'RESIDENTIAL' } });
  await Service.updateMany({ scope: { $exists: false } }, { $set: { scope: 'BOTH' } });
  for (const sv of SERVICES.filter((x) => x.scope === 'COMMERCIAL')) await Service.updateOne({ slug: sv.slug }, { $setOnInsert: sv }, { upsert: true });

  // Gallery categories: seeded once (admins can rename, reorder, hide or add more).
  const { GalleryCategory } = require('../models');
  if (!(await GalleryCategory.estimatedDocumentCount())) {
    await GalleryCategory.insertMany(GALLERY_CATEGORIES.map((name, i) => ({ name, slug: name === 'Office & Commercial' ? 'office-commercial' : name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), order: i + 1 })));
  }
  let rules = 0;
  for (const r of COMMERCIAL_RULES) {
    const res = await EstimateRule.updateOne({ key: r.key }, { $setOnInsert: r }, { upsert: true });
    if (res.upsertedCount) rules += 1;
  }
  let rates = 0;
  for (const [slug, areaRate] of Object.entries(COMMERCIAL_AREA_RATES)) {
    const pkg = await Package.findOne({ slug }).select('areaRate').lean();
    if (pkg && !(pkg.areaRate?.minPerSqft > 0 && pkg.areaRate?.maxPerSqft > 0)) {
      await Package.updateOne({ _id: pkg._id }, { $set: { areaRate } });
      rates += 1;
    }
  }
  // Permissions added after the first seed (e.g. payments.*): register them and give them to the ADMIN role.
  let perms = 0;
  for (const p of PERMISSIONS.filter((x) => x.key.startsWith('payments.') || x.key.startsWith('referrals.') || x.key.startsWith('enquiries.'))) {
    const r = await Permission.updateOne({ key: p.key }, { $setOnInsert: { ...p, isSystem: true } }, { upsert: true });
    if (r.upsertedCount) {
      perms += 1;
      await Role.updateOne({ key: 'ADMIN' }, { $addToSet: { permissions: p.key } });
    }
  }
  if (perms) logger.info(`Defaults: ${perms} new permission(s) added and granted to ADMIN`);
  if (rules || rates) logger.info(`Defaults: ${rules} commercial estimate rule(s), ${rates} package area rate(s) added`);
}

module.exports = { ensureDefaults };
