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
function pickPackage(results, packages, budget) {
  const available = results.filter((r) => r.available);
  if (!available.length) return results[0] || null;
  if (budget?.min || budget?.max) {
    const target = budget.max ? (budget.min + budget.max) / 2 : budget.min * 1.15;
    return available.reduce((best, r) => (Math.abs((r.finalMin + r.finalMax) / 2 - target) < Math.abs((best.finalMin + best.finalMax) / 2 - target) ? r : best));
  }
  const rec = packages.find((p) => p.isRecommended);
  return available.find((r) => rec && String(r.package) === String(rec._id)) || available[0];
}

/**
 * Creates an indicative estimate for a direct booking (customer never used the calculator),
 * from BHK, typical room counts and the selected services. Never throws — a booking must not fail on this.
 */
async function autoEstimateForLead(lead) {
  try {
    if (lead.propertyCategory === 'COMMERCIAL' || !lead.property?.bhk) return null;
    const [cfg, funnel] = await Promise.all([options.getEstimateConfig(), options.getFunnelOptions({ activeOnly: false })]);
    const counters = cfg.defaultCounters?.[lead.property.bhk] || { kitchens: 1, bedrooms: 2, washrooms: 2 };
    const addons = [...new Set((lead.services || []).map((s) => SERVICE_TO_ADDON[s.slug]).filter(Boolean))];
    const input = { propertyCategory: 'RESIDENTIAL', bhk: lead.property.bhk, ...counters, addons };
    const { input: clean, results, packages, disclaimer } = await engine.calculateAll(input);
    const budget = (funnel.budgetRanges || []).find((b) => b.value === lead.budgetRange);
    const sel = pickPackage(results, packages, budget);
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
