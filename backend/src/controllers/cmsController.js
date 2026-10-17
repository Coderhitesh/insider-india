const { Project, Testimonial, Faq, GalleryCategory, GalleryImage } = require('../models');
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

// Published portfolio projects also feed the gallery, under the category with the matching slug.
const PROJECT_TO_GALLERY = { FULL_HOME: 'full-home', MODULAR_KITCHEN: 'modular-kitchen', BEDROOM: 'bedroom', WARDROBE: 'wardrobe', LIVING_ROOM: 'living-room', COMMERCIAL: 'office-commercial', RENOVATION: 'renovation' };

/** Gallery: active categories (with photo counts) and published photos. */
exports.gallery = asyncHandler(async (req, res) => {
  const cats = await GalleryCategory.find({ isActive: true }).sort({ order: 1, name: 1 }).select('name slug description coverImage seo').lean();
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const byId = new Map(cats.map((c) => [String(c._id), c]));
  const [images, projects] = await Promise.all([
    GalleryImage.find({ isPublished: true, category: { $in: cats.map((c) => c._id) } }).sort({ order: 1, createdAt: -1 }).limit(1000).select('category image title alt').lean(),
    Project.find({ isPublished: true }).sort({ order: 1 }).limit(200).select('title slug category coverImage images city').lean(),
  ]);
  const items = images.map((x) => ({ id: String(x._id), image: x.image, title: x.title || '', alt: x.alt || x.title || byId.get(String(x.category)).name, category: byId.get(String(x.category)).slug }));
  const seen = new Set(items.map((x) => x.image));
  for (const p of projects) {
    const slug = PROJECT_TO_GALLERY[p.category];
    if (!bySlug.has(slug)) continue;
    const pics = [p.coverImage, ...(p.images || []).filter((i) => i.kind === 'GALLERY').map((i) => i.url)].filter(Boolean);
    pics.forEach((url, i) => {
      if (seen.has(url)) return;
      seen.add(url);
      items.push({ id: `p-${p._id}-${i}`, image: url, title: p.title, alt: `${p.title}${p.city ? `, ${p.city}` : ''}`, category: slug, projectSlug: p.slug });
    });
  }
  const count = items.reduce((m, x) => m.set(x.category, (m.get(x.category) || 0) + 1), new Map());
  cache(res, 60);
  ok(res, {
    categories: cats.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, description: c.description || '', coverImage: c.coverImage || items.find((x) => x.category === c.slug)?.image || null, seo: c.seo || {}, count: count.get(c.slug) || 0 })),
    items,
  });
});

exports.faqs = asyncHandler(async (req, res) => {
  const filter = { isPublished: true };
  if (req.query.category) filter.category = String(req.query.category).toUpperCase();
  const items = await Faq.find(filter).sort({ order: 1 }).select('question answer category').lean();
  cache(res);
  ok(res, { items: items.map(clean) });
});
