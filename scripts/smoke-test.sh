#!/bin/sh
# Smoke test: verifies the app health endpoint responds and reports OK.
# Usage: ./scripts/smoke-test.sh [base-url]
# Default base URL: http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"
URL="${BASE_URL}/api/v1/health"

printf 'Smoke test: %s ... ' "$URL"

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL")

if [ "$HTTP_CODE" = "200" ]; then
  echo "OK"
  exit 0
else
  echo "FAIL (HTTP ${HTTP_CODE:-no response})"
  exit 1
fi
