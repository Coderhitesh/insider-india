const { Estimate, Lead, Package, EstimateRule } = require('../models');
const engine = require('../services/estimateEngine');
const options = require('../services/optionsService');
const otpService = require('../services/otpService');
const { logActivity } = require('../services/activityService');
const { nextNumber } = require('../utils/sequence');
const { estimateView } = require('../utils/serializers');
const { ok, created } = require('../utils/respond');
const { parsePagination, pageMeta } = require('../utils/pagination');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.config = asyncHandler(async (req, res) => {
  const [cfg, addons, otp] = await Promise.all([
    options.getEstimateConfig(),
    EstimateRule.find({ isActive: true, type: 'ADDON' }).sort({ order: 1 }).select('key label icon image description').lean(),
    otpService.getConfig(),
  ]);
  res.set('Cache-Control', 'public, max-age=60');
  ok(res, {
    propertyCategories: [{ value: 'RESIDENTIAL', label: 'Residential' }, { value: 'COMMERCIAL', label: 'Commercial' }],
    residentialSizes: (cfg.residentialSizes || []).filter((o) => o.active !== false),
    defaultCounters: cfg.defaultCounters,
    counterLimits: cfg.counterLimits,
    areaLimits: cfg.areaLimits,
    addons: addons.map((a) => ({ key: a.key, label: a.label, icon: a.icon, image: a.image, description: a.description })),
    disclaimer: cfg.disclaimer,
    otpLength: otp.length,
  });
});

function pickSelected(results, packages, packageId) {
  const available = results.filter((r) => r.available);
  if (packageId) {
    const r = results.find((x) => String(x.package) === String(packageId));
    if (!r) throw ApiError.badRequest('Selected package is not available', 'PACKAGE_UNAVAILABLE');
    return r;
  }
  const recommended = packages.find((p) => p.isRecommended);
  return available.find((r) => recommended && String(r.package) === String(recommended._id)) || available[0] || results[0] || null;
}

const selectedFields = (r) => (r ? {
  selectedPackage: r.package, baseMin: r.baseMin, baseMax: r.baseMax, adjustments: r.adjustments || [], finalMin: r.finalMin, finalMax: r.finalMax,
} : {});

exports.create = asyncHandler(async (req, res) => {
  const { leadId, packageId, ...input } = req.body;
  const cfg = await options.getEstimateConfig();

  if (input.propertyCategory === 'RESIDENTIAL' && !(cfg.residentialSizes || []).some((s) => s.value === input.bhk && s.active !== false)) {
    throw new ApiError(422, 'Select a valid property size', 'VALIDATION_ERROR', [{ field: 'bhk', message: 'Invalid size' }]);
  }
  if (input.area && (input.area < cfg.areaLimits.min || input.area > cfg.areaLimits.max)) {
    throw new ApiError(422, `Area must be between ${cfg.areaLimits.min} and ${cfg.areaLimits.max} sq ft`, 'VALIDATION_ERROR', [{ field: 'area', message: 'Out of range' }]);
  }
  for (const k of ['kitchens', 'bedrooms', 'washrooms']) {
    const lim = cfg.counterLimits?.[k];
    if (lim && (input[k] < lim.min || input[k] > lim.max)) {
      throw new ApiError(422, `Number of ${k} must be between ${lim.min} and ${lim.max}`, 'VALIDATION_ERROR', [{ field: k, message: 'Out of range' }]);
    }
  }
  if (input.propertyCategory === 'COMMERCIAL') delete input.bhk;

  let lead;
  if (leadId) {
    lead = await Lead.findById(leadId);
    if (!lead || String(lead.user) !== String(req.user._id)) throw ApiError.notFound('Request not found', 'LEAD_NOT_FOUND');
  }

  const { input: clean, results, packages, disclaimer } = await engine.calculateAll(input);
  const selected = pickSelected(results, packages, packageId);

  const estimate = await Estimate.create({
    estimateNumber: await nextNumber('EST'),
    user: req.user._id,
    lead: lead?._id,
    inputs: clean,
    results,
    disclaimer,
    ...selectedFields(selected),
  });

  if (lead) {
    lead.estimate = estimate._id;
    lead.propertyCategory = clean.propertyCategory;
    lead.estimateDraft = clean;
    const funnel = await options.getFunnelOptions();
    if (clean.propertyCategory === 'RESIDENTIAL' && options.isValidOption(funnel, 'bhkOptions', clean.bhk)) lead.set('property.bhk', clean.bhk);
    if (clean.area) lead.set('property.area', clean.area);
    lead.lastActivityAt = new Date();
    await lead.save();
    await logActivity({ lead: lead._id, actor: req.user, type: 'ESTIMATE_GENERATED', message: `Estimate ${estimate.estimateNumber} generated` });
  }

  created(res, { estimate: estimateView(estimate.toObject()) }, 'Estimate ready');
});

exports.selectPackage = asyncHandler(async (req, res) => {
  const estimate = await Estimate.findOne({ _id: req.params.id, user: req.user._id });
  if (!estimate) throw ApiError.notFound('Estimate not found');
  const r = estimate.results.find((x) => String(x.package) === String(req.body.packageId));
  if (!r) throw ApiError.badRequest('Package not part of this estimate', 'PACKAGE_UNAVAILABLE');
  estimate.set(selectedFields(r.toObject ? r.toObject() : r));
  await estimate.save();
  ok(res, { estimate: estimateView(estimate.toObject()) }, 'Package updated');
});

exports.get = asyncHandler(async (req, res) => {
  const estimate = await Estimate.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!estimate) throw ApiError.notFound('Estimate not found');
  ok(res, { estimate: estimateView(estimate) });
});

exports.mine = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Estimate.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Estimate.countDocuments({ user: req.user._id }),
  ]);
  ok(res, { items: items.map(estimateView) }, 'OK', 200, pageMeta(pg, total));
});

// Exposed so the package UI can show package metadata alongside results.
exports.packagesForEstimate = asyncHandler(async (req, res) => {
  const pkgs = await Package.find({ isActive: true }).sort({ order: 1 }).select('name slug headline features warranty image accent isRecommended').lean();
  ok(res, { packages: pkgs.map((p) => ({ ...p, id: String(p._id) })) });
});
