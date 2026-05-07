# Custom Risk — Technical Architecture

**Version:** 1.0  
**Date:** 2026-05-04  
**Status:** Confirmed  
**Applies to:** MVP delivery  
**Related ADR:** ADR-0001 — Technical Stack  
**Related documents:** PRD v3.2, MVP Scope v1.2, MVP Functional Specification v1.2, MVP Data Model v1.2

---

## 1. Purpose

This document defines the definitive technical architecture for the Custom Risk MVP.

It specifies the technologies, libraries, runtime patterns, deployment model, authentication design, API conventions, repository structure, and environment configuration to be used during implementation.

Decision reasoning is intentionally excluded from this document. Rationale and alternatives are recorded separately in:

- `ADR-0001-technical-stack.md`

This file should be treated as the implementation source of truth for the MVP architecture. Any future change to the technical stack should be recorded through a new or superseding ADR before this document is updated.

---

## 2. Architecture Overview

Custom Risk MVP is a containerised, single-application web system with a clear separation between:

- React frontend
- Node.js / Express API backend
- PostgreSQL database
- Prisma ORM

```text
┌─────────────────────────────────────────────────────┐
│  Docker Compose (local / self-hosted)               │
│                                                     │
│  ┌─────────────────────────────┐  ┌──────────────┐ │
│  │  App Container              │  │  DB Container│ │
│  │                             │  │              │ │
│  │  ┌───────────────────────┐  │  │  PostgreSQL  │ │
│  │  │  React static build   │  │  │  16          │ │
│  │  │  served by Express    │  │  │              │ │
│  │  └───────────────────────┘  │  └──────────────┘ │
│  │  ┌───────────────────────┐  │                   │
│  │  │  Express API          │  │                   │
│  │  │  /api/v1/...          │  │                   │
│  │  └───────────────────────┘  │                   │
│  │  ┌───────────────────────┐  │                   │
│  │  │  Prisma ORM           │  │                   │
│  │  └───────────────────────┘  │                   │
│  └─────────────────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

The app container serves the compiled React static files directly from Express. No separate web server is required for MVP.

The database runs in a separate PostgreSQL container and is managed with the app through Docker Compose.

---

## 3. Technical Stack

### 3.1 Runtime and Language

| Area | Standard |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript |
| TypeScript mode | Strict mode |
| Frontend package | Separate package within monorepo |
| Backend package | Separate package within monorepo |
| TypeScript config | One `tsconfig.json` per package |

TypeScript must be used throughout both frontend and backend code.

---

### 3.2 Backend

| Area | Standard |
|---|---|
| Framework | Express 4.x |
| API style | REST |
| API base path | `/api/v1/` |
| Request / response format | JSON |
| ORM | Prisma 5.x |
| Logging | Pino |
| Request validation | Zod |
| Password hashing | `bcryptjs` |
| CORS middleware | `cors` |
| Rate limiting | `express-rate-limit` |
| Environment config | Environment variables, with `.env` for local development |

#### 3.2.1 Backend Middleware and Libraries

| Purpose | Library | Implementation Standard |
|---|---|---|
| Request validation | Zod | Define Zod schemas for all request bodies and query parameters. Use inferred TypeScript types from schemas where practical. |
| ORM / database access | Prisma 5.x | Prisma schema is the canonical data model implementation. Use Prisma migrations for schema changes. |
| Password hashing | `bcryptjs` | Use cost factor 12 unless overridden by `BCRYPT_COST_FACTOR`. Never store or log plain-text passwords. |
| Logging | Pino | Use structured JSON logging. Stack traces must be logged server-side only. |
| CORS | `cors` middleware | Configure allowed origins explicitly. Do not use wildcard origins in production. |
| Environment config | `dotenv` / environment variables | Use `.env` for local development only. Inject production values at container runtime. |
| Rate limiting | `express-rate-limit` | Apply to login and refresh endpoints. |

---

### 3.3 Frontend

| Area | Standard |
|---|---|
| Framework | React 18 |
| Language | TypeScript |
| Build tool | Vite |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Component library | Mantine v7 |
| Data tables | Mantine DataTable |
| Form state | Mantine Form |
| Date handling | Day.js |
| HTTP client | Axios |

#### 3.3.1 Frontend Libraries

| Purpose | Library | Implementation Standard |
|---|---|---|
| Component library | Mantine v7 | Use `@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`, and `@mantine/dates`. |
| Data tables | `mantine-datatable` | Use for risk register tables requiring sorting, filtering, and pagination. |
| Server state | TanStack Query v5 | All API-backed data access must go through TanStack Query. Avoid local state for server-owned data. |
| Routing | React Router v6 | Use layout-based or file-organised routing. Use data prefetching where appropriate. |
| Form state | `@mantine/form` | Use for form state, validation, and submission. Pair with Zod schemas where practical. |
| Date handling | Day.js | Use for date formatting, relative dates, and review-date calculations. |
| HTTP client | Axios | Use a configured Axios instance with base URL, auth token request interceptor, and 401 refresh handling. |

#### 3.3.2 Frontend Structure

Recommended frontend directory structure:

```text
src/
  api/           # Axios instance, API call functions grouped by domain
  components/    # Shared UI components
  features/      # Feature-scoped components, hooks, and pages
    auth/
    registers/
    risks/
    configuration/
    users/
    audit/
  hooks/         # Shared custom hooks
  types/         # Shared TypeScript types
  utils/         # Utility functions
  router.tsx     # Route definitions
  main.tsx       # Entry point
