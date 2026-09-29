class ApiError extends Error {
  constructor(statusCode, message, code, errors = [], details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(msg = 'Bad request', code = 'BAD_REQUEST', errors) { return new ApiError(400, msg, code, errors); }
  static unauthorized(msg = 'Authentication required', code = 'UNAUTHORIZED') { return new ApiError(401, msg, code); }
  static forbidden(msg = 'You do not have permission to perform this action', code = 'FORBIDDEN') { return new ApiError(403, msg, code); }
  static notFound(msg = 'Not found', code = 'NOT_FOUND') { return new ApiError(404, msg, code); }
  static conflict(msg = 'Conflict', code = 'CONFLICT', details) { return new ApiError(409, msg, code, [], details); }
  static unprocessable(msg, code = 'UNPROCESSABLE', details) { return new ApiError(422, msg, code, [], details); }
  static tooMany(msg = 'Too many requests. Please try again later.', code = 'RATE_LIMITED', details) { return new ApiError(429, msg, code, [], details); }
  static unavailable(msg = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') { return new ApiError(503, msg, code); }

  static validation(zodError) {
    const errors = zodError.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return new ApiError(422, 'Please check the highlighted fields', 'VALIDATION_ERROR', errors);
  }
}

module.exports = ApiError;
