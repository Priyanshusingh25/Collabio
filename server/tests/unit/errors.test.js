/**
 * Unit tests — error hierarchy + standardized API response envelope.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AppError, ValidationError, AuthenticationError, AuthorizationError,
  NotFoundError, ConflictError, RateLimitError, DatabaseError,
} = require('../../src/utils/AppError');
const { ok, fail, parsePagination, parseCursor } = require('../../src/utils/apiResponse');

/** Minimal Express response double — captures status, headers and body. */
function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(key, value) { this.headers[key] = value; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

test('each error type maps to the right HTTP status and code', () => {
  const cases = [
    [new AppError('boom', 418, 'TEAPOT'), 418, 'TEAPOT'],
    [new ValidationError('bad'), 400, 'VALIDATION_ERROR'],
    [new AuthenticationError(), 401, 'UNAUTHENTICATED'],
    [new AuthorizationError(), 403, 'FORBIDDEN'],
    [new NotFoundError('Deal'), 404, 'RESOURCE_NOT_FOUND'],
    [new ConflictError('dup'), 409, 'CONFLICT'],
    [new RateLimitError(), 429, 'RATE_LIMITED'],
    [new DatabaseError('sql'), 500, 'DATABASE_ERROR'],
  ];
  for (const [err, status, code] of cases) {
    assert.equal(err.status, status, `${err.constructor.name} status`);
    assert.equal(err.code, code, `${err.constructor.name} code`);
    assert.ok(err instanceof Error);
    assert.ok(err instanceof AppError);
  }
});

test('NotFoundError names the resource without leaking internals', () => {
  const err = new NotFoundError('Invoice');
  assert.match(err.message, /Invoice not found/);
  assert.equal(/SELECT|sqlite/i.test(err.message), false);
});

test('ValidationError carries per-field messages', () => {
  const err = new ValidationError('Invalid request', { email: 'Invalid email address' });
  assert.deepEqual(err.fields, { email: 'Invalid email address' });
});

test('ok() wraps data with the success envelope', () => {
  const res = mockRes();
  ok(res, { id: 1, title: 'Reel' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, { id: 1, title: 'Reel' });
  // meta is omitted entirely when there is nothing to report
  assert.equal(Object.prototype.hasOwnProperty.call(res.body, 'meta'), false);
});

test('ok() preserves pagination meta', () => {
  const res = mockRes();
  ok(res, [1, 2], { meta: { page: 2, limit: 2, total: 10 } });
  assert.deepEqual(res.body.meta, { page: 2, limit: 2, total: 10 });
});

test('ok() honours an explicit status code', () => {
  const res = mockRes();
  ok(res, { id: 9 }, { status: 201 });
  assert.equal(res.statusCode, 201);
});

test('fail() produces the documented error envelope', () => {
  const res = mockRes();
  fail(res, new NotFoundError('Deal'));
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'RESOURCE_NOT_FOUND');
  assert.equal(res.body.error.message, 'Deal not found');
});

test('fail() forwards validation fields and rate-limit retry metadata', () => {
  const res = mockRes();
  fail(res, {
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Slow down',
    fields: { email: 'Invalid email address' },
    retryAfterSeconds: 30,
  });
  assert.equal(res.statusCode, 429);
  assert.deepEqual(res.body.error.fields, { email: 'Invalid email address' });
  assert.equal(res.headers['Retry-After'], '30');
  assert.equal(res.body.error.retryAfterSeconds, 30);
});

test('fail() never leaks a raw error object as the message', () => {
  const res = mockRes();
  fail(res, {});
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.equal(typeof res.body.error.message, 'string');
});

test('parsePagination applies safe defaults and clamps limits', () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 50, offset: 0 });
  assert.deepEqual(parsePagination({ page: '3', limit: '20' }), { page: 3, limit: 20, offset: 40 });
  // Absurd inputs must never produce a giant OFFSET/LIMIT.
  const clamped = parsePagination({ page: '-5', limit: '999999' });
  assert.equal(clamped.page, 1);
  assert.ok(clamped.limit <= 200);
});

test('parseCursor decodes an opaque numeric cursor safely', () => {
  assert.equal(parseCursor({}), null);
  assert.equal(parseCursor({ cursor: '' }), null);
  assert.equal(parseCursor({ cursor: 'abc' }), null);
  assert.equal(parseCursor({ cursor: '-4' }), null);
  assert.equal(parseCursor({ cursor: '0' }), null);
  assert.equal(parseCursor({ cursor: '17' }), 17);
});