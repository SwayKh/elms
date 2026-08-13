const { ApiError } = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication required', 'UNAUTHENTICATED'));
  }

  const token = header.slice(7).trim();
  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access token expired', 'TOKEN_EXPIRED'));
    }
    return next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }

  if (!payload || !payload.sub) {
    return next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }

  req.user = { id: payload.sub, role: payload.role };
  return next();
}

function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const payload = verifyToken(header.slice(7).trim());
    req.user = payload && payload.sub ? { id: payload.sub, role: payload.role } : null;
  } catch {
    req.user = null;
  }
  return next();
}

module.exports = { authenticate, optionalAuthenticate };
