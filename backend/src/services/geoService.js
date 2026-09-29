const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { httpRequest } = require('../utils/http');
const logger = require('../utils/logger');
const settings = require('./settingsService');
const { MAPS_CONFIG } = require('../config/defaults');

const mapsConfig = async () => ({ ...MAPS_CONFIG, ...((await settings.get('maps.config', {})) || {}) });

// Google Places API (New), proxied server-side so the key never reaches the browser.
const key = () => {
  if (!env.google.mapsServerKey) throw ApiError.unavailable('Address search is unavailable. Please enter your address manually.', 'GEO_UNAVAILABLE');
  return env.google.mapsServerKey;
};

async function autocomplete(input, sessionToken) {
  const cfg = await mapsConfig();
  if (!cfg.autocompleteEnabled) throw ApiError.unavailable('Address search is turned off. Please enter your address manually.', 'GEO_DISABLED');
  const res = await httpRequest('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key() },
    body: JSON.stringify({ input, sessionToken, includedRegionCodes: cfg.regionCodes, languageCode: 'en' }),
    timeoutMs: 8000,
  });
  if (!res.ok) {
    logger.warn('Places autocomplete failed', { status: res.status, error: res.error || res.data?.error?.message });
    throw ApiError.unavailable('Address search is temporarily unavailable. Please enter your address manually.', 'GEO_FAILED');
  }
  return (res.data.suggestions || [])
    .filter((s) => s.placePrediction)
    .map(({ placePrediction: p }) => ({
      placeId: p.placeId,
      text: p.text?.text,
      mainText: p.structuredFormat?.mainText?.text,
      secondaryText: p.structuredFormat?.secondaryText?.text,
    }));
}

async function placeDetails(placeId, sessionToken) {
  const qs = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
  const res = await httpRequest(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${qs}`, {
    headers: { 'X-Goog-Api-Key': key(), 'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents' },
    timeoutMs: 8000,
  });
  if (!res.ok) {
    logger.warn('Place details failed', { status: res.status, error: res.error || res.data?.error?.message });
    throw ApiError.unavailable('Could not load that address. Please try again or enter it manually.', 'GEO_FAILED');
  }
  const d = res.data;
  const comps = d.addressComponents || [];
  const find = (...types) => types.map((t) => comps.find((c) => c.types?.includes(t))).find(Boolean)?.longText;
  return {
    placeId: d.id,
    formattedAddress: d.formattedAddress,
    lat: d.location?.latitude,
    lng: d.location?.longitude,
    city: find('locality', 'administrative_area_level_3', 'administrative_area_level_2'),
    state: find('administrative_area_level_1'),
    country: find('country'),
    pincode: find('postal_code'),
  };
}

const isEnabled = () => Boolean(env.google.mapsServerKey);

module.exports = { autocomplete, placeDetails, isEnabled };
