#!/usr/bin/env bash
set -euo pipefail

# Run this from inside the existing customRisk folder.
ROOT="."

dirs=(
  "docs/product"
  "docs/architecture"
  "docs/planning"
  "docs/decisions"
  "docs/prompts"

  "frontend/public"
  "frontend/src/api"
  "frontend/src/assets"
  "frontend/src/components/AppShell"
  "frontend/src/components/DataTable"
  "frontend/src/components/EmptyState"
  "frontend/src/components/ErrorState"
  "frontend/src/components/LoadingState"
  "frontend/src/components/ConfirmDialog"
  "frontend/src/components/FormControls"
  "frontend/src/components/RiskLevelBadge"
  "frontend/src/components/ReviewStatusBadge"
  "frontend/src/features/auth"
  "frontend/src/features/home"
  "frontend/src/features/registers"
  "frontend/src/features/risks"
  "frontend/src/features/configuration"
  "frontend/src/features/users"
  "frontend/src/features/audit"
  "frontend/src/hooks"
  "frontend/src/layouts"
  "frontend/src/router"
  "frontend/src/types"
  "frontend/src/utils"

  "backend/prisma/migrations"
  "backend/src/config"
  "backend/src/routes"
  "backend/src/controllers"
  "backend/src/services"
  "backend/src/repositories"
  "backend/src/middleware"
  "backend/src/validators"
  "backend/src/auth"
  "backend/src/audit"
  "backend/src/permissions"
  "backend/src/utils"
  "backend/src/types"

  "shared/src/api"
  "shared/src/enums"
  "shared/src/schemas"
  "shared/src/types"

  "scripts/dev"
  "scripts/db"
  "scripts/seed"
  "scripts/maintenance"

  "tests/e2e"
  "tests/fixtures"
  "tests/api"

  ".github/workflows"
  ".github/ISSUE_TEMPLATE"
)

files=(
  "README.md"
  "LICENSE"
  ".gitignore"
  ".env.example"
  ".editorconfig"
  "docker-compose.yml"
  "Dockerfile"

  "docs/architecture/API_Route_Map.md"
  "docs/architecture/Prisma_Schema_Design.md"
  "docs/architecture/Security_Model.md"
  "docs/architecture/Permission_Model.md"
  "docs/architecture/Audit_Model.md"

  "docs/planning/Implementation_Backlog.md"
  "docs/planning/AI_Build_Instructions.md"
  "docs/planning/Phase_1_Foundation.md"
  "docs/planning/Phase_2_Risk_Register_Core.md"
  "docs/planning/Phase_3_Configuration.md"
  "docs/planning/Phase_4_Scoring.md"
  "docs/planning/Phase_5_Reviews_Dashboard.md"
  "docs/planning/Phase_6_Hardening.md"

  "docs/decisions/ADR-0001-technical-stack.md"
  "docs/decisions/ADR-0002-authentication-token-strategy.md"
  "docs/decisions/ADR-0003-audit-model.md"

  "docs/prompts/001-create-prisma-schema.md"
  "docs/prompts/002-build-auth-foundation.md"
  "docs/prompts/003-build-registers.md"
  "docs/prompts/004-build-risk-core.md"

  "frontend/package.json"
  "frontend/tsconfig.json"
  "frontend/vite.config.ts"
  "frontend/index.html"
  "frontend/src/main.tsx"

  "frontend/src/api/client.ts"
  "frontend/src/api/auth.api.ts"
  "frontend/src/api/users.api.ts"
  "frontend/src/api/registers.api.ts"
  "frontend/src/api/risks.api.ts"
  "frontend/src/api/configuration.api.ts"
  "frontend/src/api/audit.api.ts"
  "frontend/src/api/exports.api.ts"

  "frontend/src/layouts/MainLayout.tsx"
  "frontend/src/layouts/AuthLayout.tsx"
  "frontend/src/router/routes.tsx"

  "frontend/src/hooks/useCurrentUser.ts"
  "frontend/src/hooks/usePermissions.ts"
  "frontend/src/hooks/useDebouncedValue.ts"

  "frontend/src/types/ui.ts"

  "frontend/src/utils/dates.ts"
  "frontend/src/utils/riskStatus.ts"
  "frontend/src/utils/formatters.ts"

  "backend/package.json"
  "backend/tsconfig.json"
  "backend/prisma/schema.prisma"
  "backend/prisma/seed.ts"

  "backend/src/server.ts"
  "backend/src/app.ts"

  "backend/src/config/env.ts"
  "backend/src/config/logger.ts"
  "backend/src/config/cors.ts"

  "backend/src/routes/auth.routes.ts"
  "backend/src/routes/users.routes.ts"
  "backend/src/routes/registers.routes.ts"
  "backend/src/routes/risks.routes.ts"
  "backend/src/routes/configuration.routes.ts"
  "backend/src/routes/audit.routes.ts"
  "backend/src/routes/exports.routes.ts"

  "backend/src/controllers/auth.controller.ts"
  "backend/src/controllers/users.controller.ts"
  "backend/src/controllers/registers.controller.ts"
  "backend/src/controllers/risks.controller.ts"
  "backend/src/controllers/configuration.controller.ts"
  "backend/src/controllers/audit.controller.ts"
  "backend/src/controllers/exports.controller.ts"

  "backend/src/services/auth.service.ts"
  "backend/src/services/users.service.ts"
  "backend/src/services/registers.service.ts"
  "backend/src/services/risks.service.ts"
  "backend/src/services/reviews.service.ts"
  "backend/src/services/scoring.service.ts"
  "backend/src/services/configuration.service.ts"
  "backend/src/services/audit.service.ts"
  "backend/src/services/export.service.ts"

  "backend/src/repositories/users.repository.ts"
  "backend/src/repositories/registers.repository.ts"
  "backend/src/repositories/risks.repository.ts"
  "backend/src/repositories/audit.repository.ts"

  "backend/src/middleware/authenticate.ts"
  "backend/src/middleware/requirePermission.ts"
  "backend/src/middleware/errorHandler.ts"
  "backend/src/middleware/rateLimit.ts"
  "backend/src/middleware/validateRequest.ts"

  "backend/src/validators/auth.schemas.ts"
  "backend/src/validators/users.schemas.ts"
  "backend/src/validators/registers.schemas.ts"
  "backend/src/validators/risks.schemas.ts"
  "backend/src/validators/configuration.schemas.ts"

  "backend/src/auth/password.ts"
  "backend/src/auth/tokens.ts"
  "backend/src/auth/refreshTokens.ts"

  "backend/src/permissions/effectiveRole.ts"
  "backend/src/permissions/registerAccess.ts"
  "backend/src/permissions/riskAccess.ts"

  "backend/src/audit/auditActions.ts"
  "backend/src/audit/auditWriter.ts"
  "backend/src/audit/snapshotBuilder.ts"

  "backend/src/utils/dates.ts"
  "backend/src/utils/riskId.ts"
  "backend/src/utils/csv.ts"

  "backend/src/types/express.d.ts"

  "shared/package.json"
  "shared/tsconfig.json"
  "shared/src/api/api.ts"
  "shared/src/api/auth.ts"
  "shared/src/api/users.ts"
  "shared/src/api/registers.ts"
  "shared/src/api/risks.ts"
  "shared/src/api/audit.ts"

  "shared/src/enums/riskState.ts"
  "shared/src/enums/reviewStatus.ts"
  "shared/src/enums/registerRole.ts"
  "shared/src/enums/auditActions.ts"

  "shared/src/schemas/common.ts"
  "shared/src/types/index.ts"

  ".github/workflows/ci.yml"
  ".github/workflows/docker-build.yml"
  ".github/pull_request_template.md"
)

