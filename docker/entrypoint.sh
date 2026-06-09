#!/bin/sh
set -e

SECRETS_FILE="/data/generated-secrets.env"

# On first start, generate any secrets the operator has not provided.
# Generated values are stored in a named volume so they survive restarts.
if [ ! -f "$SECRETS_FILE" ]; then
  echo "[customrisk] First start — generating secrets..."
  mkdir -p /data
  printf 'GENERATED_JWT_ACCESS_SECRET=%s\nGENERATED_JWT_REFRESH_SECRET=%s\n' \
    "$(openssl rand -hex 32)" \
    "$(openssl rand -hex 32)" \
    > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
fi

# shellcheck source=/dev/null
. "$SECRETS_FILE"

# Use generated secrets if the operator has not provided their own.
# An empty string in the environment is treated the same as unset.
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-$GENERATED_JWT_ACCESS_SECRET}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$GENERATED_JWT_REFRESH_SECRET}"

echo "[customrisk] Applying database migrations..."
node_modules/.bin/prisma migrate deploy --config backend/prisma.config.ts --schema backend/prisma/schema.prisma

if [ -n "$SEED_ADMIN_PASSWORD" ]; then
  echo "[customrisk] SEED_ADMIN_PASSWORD is set — seeding admin account..."
  if [ "$SEED_DEMO_DATA" = "true" ]; then
    echo "[customrisk] SEED_DEMO_DATA=true — demo users, registers, and risks will also be created."
  fi
  node backend/dist-seed/prisma/seed.js
  echo "[customrisk] Seed complete."
fi

echo "[customrisk] Starting server..."
exec node backend/dist/server.js
