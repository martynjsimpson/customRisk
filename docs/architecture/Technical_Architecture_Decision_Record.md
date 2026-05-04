# Custom Risk — Technical Architecture Decision Record

**Version:** 1.0  
**Date:** 2026-05-04  
**Status:** Confirmed  
**Applies to:** MVP delivery  
**Related documents:** PRD v3.2, MVP Scope v1.2, MVP Functional Specification v1.2, MVP Data Model v1.2

---

## 1. Purpose

This document records the confirmed technology decisions for the Custom Risk MVP. It is intentionally separate from the functional and data model specifications, which are technology-neutral. This document defines the specific technologies, libraries, patterns, and conventions that should be used during technical design and implementation.

Decisions recorded here should be treated as the implementation source of truth for the MVP. Changes to any decision should be recorded as a new version with a rationale for the change.

---

## 2. Architecture Overview

Custom Risk MVP is a containerised, single-application web system with a clear separation between a React frontend, a Node/Express API backend, and a PostgreSQL database.

```
┌─────────────────────────────────────────────────────┐
│  Docker Compose (local / self-hosted)               │
│                                                     │
│  ┌─────────────────────────────┐  ┌──────────────┐ │
│  │  App Container              │  │  DB Container│ │
│  │                             │  │              │ │
│  │  ┌───────────────────────┐  │  │  PostgreSQL  │ │
│  │  │  React (static build) │  │  │  16          │ │
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

The app container serves the compiled React static files directly from Express, so no separate web server (nginx, etc.) is required for MVP. The database runs in a separate container but is managed together with the app container via Docker Compose.

---

## 3. Decision Record

### 3.1 Runtime: Node.js

| | |
|---|---|
| **Decision** | Node.js 20 LTS |
| **Language** | TypeScript (strict mode) throughout — both frontend and backend |
| **Rationale** | LTS release ensures security patches and stability for the MVP lifecycle. TypeScript across the full stack reduces a class of runtime errors, improves IDE support, and allows shared type definitions between frontend and backend where practical. |
| **Notes** | Use a single `tsconfig.json` per package (frontend and backend are separate packages within the same monorepo). |

---

### 3.2 Backend: Express

| | |
|---|---|
| **Decision** | Express 4.x |
| **Rationale** | Minimal, well-understood framework with broad ecosystem support. Suitable for the structured REST API this application requires. Avoids framework magic that could conflict with the explicit permission and audit requirements. |
| **Middleware** | See section 3.2.1 |

#### 3.2.1 Backend middleware and libraries

| Purpose | Library | Notes |
|---|---|---|
| Request validation | Zod | Schema-first validation. Define Zod schemas for all request bodies and query parameters. Use inferred TypeScript types from schemas to avoid duplication. |
| ORM / database access | Prisma 5.x | Type-safe query builder, migration management, and schema-as-code. Prisma schema serves as the canonical data model implementation. |
| Password hashing | bcrypt (`bcryptjs`) | Cost factor 12. Never store or log plain-text passwords. |
| Logging | Pino | Structured JSON logging. Fast, low-overhead. Suitable for production log aggregation if needed later. |
| CORS | `cors` middleware | Configure allowed origins explicitly. Do not use wildcard in production. |
| Environment config | `dotenv` / environment variables | No secrets in source code. Use `.env` for local development; environment variables injected at container runtime for production. |
| Rate limiting | `express-rate-limit` | Apply to auth endpoints (login, token refresh) to limit brute-force attempts. See section 3.6.4. |

---

### 3.3 Frontend: React

| | |
|---|---|
| **Decision** | React 18 with TypeScript |
| **Build tool** | Vite |
| **Routing** | React Router v6 |
| **Server state** | TanStack Query (React Query) v5 |
| **Component library** | Mantine v7 |
| **Rationale** | React 18 with Vite provides a fast development experience and optimised production builds. TanStack Query handles API data fetching, caching, background refresh, and loading/error states in a way that reduces boilerplate and fits naturally with a REST API backend. Mantine provides a comprehensive set of production-quality components — particularly data tables, forms, modals, and notifications — that align well with the Custom Risk UI requirements. |

#### 3.3.1 Frontend libraries

| Purpose | Library | Notes |
|---|---|---|
| Component library | Mantine v7 | Use Mantine's `@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`, and `@mantine/dates`. |
| Data tables | Mantine DataTable (`mantine-datatable`) | Suitable for the register risk table with sorting, filtering, and pagination. |
| Server state | TanStack Query v5 | All API calls go through TanStack Query. Avoid local state for data that comes from the server. |
| Routing | React Router v6 | File-based or layout-based routing structure. Use loaders for data prefetching where appropriate. |
| Form state | Mantine Form (`@mantine/form`) | Handles field state, validation, and submission. Pair with Zod schemas shared from the backend where practical. |
| Date handling | Day.js | Lightweight. Used for date formatting, relative dates, and review date calculations in the UI. Mantine dates package uses Day.js. |
| HTTP client | Axios | Configured with a base URL and request interceptor that attaches the access token. Response interceptor handles 401s and triggers token refresh. |

#### 3.3.2 Frontend structure

Recommended directory structure:

```
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
  types/         # Shared TypeScript types (can import from backend if monorepo)
  utils/         # Utility functions (date formatting, ID formatting, etc.)
  router.tsx     # Route definitions
  main.tsx       # Entry point
