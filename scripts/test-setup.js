/**
 * Prepares the test database for integration tests.
 *
 * Loads .env.test and applies the Prisma schema to the test database.
 * Run with: npm run test:integration (this file runs automatically).
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env.test');

if (!fs.existsSync(envPath)) {
  console.error(
    'Missing .env.test. Copy .env.test.example to .env.test and point DATABASE_URL at a test database.',
  );
  process.exit(1);
}

require('dotenv').config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.test');
  process.exit(1);
}

console.log('Applying Prisma schema to the test database...');
execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
execSync('npx prisma db push --skip-generate --accept-data-loss', {
  stdio: 'inherit',
  env: process.env,
});
console.log('Test database is ready.');
