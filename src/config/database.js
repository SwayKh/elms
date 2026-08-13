const { PrismaClient } = require('@prisma/client');
const { env } = require('./env');

/**
 * Hosted/serverless Postgres providers (Neon, Supabase pooler, etc.) cap the
 * number of concurrent connections well below Prisma's default pool size
 * (which scales with CPU count and can be 10-20). That makes the pool stall
 * and requests fail with P2024 ("timed out fetching a connection").
 *
 * We therefore default to a single pooled connection and merge it (plus an
 * optional PgBouncer flag for Neon/Supabase) into the connection string.
 */
function buildDatabaseUrl() {
  const url = new URL(env.DATABASE_URL);
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', String(env.PRISMA_CONNECTION_LIMIT));
  }
  if (env.PG_BOUNCER && !url.searchParams.has('pgbouncer')) {
    url.searchParams.set('pgbouncer', 'true');
  }
  return url.toString();
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: buildDatabaseUrl() },
  },
});

async function connectDB() {
  await prisma.$connect();
}

async function disconnectDB() {
  await prisma.$disconnect();
}

module.exports = { prisma, connectDB, disconnectDB };