```

---

## 4. Database Architecture

| Area | Standard |
|---|---|
| Database | PostgreSQL 16 |
| Container image | `postgres:16-alpine` |
| ORM | Prisma 5.x |
| Migration mechanism | Prisma migrations |
| JSON support | PostgreSQL native JSON support for `metadata_json` and `snapshot_json` columns |

### 4.1 Database Conventions

- All primary keys must be UUIDs.
- UUID defaults should use `gen_random_uuid()`.
- All timestamps must be stored in UTC.
- Display-time timezone conversion must happen in the frontend or API response layer.
- Soft deactivation is preferred over hard deletion for:
  - Users
  - Custom fields
  - Likelihood values
  - Impact values
  - Risk levels
  - Dropdown options
  - Response strategies
- Hard delete is permitted only for risks by System Admin correction.
- Risk hard delete must trigger a full audit snapshot as defined in the data model.
- Prisma migrations are the only permitted mechanism for database schema changes.
- The database schema must not be changed manually outside Prisma migrations.

### 4.2 Connection and Pooling

- Use Prisma's built-in connection pool for MVP.
- Set `DATABASE_URL` as an environment variable.
- Do not hard-code database connection strings.
- For production deployments, set the connection pool limit according to expected concurrent users.

---

## 5. Containerisation and Runtime Deployment

| Area | Standard |
|---|---|
| Containerisation | Docker |
| Local/self-hosted orchestration | Docker Compose |
| App runtime image | Node 20 Alpine |
| Database image | `postgres:16-alpine` |
| Database persistence | Named Docker volume |
| Frontend serving | Express static file serving |
| Public app port | `3000` |

### 5.1 Docker Compose Services

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL
      - JWT_ACCESS_SECRET
      - JWT_REFRESH_SECRET
      - NODE_ENV
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB
      - POSTGRES_USER
      - POSTGRES_PASSWORD
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### 5.2 Multi-Stage Dockerfile Outline

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./
COPY --from=frontend-build /app/frontend/dist ./public
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 5.3 Static Frontend Serving

Express must serve the React static files from `./public` and fall back to `index.html` for client-side routing.

```typescript
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

---

## 6. Authentication and Session Management

The authoritative MVP security contract is:

- `Security_Model.md`

This Technical Architecture document records only the architectural boundary:

- MVP uses application-managed local authentication.
- Authentication and authorisation are implemented in the Express backend.
- User and refresh-token persistence is in PostgreSQL through Prisma. API-key persistence is deferred to post-MVP.
- Password hashing uses the selected backend library from section 3.2.
- Route-level behaviour is defined in `API_Route_Map.md`.
- Effective access rules are defined in `Permission_Model.md`.
- Security audit requirements are defined in `Audit_Model.md` and `Security_Model.md`.

Do not duplicate password policy, token rotation, cookie settings, or rate-limit rules here. Keep those details in `Security_Model.md`.

---

## 7. API Design

| Area | Standard |
|---|---|
| API style | REST |
| Base path | `/api/v1/` |
| Request body format | JSON |
| Response body format | JSON |
| Auth header | `Authorization: Bearer <access_token>` |
| Content type | `application/json` |
| Versioning | Path-based versioning |

Breaking API changes must introduce a new path version, such as `/api/v2/`.

### 7.1 Success Response Convention

```json
{
  "data": {},
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 25
  }
}
```

`meta` should be included where pagination or result metadata is relevant.

### 7.2 Error Response Convention

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "fields": {
      "title": "Risk title is required"
    }
  }
}
```

### 7.3 Standard Error Codes

| HTTP status | Error code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body or query parameter failed validation |
| 401 | `UNAUTHENTICATED` | No valid token provided |
| 403 | `FORBIDDEN` | Authenticated but not permitted for this action |
| 404 | `NOT_FOUND` | Resource does not exist or is not accessible to this user |
| 409 | `CONFLICT` | Uniqueness constraint violation |
| 422 | `UNPROCESSABLE` | Business rule violation |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

API errors must not return stack traces.

Use `404` for both genuine not-found and permission-denied-existence cases where revealing resource existence would be inappropriate.

### 7.4 Pagination

For MVP, list endpoints use offset pagination.

Example:

```http
GET /api/v1/registers/:registerId/risks?page=1&pageSize=25&state=OPEN&sortBy=riskScore&sortDir=desc
```

Paginated responses must include:

- `total`
- `page`
- `pageSize`

### 7.5 Route Design Principles

- Routes must be named after resources, not actions.
- Use `GET /risks`, not `GET /getRisks`.
- Use HTTP verbs consistently:
  - `GET` for read
  - `POST` for create
  - `PATCH` for partial update
  - `PUT` for full replacement where needed
  - `DELETE` for restricted hard delete
- Nested routes should reflect ownership, for example:
  - `/registers/:registerId/risks/:riskId`
- Non-CRUD actions should use sub-resource patterns, for example:
  - `POST /risks/:riskId/reviews`
- The complete endpoint inventory belongs in the API Route Map document.

---

## 8. Monorepo Structure

The MVP codebase uses a monorepo with separate frontend and backend packages.

```text
custom-risk/
  docker-compose.yml
  Dockerfile
  .env.example
  README.md
  backend/
    package.json
    tsconfig.json
    prisma/
      schema.prisma
      migrations/
      seed.ts
    src/
      server.ts          # Express app entry point
      app.ts             # Express app setup, middleware registration
      routes/            # Route definitions grouped by domain
      controllers/       # Request handlers
      services/          # Business logic
      middleware/        # Auth, error handling, rate limiting
      utils/             # Helpers
      types/             # Shared TypeScript types
  frontend/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/
      api/
      components/
      features/
      hooks/
      types/
      utils/
      router.tsx
      main.tsx
