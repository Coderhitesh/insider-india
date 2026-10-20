const { Package, EstimateRule } = require('../models');
const { getEstimateConfig } = require('./optionsService');
const ApiError = require('../utils/ApiError');

const roundTo = (v, step) => (step > 0 ? Math.round(v / step) * step : Math.round(v));

function amountFor(rule, pkgId) {
  const o = (rule.packageOverrides || []).find((x) => String(x.package) === String(pkgId));
  return o ? { min: o.min || 0, max: o.max || 0 } : { min: rule.min || 0, max: rule.max || 0 };
}

async function loadContext() {
  const [cfg, rules] = await Promise.all([getEstimateConfig(), EstimateRule.find({ isActive: true }).sort({ order: 1 }).lean()]);
  return { cfg, rules };
}

// Rules saved before commercial support have no appliesTo → residential.
const scopeOf = (rule) => rule.appliesTo || 'RESIDENTIAL';
function ruleApplies(rule, input) {
  const commercial = input.propertyCategory === 'COMMERCIAL';
  const scope = scopeOf(rule);
  if (scope !== 'BOTH' && scope !== (commercial ? 'COMMERCIAL' : 'RESIDENTIAL')) return false;
  if (commercial && rule.commercialTypes?.length && input.commercialType && !rule.commercialTypes.includes(input.commercialType)) return false;
  if (commercial && rule.type === 'ROOM') return false;
  return true;
}

function calculateForPackage(pkg, input, { cfg, rules }) {
  const { propertyCategory, bhk, area } = input;
  const summary = { package: pkg._id, packageName: pkg.name, packageSlug: pkg.slug, warranty: pkg.warranty };
  let baseMin;
  let baseMax;
  let basis;

  const areaBased = propertyCategory === 'COMMERCIAL' || bhk === 'CUSTOM';
  if (!areaBased) {
    const p = (pkg.pricing || []).find((x) => x.bhk === bhk);
    if (p) { baseMin = p.min; baseMax = p.max; basis = 'BHK'; }
  }
  if (baseMin === undefined) {
    const r = pkg.areaRate || {};
    if (area && r.minPerSqft > 0 && r.maxPerSqft > 0) {
      baseMin = area * r.minPerSqft;
      baseMax = area * r.maxPerSqft;
      basis = 'AREA';
    }
  }
  if (baseMin === undefined) return { ...summary, available: false, reason: 'PRICE_ON_REQUEST', adjustments: [] };

  const includedKey = propertyCategory === 'COMMERCIAL' ? 'COMMERCIAL' : bhk;
  const included = cfg.includedRooms?.[includedKey] || { kitchens: 0, bedrooms: 0, washrooms: 0 };
  const addons = new Set(input.addons || []);
  const adjustments = [];

  const units = input.units || {};
  for (const rule of rules) {
    if (!ruleApplies(rule, input)) continue;
    let qty = 0;
    if (rule.type === 'ROOM' && rule.room) qty = Math.max(0, (Number(input[rule.room]) || 0) - (included[rule.room] || 0));
    else if (rule.type === 'ADDON') qty = addons.has(rule.key) ? 1 : 0;
    else if (rule.type === 'UNIT') qty = Math.min(Math.max(0, Math.floor(Number(units[rule.key]) || 0)), rule.maxQty || 5000);
    if (!qty) continue;
    const a = amountFor(rule, pkg._id);
    const min = rule.mode === 'PERCENT' ? (baseMin * a.min) / 100 * qty : a.min * qty;
    const max = rule.mode === 'PERCENT' ? (baseMax * a.max) / 100 * qty : a.max * qty;
    const label = rule.type === 'UNIT' && rule.unitLabel ? `${rule.label} (${qty} ${rule.unitLabel})` : rule.label;
    adjustments.push({ key: rule.key, label, type: rule.type, qty: rule.type === 'UNIT' ? 1 : qty, min: Math.round(min), max: Math.round(max) });
  }

  const addMin = adjustments.reduce((s, a) => s + a.min, 0);
  const addMax = adjustments.reduce((s, a) => s + a.max, 0);
  const finalMin = roundTo(baseMin + addMin, cfg.roundTo);
  const finalMax = Math.max(finalMin, roundTo(baseMax + addMax, cfg.roundTo));

  return { ...summary, available: true, basis, baseMin: Math.round(baseMin), baseMax: Math.round(baseMax), adjustments, finalMin, finalMax };
}

/** EstimateEngine.calculate({ propertyCategory, bhk, area, packageId, kitchens, bedrooms, washrooms, addons }) */
async function calculate(input) {
  const pkg = await Package.findOne({ _id: input.packageId, isActive: true }).lean();
  if (!pkg) throw ApiError.notFound('Package not found');
  return calculateForPackage(pkg, input, await loadContext());
}

async function calculateAll(input) {
  const [packages, ctx] = await Promise.all([Package.find({ isActive: true }).sort({ order: 1 }).lean(), loadContext()]);
  const applicable = ctx.rules.filter((r) => ruleApplies(r, input));
  const validAddons = new Set(applicable.filter((r) => r.type === 'ADDON').map((r) => r.key));
  const unitRules = applicable.filter((r) => r.type === 'UNIT');
  const commercial = input.propertyCategory === 'COMMERCIAL';
  const units = Object.fromEntries(unitRules.map((r) => [r.key, Math.min(Math.max(0, Math.floor(Number(input.units?.[r.key]) || 0)), r.maxQty || 5000)]).filter(([, q]) => q > 0));
  const clean = {
    ...input,
    addons: (input.addons || []).filter((a) => validAddons.has(a)),
    units: commercial ? units : {},
    commercialType: commercial ? input.commercialType : undefined,
    ...(commercial ? { kitchens: 0, bedrooms: 0, washrooms: 0 } : {}),
  };
  return { input: clean, results: packages.map((p) => calculateForPackage(p, clean, ctx)), packages, disclaimer: ctx.cfg.disclaimer };
}

module.exports = { calculate, calculateAll, calculateForPackage, ruleApplies };
