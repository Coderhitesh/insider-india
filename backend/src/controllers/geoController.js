const geo = require('../services/geoService');
const { ok } = require('../utils/respond');
const asyncHandler = require('../utils/asyncHandler');

exports.autocomplete = asyncHandler(async (req, res) => {
  const { q, sessionToken } = req.validatedQuery;
  ok(res, { suggestions: await geo.autocomplete(q, sessionToken) });
});

exports.place = asyncHandler(async (req, res) => {
  ok(res, { place: await geo.placeDetails(req.params.placeId, req.validatedQuery.sessionToken) });
});
