const { env } = require('./config/env');
const { createApp } = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const { logger } = require('./utils/logger');

let server;

async function start() {
  await connectDB();
  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`E-Library backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down...`);
  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start server', err);
    process.exit(1);
  });
}

module.exports = { start };
