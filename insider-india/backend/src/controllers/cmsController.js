const { Project, Testimonial, Faq } = require('../models');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { ok } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const cache = (res, s = 120) => res.set('Cache-Control', `public, max-age=${s}, stale-while-revalidate=${s * 5}`);
const clean = (d) => ({ ...d, id: String(d._id), _id: undefined, __v: undefined });

exports.projects = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { maxLimit: 48, defaultLimit: 12 });
  const filter = { isPublished: true };
  if (req.query.category) filter.category = String(req.query.category).toUpperCase();
  if (req.query.featured === 'true') filter.isFeatured = true;
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ isFeatured: -1, order: 1, createdAt: -1 }).skip(pg.skip).limit(pg.limit)
      .select('title slug category city locality bhk area summary coverImage isFeatured completedOn').lean(),
    Project.countDocuments(filter),
  ]);
  cache(res);
  ok(res, { items: items.map(clean) }, 'OK', 200, pageMeta(pg, total));
});

exports.projectBySlug = asyncHandler(async (req, res) => {
  const p = await Project.findOne({ slug: req.params.slug, isPublished: true }).lean();
  if (!p) throw ApiError.notFound('Project not found');
  const related = await Project.find({ isPublished: true, category: p.category, _id: { $ne: p._id } })
    .sort({ order: 1 }).limit(3).select('title slug category city coverImage summary').lean();
  cache(res);
  ok(res, { project: clean(p), related: related.map(clean) });
});

exports.slugs = asyncHandler(async (req, res) => {
  const items = await Project.find({ isPublished: true }).select('slug updatedAt').lean();
  cache(res, 600);
  ok(res, { items: items.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })) });
});

exports.testimonials = asyncHandler(async (req, res) => {
  const items = await Testimonial.find({ isPublished: true }).sort({ order: 1 }).limit(50).select('name city quote rating photo project').lean();
  cache(res);
  ok(res, { items: items.map(clean) });
});

exports.faqs = asyncHandler(async (req, res) => {
  const filter = { isPublished: true };
  if (req.query.category) filter.category = String(req.query.category).toUpperCase();
  const items = await Faq.find(filter).sort({ order: 1 }).select('question answer category').lean();
  cache(res);
  ok(res, { items: items.map(clean) });
});