```

---

### 3.4 Database: PostgreSQL

| | |
|---|---|
| **Decision** | PostgreSQL 16 |
| **Container image** | `postgres:16-alpine` |
| **ORM** | Prisma (manages schema, migrations, and type-safe queries) |
| **Rationale** | PostgreSQL provides the relational integrity, JSON column support, and transaction guarantees required by the Custom Risk data model. The audit tables use `metadata_json` and `snapshot_json` columns which benefit from PostgreSQL's native JSON support. |

#### 3.4.1 Database conventions

- All primary keys are UUIDs (`gen_random_uuid()` default in PostgreSQL 16).
- All timestamps are stored in UTC. Display conversion happens in the frontend or API response layer.
- Soft deactivation is preferred over hard deletion for users, custom fields, likelihood values, impact values, risk levels, dropdown options, and response strategies.
- Hard delete is permitted only for risks (System Admin correction), and must trigger a full audit snapshot as described in the data model.
- Prisma migrations are the sole mechanism for schema changes. Do not modify the database schema directly.

#### 3.4.2 Connection and pooling

- Use Prisma's built-in connection pool for MVP.
- Set `DATABASE_URL` as an environment variable. Never hard-code connection strings.
- For production deployments, set a connection pool limit appropriate for the expected concurrent user count.

---

### 3.5 Containerisation

| | |
|---|---|
| **Decision** | Docker with Docker Compose |
| **App container** | Multi-stage build: stage 1 builds the React app; stage 2 builds the TypeScript backend; stage 3 is the runtime image (Node 20 Alpine) containing the compiled backend and the React static files |
| **Database container** | `postgres:16-alpine` with a named volume for data persistence |
| **Rationale** | Multi-stage builds keep the runtime image small by excluding build tools. Serving React static files from Express eliminates the need for a separate web server in MVP. Docker Compose manages the two containers, environment variables, networking, and volume mounts. |

#### 3.5.1 Docker Compose services

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

#### 3.5.2 Multi-stage Dockerfile (outline)

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

Express serves the React static files from the `./public` directory and falls back to `index.html` for client-side routing:

```typescript
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

---

### 3.6 Authentication and Session Management

This section records the full auth design, including the rationale for each decision.

#### 3.6.1 Local authentication

| | |
|---|---|
| **Decision** | Application-managed local auth using bcrypt |
| **Password hashing** | `bcryptjs` with cost factor 12 |
| **Rationale** | bcrypt at cost factor 12 is the current industry standard for password hashing in Node.js applications. It is well-audited, widely used, and appropriate for a web application of this scale. This approach was chosen over OpenLDAP because OpenLDAP would introduce a second stateful service inside the container, duplicate user state between LDAP and PostgreSQL, and complicate the future SAML integration. Password hashing at the application layer with bcrypt provides equivalent security with significantly less operational complexity. |

#### 3.6.2 Token strategy

Custom Risk uses a **short-lived JWT access token + rotating refresh token** strategy. This was chosen because:

- The API must be usable by external integrations (bearer token is the natural mechanism).
- The browser app must feel like a normal session-based web app.
- User deactivation must take effect within a bounded time window without requiring a server-side session store.

| Token | Type | Storage | Expiry | Purpose |
|---|---|---|---|---|
| Access token | Signed JWT | Memory only (frontend) | 60 minutes | Authorises API requests. Sent as `Authorization: Bearer <token>` header. |
| Refresh token | Opaque random string | HttpOnly, Secure, SameSite=Strict cookie (browser) + hashed in `refresh_token` DB table | 30 days | Obtains new access tokens. Never exposed to JavaScript. |

**Why access tokens are memory-only (not localStorage):** localStorage is accessible to JavaScript and vulnerable to XSS. Keeping the access token in memory means it is lost on page refresh, which is why the refresh token cookie exists — on page load, the frontend silently calls `POST /api/v1/auth/refresh` to get a new access token before rendering protected routes.

