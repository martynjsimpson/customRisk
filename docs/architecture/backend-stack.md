# Backend stack and conventions

Extracted 2026-07-27 from `.claude/agents/backend-developer.md` during `/work-init`
adoption, preserved close to verbatim. Cross-cutting rules (API base path, permissions,
audit, security, data model) moved to `docs/architecture/domain-rules.md` instead — see
that file first.

## Technical stack

| Area | Technology |
|---|---|
| Runtime | Node.js 22, TypeScript (strict mode) |
| Framework | Express 4.x |
| ORM | Prisma 5.x |
| Database | PostgreSQL 16 |
| Validation | Zod (all request bodies and query parameters) |
| Logging | Pino (structured JSON) |
| Password hashing | bcryptjs (cost factor 12 via `BCRYPT_COST_FACTOR`) |
| CORS | cors middleware |
| Rate limiting | express-rate-limit (on login and refresh endpoints) |
| Testing | Node built-in test runner (`.test.mjs` files in `backend/test/`) |

Note: `docs/architecture/technical-architecture.md` states Node.js 20 LTS, and
`.nvmrc`/`Dockerfile` targets Node 22, while root `package.json` engines currently reads
`>=24.0`. This drift predates `/work-init` and hasn't been reconciled — flag to the
Principal Architect before treating any one of these as authoritative.

## Backend directory structure

```
backend/
  src/
    app.ts              # Express app setup, middleware registration
    server.ts            # Entry point
    routes/              # Route definitions grouped by domain
    controllers/          # Request handlers
    services/            # Business logic
    middleware/          # Auth, error handling, rate limiting
    utils/               # Helpers
    types/                # TypeScript types
  prisma/
    schema.prisma         # Canonical data model — approve changes with Principal Architect
    migrations/           # Prisma migration files — only permitted schema change mechanism
    seed.ts                # Seed script
  test/                   # Backend test files
```

## Request validation

- Define Zod schemas for all request bodies and query parameters.
- Use inferred TypeScript types from Zod schemas where practical.
- Validate inputs server-side before any business logic.

## Feature flags

- When a feature is flagged, add the flag key to `backend/src/config/featureFlags.ts`.
- Apply `requireFeature` middleware to every new backend route group in
  `backend/src/routes/index.ts`.
- Add the `FEATURE_*=false` entry with a phase comment to `.env.local.example`.
- Coordinate with the frontend developer to ensure the flag is also wired in the frontend.

## Logging

- Use Pino for structured JSON logging.
- Stack traces must be logged server-side only — never exposed in API responses.

## Working conventions

- Read the `## Backend Standards` section of `docs/engineering/coding-standards.md` before
  writing any code — it defines the required layered architecture, error handling,
  validation, and refactoring triggers for this codebase.
- If the route involves access control or ownership rules, read
  `docs/architecture/permission-model.md` before implementing. If it creates or modifies
  state, read `docs/architecture/audit-model.md` to confirm the required audit events. Skip
  these for read-only or simple CRUD routes where the pattern is already established.
- If a schema change is needed, agree the shape with the Principal Architect before
  writing any code.
- When building a new endpoint, publish the API contract (method, path, request/response
  shapes, error cases) to the frontend developer so they can build the UI in parallel.
