const settings = require('./settingsService');
const { FUNNEL_OPTIONS, ESTIMATE_CONFIG, PRICING_CONFIG } = require('../config/defaults');

const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

async function getFunnelOptions({ activeOnly = true } = {}) {
  const stored = (await settings.get('funnel.options', FUNNEL_OPTIONS)) || FUNNEL_OPTIONS;
  const merged = { ...FUNNEL_OPTIONS, ...stored };
  const out = {};
  for (const [k, list] of Object.entries(merged)) {
    out[k] = (Array.isArray(list) ? list : []).filter((o) => !activeOnly || o.active !== false).sort(byOrder);
  }
  return out;
}

const isValidOption = (opts, list, value) => (opts[list] || []).some((o) => o.value === value);
const labelOf = (opts, list, value) => (opts[list] || []).find((o) => o.value === value)?.label || value || null;

async function getEstimateConfig() {
  const stored = (await settings.get('estimate.config', ESTIMATE_CONFIG)) || {};
  return { ...ESTIMATE_CONFIG, ...stored };
}

async function getPricingConfig() {
  const stored = (await settings.get('pricing.config', PRICING_CONFIG)) || {};
  return { ...PRICING_CONFIG, ...stored };
}

module.exports = { getFunnelOptions, isValidOption, labelOf, getEstimateConfig, getPricingConfig };