**External API consumers:** Machine-to-machine integrations use API keys rather than user JWTs. See section 3.6.5.

#### 3.6.3 Refresh token rotation

- Each use of a refresh token issues a new refresh token and invalidates the old one (rotation).
- Refresh tokens are stored hashed in the database. The plain token is only ever returned once at login or rotation.
- Refresh token reuse detection: if a token that has already been rotated is presented, all refresh tokens for that user are invalidated immediately (family invalidation), forcing re-login. This detects token theft.
- On logout, the refresh token is deleted from the database.
- On user deactivation, all refresh tokens for the user are deleted from the database. The access JWT remains valid for up to 60 minutes — this is the accepted tradeoff for stateless access tokens. To reduce this window, the access token expiry can be reduced to 15 minutes at the cost of more frequent refresh calls.

#### 3.6.4 Password policy and account lockout

Implemented at the application layer on all password-setting and login endpoints.

**Password requirements:**

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (`!@#$%^&*()_+-=[]{}|;':",.<>?`)
- Must not match the user's email address or display name
- Validated server-side on create and update; client-side validation mirrors server rules for UX

**Account lockout:**

- Maximum 5 failed login attempts within a 15-minute window
- On breach: account is temporarily locked for 15 minutes
- Lockout state stored in the database (failed attempt count + last attempt timestamp on the `user` table or a separate `login_attempt` table)
- After the lockout window passes, the attempt counter resets automatically on the next successful login
- Lockout events are recorded in the audit log
- System Admins can manually unlock accounts (post-MVP consideration; for MVP, time-based expiry is sufficient)

**Rate limiting:**

- `express-rate-limit` applied to `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh`
- Login: 10 requests per IP per minute
- Refresh: 20 requests per IP per minute
- Rate limit responses return `429 Too Many Requests`

#### 3.6.5 API keys for external integrations

External systems that need to consume the Custom Risk API (integrations, reporting tools, scripts) use long-lived API keys rather than user JWTs.

| | |
|---|---|
| **Storage** | Hashed with bcrypt in `api_key` table |
| **Format** | Random 32-byte token, base64url-encoded, prefixed for identification (e.g. `cr_live_...`) |
| **Scope** | Tied to a specific user account; inherits that user's permissions |
| **Sent as** | `Authorization: Bearer <api_key>` header — same header as JWT, differentiated by prefix detection |
| **Revocation** | Immediate — delete from `api_key` table |
| **Audit** | API key usage logged in audit events with key identifier (never the key value) |

API key management UI is considered a post-MVP feature. For MVP, API keys can be created by System Admins directly in the database or via a simple admin endpoint.

---

### 3.7 API Design

| | |
|---|---|
| **Style** | REST with JSON request and response bodies |
| **Base path** | `/api/v1/` |
| **Auth header** | `Authorization: Bearer <access_token_or_api_key>` |
| **Content type** | `application/json` |
| **Versioning** | Path-based versioning (`/v1/`). Future breaking changes introduce `/v2/` rather than modifying existing routes. |

#### 3.7.1 Response conventions

**Success responses:**

```json
{
  "data": { ... },
  "meta": { "total": 100, "page": 1, "pageSize": 25 }
}
```

**Error responses:**

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

**Standard error codes:**

| HTTP status | Error code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body or query parameter failed validation |
| 401 | `UNAUTHENTICATED` | No valid token provided |
| 403 | `FORBIDDEN` | Authenticated but not permitted for this action |
| 404 | `NOT_FOUND` | Resource does not exist or is not accessible to this user |
| 409 | `CONFLICT` | Uniqueness constraint violation (e.g. duplicate register name) |
| 422 | `UNPROCESSABLE` | Business rule violation (e.g. removing last Register Admin) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

- `404` is used for both genuine not-found and permission-denied-existence cases (do not reveal whether a resource exists if the user lacks access).
- Validation errors include a `fields` object mapping field names to error messages.
- Stack traces are never returned in API responses. Log them server-side with Pino.

#### 3.7.2 Pagination

List endpoints that may return large result sets use cursor or offset pagination.

For MVP, use **offset pagination**:

```
GET /api/v1/registers/:registerId/risks?page=1&pageSize=25&state=OPEN&sortBy=riskScore&sortDir=desc
```

Response `meta` always includes `total`, `page`, and `pageSize`.

#### 3.7.3 API route design principles

