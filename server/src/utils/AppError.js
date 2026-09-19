/**
 * Typed application errors with stable machine-readable codes.
 * Never leak raw driver errors to clients — the error handler maps them.
 */
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', fields = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message = 'Invalid request', fields = undefined) {
    super(message, 400, 'VALIDATION_ERROR', fields);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(entity = 'Resource') {
    super(`${entity} not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(retryAfterSeconds) {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class DatabaseError extends AppError {
  constructor(message = 'A database error occurred') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
};
