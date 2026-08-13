const { ApiError } = require('../utils/ApiError');

function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', 'UNAUTHENTICATED'));
  }
  if (req.user.role !== 'ADMIN') {
    return next(ApiError.forbidden('Admin access required', 'ADMIN_REQUIRED'));
  }
  return next();
}

module.exports = { authorizeAdmin };
