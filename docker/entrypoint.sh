#!/bin/sh
set -e

echo "[customrisk] Applying database migrations..."
node_modules/.bin/prisma migrate deploy --schema backend/prisma/schema.prisma

if [ -n "$SEED_ADMIN_PASSWORD" ]; then
  echo "[customrisk] SEED_ADMIN_PASSWORD is set — running seed..."
  node backend/dist-seed/prisma/seed.js
  echo "[customrisk] Seed complete."
fi

echo "[customrisk] Starting server..."
exec node backend/dist/server.js
