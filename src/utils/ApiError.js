const DEFAULT_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

class ApiError extends Error {
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || DEFAULT_CODES[statusCode] || 'ERROR';
    this.details = details || null;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'You are not allowed to perform this action', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static validation(details, message = 'Validation failed') {
    return new ApiError(400, message, 'VALIDATION_ERROR', details);
  }

  static tooLarge(message = 'Uploaded file is too large', code = 'PAYLOAD_TOO_LARGE') {
    return new ApiError(413, message, code);
  }

  static unavailable(message, code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, message, code);
  }

  static badGateway(message, code = 'BAD_GATEWAY') {
    return new ApiError(502, message, code);
  }
}

module.exports = { ApiError, DEFAULT_CODES };
