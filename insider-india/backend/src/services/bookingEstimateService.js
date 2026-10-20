const { Estimate } = require('../models');
const engine = require('./estimateEngine');
const options = require('./optionsService');
const { nextNumber } = require('../utils/sequence');
const logger = require('../utils/logger');

// Booking services → estimator add-on rules (Modern Kitchen is already part of every package base).
const SERVICE_TO_ADDON = {
  'modern-wardrobe-storage': 'wardrobe', 'wall-panelling': 'wall_panelling', 'false-ceiling': 'false_ceiling',
  painting: 'painting', 'furniture-doors': 'furniture', 'tv-units': 'tv_unit', 'pooja-units': 'pooja_unit',
};

// Pick the package whose range best matches the customer's budget answer; else the recommended one.
// Recommended package (or the first available one).
function pickPackage(results, packages) {
  const available = results.filter((r) => r.available);
  if (!available.length) return results[0] || null;
  const rec = packages.find((p) => p.isRecommended);
  return available.find((r) => rec && String(r.package) === String(rec._id)) || available[0];
}

/**
 * Creates an indicative estimate for a direct booking (customer never used the calculator),
 * from BHK, typical room counts and the selected services. Never throws — a booking must not fail on this.
 */
/** Commercial direct booking: area + space type with the typical quantities for that type. */
async function autoCommercialEstimate(lead, cfg) {
  const area = Number(lead.property?.area);
  const type = lead.property?.commercialType || lead.estimateDraft?.commercialType;
  if (!area) return null;
  const { EstimateRule } = require('../models');
  const unitRules = await EstimateRule.find({ isActive: true, type: 'UNIT' }).select('key appliesTo commercialTypes defaultQty').lean();
  const units = Object.fromEntries(unitRules
    .filter((u) => (u.appliesTo || 'COMMERCIAL') !== 'RESIDENTIAL' && (!u.commercialTypes?.length || u.commercialTypes.includes(type)) && u.defaultQty > 0)
    .map((u) => [u.key, u.defaultQty]));
  const input = { propertyCategory: 'COMMERCIAL', area, commercialType: type, units, kitchens: 0, bedrooms: 0, washrooms: 0, addons: [] };
  const { input: clean, results, packages, disclaimer } = await engine.calculateAll(input);
  const sel = pickPackage(results, packages);
  return Estimate.create({
    estimateNumber: await nextNumber('EST'), user: lead.user, lead: lead._id, source: 'AUTO_BOOKING', inputs: clean, results, disclaimer,
    ...(sel ? { selectedPackage: sel.package, baseMin: sel.baseMin, baseMax: sel.baseMax, adjustments: sel.adjustments || [], finalMin: sel.finalMin, finalMax: sel.finalMax } : {}),
  });
}

async function autoEstimateForLead(lead) {
  try {
    const cfg = await options.getEstimateConfig();
    if (lead.propertyCategory === 'COMMERCIAL') return await autoCommercialEstimate(lead, cfg);
    if (!lead.property?.bhk) return null;
    const counters = cfg.defaultCounters?.[lead.property.bhk] || { kitchens: 1, bedrooms: 2, washrooms: 2 };
    const addons = [...new Set((lead.services || []).map((s) => SERVICE_TO_ADDON[s.slug]).filter(Boolean))];
    const input = { propertyCategory: 'RESIDENTIAL', bhk: lead.property.bhk, ...counters, addons };
    const { input: clean, results, packages, disclaimer } = await engine.calculateAll(input);
    const sel = pickPackage(results, packages);
    return Estimate.create({
      estimateNumber: await nextNumber('EST'),
      user: lead.user,
      lead: lead._id,
      source: 'AUTO_BOOKING',
      inputs: clean,
      results,
      disclaimer,
      ...(sel ? { selectedPackage: sel.package, baseMin: sel.baseMin, baseMax: sel.baseMax, adjustments: sel.adjustments || [], finalMin: sel.finalMin, finalMax: sel.finalMax } : {}),
    });
  } catch (err) {
    logger.error('Auto estimate failed', { lead: String(lead._id), error: err.message });
    return null;
  }
}

// Compact, customer-safe budget summary for booking views.
function budgetSummary(est) {
  if (!est) return null;
  const sel = (est.results || []).find((r) => String(r.package) === String(est.selectedPackage)) || null;
  return {
    estimateId: String(est._id),
    source: est.source || 'CALCULATOR',
    packageName: sel?.packageName || null,
    available: Boolean(sel?.available),
    min: sel?.available ? sel.finalMin : null,
    max: sel?.available ? sel.finalMax : null,
    packages: (est.results || []).map((r) => ({ name: r.packageName, available: r.available, min: r.finalMin ?? null, max: r.finalMax ?? null })),
    note: 'Indicative budget only — this is not the final price. Your final quotation is prepared after the site visit and measurements.',
  };
}

module.exports = { autoEstimateForLead, budgetSummary, SERVICE_TO_ADDON };
