// Date ranges computed in IST (UTC+05:30).
const IST_OFFSET = 330 * 60000;
const ApiError = require('./ApiError');

const istStartOfDay = (d) => {
  const t = new Date(d.getTime() + IST_OFFSET);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - IST_OFFSET);
};
const istStartOfMonth = (d) => {
  const t = new Date(d.getTime() + IST_OFFSET);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - IST_OFFSET);
};

function parseRange({ range, from, to } = {}, fallback = '30d') {
  const now = new Date();
  const r = range || (from || to ? 'custom' : fallback);
  switch (r) {
    case 'all': return { start: new Date(0), end: now, range: r };
    case 'today': return { start: istStartOfDay(now), end: now, range: r };
    case '7d': return { start: new Date(istStartOfDay(now).getTime() - 6 * 86400000), end: now, range: r };
    case '30d': return { start: new Date(istStartOfDay(now).getTime() - 29 * 86400000), end: now, range: r };
    case 'month': return { start: istStartOfMonth(now), end: now, range: r };
    case 'custom': {
      const start = from ? istStartOfDay(new Date(from)) : new Date(0);
      const end = to ? new Date(istStartOfDay(new Date(to)).getTime() + 86400000 - 1) : now;
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw ApiError.badRequest('Invalid date range', 'INVALID_RANGE');
      if (end - start > 366 * 86400000 * 3) throw ApiError.badRequest('Date range too large', 'INVALID_RANGE');
      return { start, end, range: r };
    }
    default: throw ApiError.badRequest('Invalid date range', 'INVALID_RANGE');
  }
}

module.exports = { parseRange, istStartOfDay };
