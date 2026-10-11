const { Package, Service } = require('../models');
const options = require('../services/optionsService');
const otpService = require('../services/otpService');
const settings = require('../services/settingsService');
const geo = require('../services/geoService');
const { ok } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const cache = (res, s = 60) => res.set('Cache-Control', `public, max-age=${s}, stale-while-revalidate=${s * 5}`);

const packageView = (p) => ({
  id: String(p._id),
  name: p.name,
  slug: p.slug,
  headline: p.headline,
  description: p.description,
  features: p.features,
  warranty: p.warranty,
  image: p.image,
  accent: p.accent,
  isRecommended: p.isRecommended,
  pricing: p.pricing,
  hasAreaRate: Boolean(p.areaRate?.minPerSqft && p.areaRate?.maxPerSqft),
});

exports.packages = asyncHandler(async (req, res) => {
  const pkgs = await Package.find({ isActive: true }).sort({ order: 1 }).lean();
  cache(res);
  ok(res, { packages: pkgs.map(packageView) });
});

exports.packageBySlug = asyncHandler(async (req, res) => {
  const p = await Package.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!p) throw ApiError.notFound('Package not found');
  cache(res);
  ok(res, { package: packageView(p) });
});

exports.services = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.context === 'booking') filter.showInBooking = true;
  const items = await Service.find(filter).sort({ order: 1 }).select('title slug icon image description').lean();
  cache(res);
  ok(res, { services: items.map((s) => ({ ...s, id: String(s._id), _id: undefined })) });
});

exports.funnelOptions = asyncHandler(async (req, res) => {
  const [opts, pricing, otp, maps] = await Promise.all([options.getFunnelOptions(), options.getPricingConfig(), otpService.getConfig(), settings.get('maps.config', {})]);
  cache(res);
  ok(res, {
    ...opts,
    floorPlanAssistanceCharge: pricing.floorPlanAssistanceCharge,
    otp: { length: otp.length, channels: otp.channels, resendCooldownSeconds: otp.resendCooldownSeconds },
    addressAutocomplete: geo.isEnabled() && (maps?.autocompleteEnabled ?? true),
  });
});

exports.site = asyncHandler(async (req, res) => {
  const pub = await settings.getPublic();
  const stats = (pub['site.stats']?.items || []).filter((s) => s.visible && s.value !== null && s.value !== '');
  cache(res, 120);
  ok(res, { company: pub['company.profile'] || {}, stats });
});
