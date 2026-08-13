const { ApiError } = require('../utils/ApiError');
const { logger } = require('../utils/logger');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Multer upload errors
  if (err && err.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      success: false,
      error: { code: status === 413 ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR', message: err.message },
    });
  }

  // Body parser errors (malformed JSON etc.)
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' },
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational || statusCode < 500;
  const message = isOperational ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    logger.error('Unhandled error', err);
  }

  const body = {
    success: false,
    error: {
      code: err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR'),
      message,
    },
  };
  if (err.details) {
    body.error.details = err.details;
  }

  return res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
