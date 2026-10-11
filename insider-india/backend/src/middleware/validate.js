const ApiError = require('../utils/ApiError');

// validate({ body, query, params }) — zod schemas; parsed values replace the originals.
const validate = (schemas) => (req, res, next) => {
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const r = schemas[part].safeParse(req[part] ?? {});
    if (!r.success) return next(ApiError.validation(r.error));
    if (part === 'query') req.validatedQuery = r.data;
    else req[part] = r.data;
  }
  return next();
};

module.exports = validate;
