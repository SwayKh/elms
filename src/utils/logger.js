const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  console[level === 'http' ? 'log' : level](`[${timestamp()}] [${level.toUpperCase()}] ${message}`, meta ?? '');
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  http: (message, meta) => log('http', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};

module.exports = { logger, LEVELS };
