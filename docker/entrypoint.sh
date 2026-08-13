#!/bin/sh
set -e

echo "[entrypoint] Applying database schema (prisma db push)..."
tries=0
until ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "[entrypoint] Database not reachable after retries, giving up."
    exit 1
  fi
  echo "[entrypoint] Database not ready yet, retrying in 2s..."
  sleep 2
done

if [ "$DB_SEED" = "true" ]; then
  echo "[entrypoint] Seeding demo data (admin + user accounts)..."
  node prisma/seed.js
fi

echo "[entrypoint] Starting server on port ${PORT:-3000}..."
exec node src/server.js
