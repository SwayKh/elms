const path = require('path');
const { z } = require('zod');

if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.test') });
} else {
  require('dotenv').config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PRISMA_CONNECTION_LIMIT: z.coerce.number().int().positive().default(1),
  PG_BOUNCER: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  STORAGE_PATH: z.string().default('./storage'),
  AI_API_BASE_URL: z.string().url().default('https://ai-api.userfacet.com'),
  AI_API_TOKEN: z.string().default(''),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_CLIENT: z.enum(['real', 'fake']).default('real'),
  OPEN_LIBRARY_BASE_URL: z.string().url().default('https://openlibrary.org'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOAN_DURATION_DAYS: z.coerce.number().int().positive().default(14),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

module.exports = { env: parsed.data };
