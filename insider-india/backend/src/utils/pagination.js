function parsePagination(query = {}, { maxLimit = 100, defaultLimit = 20 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

const pageMeta = ({ page, limit }, total) => ({ page, limit, total, pages: Math.ceil(total / limit) || 1 });

module.exports = { parsePagination, pageMeta };
