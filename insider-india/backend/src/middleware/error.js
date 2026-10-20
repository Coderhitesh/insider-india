const { ZodError } = require('zod');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

function normalize(err) {
  if (err instanceof ApiError) return err;
  if (err instanceof ZodError) return ApiError.validation(err);
  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? new ApiError(413, 'File is too large', 'FILE_TOO_LARGE')
      : new ApiError(400, err.message, 'UPLOAD_ERROR');
  }
  if (err.name === 'ValidationError' && err.errors) {
    return new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })));
  }
  if (err.name === 'CastError') return new ApiError(400, `Invalid ${err.path}`, 'INVALID_ID');
  if (err.code === 11000) {
    return new ApiError(409, 'A record with these details already exists', 'DUPLICATE',
      Object.keys(err.keyValue || {}).map((f) => ({ field: f, message: 'Already exists' })));
  }
  if (err.type === 'entity.parse.failed') return new ApiError(400, 'Malformed JSON body', 'BAD_JSON');
  if (err.type === 'entity.too.large') return new ApiError(413, 'Request body too large', 'BODY_TOO_LARGE');
  return null;
}

const notFound = (req, res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const e = normalize(err) || new ApiError(500, err.message || 'Internal error', 'INTERNAL_ERROR');
  const status = e.statusCode || 500;
  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method, requestId: req.id, user: req.user?._id });
  }
  res.status(status).json({
    success: false,
    message: status >= 500 && env.isProd ? 'Something went wrong. Please try again.' : e.message,
    code: e.code || 'INTERNAL_ERROR',
    errors: e.errors || [],
    ...(e.details ? { details: e.details } : {}),
    requestId: req.id,
  });
};

module.exports = { notFound, errorHandler };