```

### 8.1 Shared Types

Where TypeScript types need to be shared between frontend and backend, export them from either:

- `backend/src/types/`, imported through a path alias; or
- a small shared package if the project structure later requires it.

Do not duplicate API response shapes, enum values, or shared DTO types across frontend and backend.

---

## 9. Environment Variables

All environment-specific configuration must be injected through environment variables.

A `.env.example` file must be committed to the repository and must document all required variables without real secret values.

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `production` / `development` |
| `PORT` | Express listen port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/customrisk` |
| `JWT_ACCESS_SECRET` | Secret for signing access JWTs | 256-bit random string |
| `JWT_REFRESH_SECRET` | Secret for signing refresh JWTs, if JWTs are used for refresh | 256-bit random string |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `60m` |
| `JWT_REFRESH_EXPIRY_DAYS` | Refresh token expiry in days | `30` |
| `BCRYPT_COST_FACTOR` | bcrypt cost factor | `12` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://risk.example.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window for auth endpoints | `60000` |
| `RATE_LIMIT_MAX_LOGIN` | Max login attempts per window per IP | `10` |
| `SEED_ADMIN_PASSWORD` | Seed password for the default System Admin | Local/dev value only |

Secrets must be cryptographically random values of at least 256 bits. Secrets must never be committed to source control.

---

## 10. Seed and Demo Data

The MVP must include a Prisma seed script at:

```text
backend/prisma/seed.ts
```

### 10.1 Seed Users

| Name | Email | Role | Password |
|---|---|---|---|
| System Admin | `admin@example.com` | System Admin | Set via `SEED_ADMIN_PASSWORD` |
| Alice Register Admin | `alice@example.com` | Regular user | Documented in README |
| Bob Risk Owner | `bob@example.com` | Regular user | Documented in README |
| Carol Viewer | `carol@example.com` | Regular user | Documented in README |

Seed passwords must not be hardcoded.

### 10.2 Seed Registers

| Register | Configuration |
|---|---|
| Information Security Risk Register | 5×5 matrix, reviews enabled, 12-month frequency, prefix `ISEC`, zero-padding width 4 |
| Operational Risk Register | 5×5 matrix, reviews enabled, 6-month frequency, no prefix |

Example risk ID for the Information Security Risk Register:

```text
ISEC-0001
```

### 10.3 Seed Risks

Each seeded register should contain 8–12 risks with a realistic spread of:

- Draft risks
- Open risks
- Closed risks
- Different risk levels
- Risks overdue for review
- Risks never reviewed
- Risks recently reviewed

---

## 11. Explicitly Deferred for Post-MVP

The authoritative MVP exclusion list is in:

- `docs/product/MVP_Scope.md`

Architecture-specific deferrals that are not already governed by MVP product scope:

| Area | Deferred decision |
|---|---|
| Caching | Redis or in-process caching layer |
| Observability | Structured metrics, distributed tracing, health dashboards |
| Horizontal scaling | Session affinity and connection pool sizing for multi-instance deployments |
| Compliance | SOC 2, ISO 27001, GDPR data residency requirements |
| Mobile | Native mobile app or PWA optimisation |
| Multi-tenancy | Tenant isolation at database or schema level |

---

## 12. Architecture Document Set

The architecture document set for MVP implementation is:

1. **Technical Architecture** — Runtime, framework, deployment, and repository standards.
2. **API Route Map** — Full inventory of REST endpoints, request/response shapes, query parameters, auth requirements, and audit events.
3. **Permission Model** — Effective permissions, role behaviour, field-level edit restrictions, and backend enforcement rules.
4. **Audit Model** — Audit event structure, action names, scopes, field changes, snapshots, and audit access rules.
5. **Security Model** — Authentication, sessions, passwords, CORS, validation, secrets, and security logging. API keys are post-MVP.
6. **Schema** — Reference document pointing to `backend/prisma/schema.prisma` as the canonical drafted Prisma schema.
7. **Implementation Backlog** — AI-ready build tickets broken down by MVP Scope v1.2 phases, with acceptance criteria derived from the MVP Functional Specification.