- Routes are named after resources, not actions: `GET /risks`, not `GET /getRisks`
- Mutations use appropriate HTTP verbs: `POST` (create), `PATCH` (partial update), `PUT` (full replacement where needed), `DELETE` (hard delete, restricted)
- Nested routes reflect ownership: `/registers/:registerId/risks/:riskId`
- Actions that are not CRUD (e.g. reviewing a risk) use a sub-resource pattern: `POST /risks/:riskId/reviews`
- Detailed route inventory is defined in a separate API Route Map document (to be produced as the next downstream document)

---

### 3.8 Monorepo Structure

The MVP codebase is structured as a monorepo with separate frontend and backend packages.

```
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
      utils/             # Helpers (token generation, password, audit)
      types/             # Shared TypeScript types
  frontend/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/
      (see section 3.3.2)
```

**Shared types:** Where TypeScript types need to be shared between frontend and backend (e.g. API response shapes, enum values), export them from a `types/` directory in the backend and import via a path alias or a simple shared package. Avoid duplicating type definitions.

---

### 3.9 Environment Variables

All environment-specific configuration is injected via environment variables. A `.env.example` file should be committed to the repository documenting all required variables without values.

Required environment variables for MVP:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `production` / `development` |
| `PORT` | Express listen port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/customrisk` |
| `JWT_ACCESS_SECRET` | Secret for signing access JWTs | 256-bit random string |
| `JWT_REFRESH_SECRET` | Secret for signing refresh JWTs (if JWTs used for refresh; otherwise omit) | 256-bit random string |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `60m` |
| `JWT_REFRESH_EXPIRY_DAYS` | Refresh token expiry in days | `30` |
| `BCRYPT_COST_FACTOR` | bcrypt cost factor | `12` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://risk.example.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window for auth endpoints | `60000` |
| `RATE_LIMIT_MAX_LOGIN` | Max login attempts per window per IP | `10` |

Secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, database password) must be generated as cryptographically random values of at least 256 bits. They must never be committed to source control.

---

### 3.10 Seed and Demo Data

The MVP must include a database seed script that creates a usable starting state for development and testing.

The seed script (`backend/prisma/seed.ts`) should create:

**Users:**

| Name | Email | Role | Password |
|---|---|---|---|
| System Admin | `admin@example.com` | System Admin | Set via `SEED_ADMIN_PASSWORD` env variable |
| Alice Register Admin | `alice@example.com` | Regular user | Documented in README |
| Bob Risk Owner | `bob@example.com` | Regular user | Documented in README |
| Carol Viewer | `carol@example.com` | Regular user | Documented in README |

**Registers:** Two seeded registers:

1. **Information Security Risk Register** — 5×5 matrix, reviews enabled, 12-month frequency, prefix `ISEC`, zero-padding width 4 (e.g. `ISEC-0001`)
2. **Operational Risk Register** — 5×5 matrix, reviews enabled, 6-month frequency, no prefix (plain numbers)

**Risks per register:** 8–12 risks in a mix of Draft, Open, and Closed states, with a spread of risk levels, some overdue for review, some never reviewed, and some recently reviewed. This gives a realistic and immediately useful demo state for testing all dashboard and filter scenarios.

Seed data passwords must not be hardcoded. Use environment variables with documented defaults for development only.

---

## 4. Decisions Explicitly Not Made (Post-MVP)

The following technical decisions are deferred and should not be implemented in the MVP:

| Area | Deferred decision |
|---|---|
| External auth | SAML 2.0 integration (e.g. Microsoft Entra ID). Architecture should not preclude this. |
| Email | SMTP configuration and email notification delivery |
| Background jobs | Review reminder scheduling, email retry queues |
| Caching | Redis or in-process caching layer |
| Observability | Structured metrics, distributed tracing, health dashboards |
| API keys UI | Self-service API key management for users |
| Horizontal scaling | Session affinity, connection pool sizing for multi-instance |
| Compliance | SOC 2, ISO 27001, GDPR data residency requirements |
| Mobile | Native mobile app or PWA optimisation |
| Multi-tenancy | Tenant isolation at database or schema level |

---

## 5. Next Documents

The next technical documents to produce before implementation begins:

1. **API Route Map** — Full inventory of REST endpoints, request/response shapes, query parameters, auth requirements, and audit events triggered. Derived from the MVP Functional Specification.
2. **Prisma Schema** — Complete `schema.prisma` file implementing the MVP Data Model v1.2, including all tables, relations, indexes, and enums.
3. **Implementation Backlog** — AI-ready build tickets broken down by the six phases in MVP Scope v1.2, with acceptance criteria derived from the MVP Functional Specification.
