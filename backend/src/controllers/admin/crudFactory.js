const { ok, created } = require('../../utils/respond');
const { parsePagination, pageMeta } = require('../../utils/pagination');
const { escapeRegex, uniqueSlug } = require('../../utils/text');
const { audit } = require('../../services/auditService');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Generic admin CRUD for simple catalogue/CMS collections.
 * opts: { Model, entityType, createSchema, updateSchema, searchFields, slugFrom, filters(q)=>{},
 *         sort, inUse(doc)=>Promise<boolean>, auditFields: [..] (fields whose changes are audited in detail) }
 */
function crud(opts) {
  const { Model, entityType, createSchema, updateSchema, searchFields = [], slugFrom, sort = { order: 1, createdAt: -1 }, inUse, auditFields } = opts;
  const view = (d) => ({ ...d, id: String(d._id), _id: undefined, __v: undefined });
  const pick = (doc, fields) => Object.fromEntries((fields || Object.keys(doc)).map((f) => [f, doc[f]]));

  const list = asyncHandler(async (req, res) => {
    const pg = parsePagination(req.query, { maxLimit: 200, defaultLimit: 50 });
    const filter = opts.filters ? opts.filters(req.query) : {};
    if (req.query.q && searchFields.length) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 100)), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    if (req.query.active === 'true' || req.query.active === 'false') {
      const field = Model.schema.path('isActive') ? 'isActive' : 'isPublished';
      filter[field] = req.query.active === 'true';
    }
    const [items, total] = await Promise.all([
      Model.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).lean(),
      Model.countDocuments(filter),
    ]);
    ok(res, { items: items.map(view) }, 'OK', 200, pageMeta(pg, total));
  });

  const get = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id).lean();
    if (!doc) throw ApiError.notFound(`${entityType} not found`);
    ok(res, { item: view(doc) });
  });

  const create = asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    if (slugFrom && Model.schema.path('slug')) data.slug = await uniqueSlug(Model, data.slug || data[slugFrom]);
    if (Model.schema.path('order') && data.order === undefined) {
      const last = await Model.findOne().sort({ order: -1 }).select('order').lean();
      data.order = (last?.order || 0) + 1;
    }
    const doc = await Model.create(data);
    await audit(req, { action: `${entityType.toUpperCase()}_CREATED`, entityType, entityId: doc._id, after: pick(doc.toObject(), auditFields) });
    created(res, { item: view(doc.toObject()) }, `${entityType} created`);
  });

  const update = asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const doc = await Model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${entityType} not found`);
    const before = pick(doc.toObject(), auditFields || Object.keys(data));
    if (slugFrom && data.slug !== undefined) data.slug = await uniqueSlug(Model, data.slug || doc[slugFrom], doc._id);
    doc.set(data);
    await doc.save();
    const after = pick(doc.toObject(), auditFields || Object.keys(data));
    await audit(req, { action: `${entityType.toUpperCase()}_UPDATED`, entityType, entityId: doc._id, before, after, reason: req.body.reason });
    ok(res, { item: view(doc.toObject()) }, `${entityType} updated`);
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${entityType} not found`);
    if (inUse && (await inUse(doc))) {
      if (!Model.schema.path('isActive')) throw ApiError.conflict(`${entityType} is in use and cannot be deleted`, 'IN_USE');
      doc.isActive = false;
      await doc.save();
      await audit(req, { action: `${entityType.toUpperCase()}_DEACTIVATED`, entityType, entityId: doc._id, reason: 'Delete requested while in use' });
      return ok(res, { deactivated: true }, `${entityType} is in use, so it was deactivated instead of deleted`);
    }
    await doc.deleteOne();
    await audit(req, { action: `${entityType.toUpperCase()}_DELETED`, entityType, entityId: doc._id, before: pick(doc.toObject(), auditFields) });
    return ok(res, { deleted: true }, `${entityType} deleted`);
  });

  const reorder = asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length || ids.length > 500 || !ids.every((i) => /^[a-f\d]{24}$/i.test(i))) throw ApiError.badRequest('Provide ids in the desired order');
    await Model.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: i + 1 } } } })));
    await audit(req, { action: `${entityType.toUpperCase()}_REORDERED`, entityType, meta: { ids } });
    ok(res, {}, 'Order saved');
  });

  return { list, get, create, update, remove, reorder };
}

module.exports = { crud };