for dir in "${dirs[@]}"; do
  mkdir -p "$ROOT/$dir"
done

for file in "${files[@]}"; do
  mkdir -p "$(dirname "$ROOT/$file")"
  touch "$ROOT/$file"
done

cat > "$ROOT/.gitignore" <<'EOF'
node_modules/
dist/
build/
coverage/
.env
.env.local
.env.*.local
*.log
.DS_Store

# Prisma / local DB scratch files
backend/prisma/migrations/dev.db

# IDEs
.vscode/
.idea/
EOF

cat > "$ROOT/.editorconfig" <<'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
EOF

cat > "$ROOT/.env.example" <<'EOF'
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://customrisk:customrisk_password@db:5432/customrisk

POSTGRES_DB=customrisk
POSTGRES_USER=customrisk
POSTGRES_PASSWORD=change_me

JWT_ACCESS_SECRET=change_me_256_bit_random_value
JWT_REFRESH_SECRET=change_me_256_bit_random_value
JWT_ACCESS_EXPIRY=60m
JWT_REFRESH_EXPIRY_DAYS=30

BCRYPT_COST_FACTOR=12

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_LOGIN=10

SEED_ADMIN_PASSWORD=change_me
EOF

cat > "$ROOT/README.md" <<'EOF'
# Custom Risk

Custom Risk is a configurable risk register web application.

## Repository structure

- `frontend/` — React, Vite, TypeScript frontend.
- `backend/` — Node.js, Express, TypeScript API with Prisma.
- `shared/` — shared TypeScript types, enums, and schemas.
- `docs/` — product, architecture, planning, ADRs, and AI build prompts.
- `scripts/` — local development, database, seed, and maintenance scripts.
- `tests/` — cross-application API and E2E tests.

## Local development

Configuration is documented in `.env.example`.

Do not commit real `.env` files or secrets.
EOF

echo "Created project structure in current folder: $(pwd)"
echo
echo "Next steps:"
echo "1. Move your existing documents into docs/product/ and docs/architecture/"
echo "2. git init"
