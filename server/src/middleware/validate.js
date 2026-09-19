/**
 * Zod validation middleware. Body/query/params are parsed into `req.validated`.
 * The frontend receives precise per-field messages via the standard envelope.
 */
const { ValidationError } = require('../utils/AppError');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const raw = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const result = schema.safeParse(raw);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        if (!fields[key]) fields[key] = issue.message;
      }
      return next(new ValidationError('Please correct the highlighted fields', fields));
    }
    req.validated = { ...(req.validated || {}), [source]: result.data };
    next();
  };
}

module.exports = { validate };
