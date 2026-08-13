const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const apiRoutes = require('./routes');
const { apiLimiter } = require('./middleware/rate-limit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { logger } = require('./utils/logger');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Allow remote cover images (e.g. Open Library) to render in the test UI.
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '2mb' }));

  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      const line = `${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`;
      if (res.statusCode >= 400) {
        logger.warn(line);
      } else {
        logger.http(line);
      }
    });
    next();
  });

  // Health check (unauthenticated, unratelimited)
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Minimal test UI served from /public (index.html at the site root)
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api', apiLimiter);
  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
