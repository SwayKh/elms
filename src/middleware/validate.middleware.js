const { ApiError } = require('../utils/ApiError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.validation(details, 'Validation failed'));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
