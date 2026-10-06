/** Typed HTTP error -> handled by the error middleware (never leaks stack traces). */
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const badRequest = (msg, code = 'bad_request') => new ApiError(400, code, msg);
const unauthorized = (msg = 'Authentication required', code = 'unauthorized') => new ApiError(401, code, msg);
const forbidden = (msg = 'Not allowed', code = 'forbidden') => new ApiError(403, code, msg);
const notFound = (msg = 'Not found', code = 'not_found') => new ApiError(404, code, msg);
const conflict = (msg = 'Conflict', code = 'conflict') => new ApiError(409, code, msg);
const tooMany = (msg = 'Too many requests', code = 'rate_limited') => new ApiError(429, code, msg);

/** Wrap async route handlers so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Parse a zod schema; on failure raise a 400 with the first issue message. */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
    throw badRequest(`${where}${issue.message}`, 'validation_error');
  }
  return result.data;
}

module.exports = { ApiError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany, asyncHandler, validate };
