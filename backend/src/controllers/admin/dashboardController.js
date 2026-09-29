const { getMetrics } = require('../../services/dashboardService');
const { assignedScope } = require('../../services/scopeService');
const { parseRange } = require('../../utils/dateRange');
const { ok } = require('../../utils/respond');
const asyncHandler = require('../../utils/asyncHandler');

exports.metrics = asyncHandler(async (req, res) => {
  const range = parseRange(req.validatedQuery, '30d');
  const data = await getMetrics(range, assignedScope(req.user));
  ok(res, { range: { key: range.range, start: range.start, end: range.end }, ...data });
});
