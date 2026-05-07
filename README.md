# Custom Risk

Custom Risk is a configurable risk register web application.

## Repository structure

- `frontend/` — React, Vite, TypeScript frontend.
- `backend/` — Node.js, Express, TypeScript API with Prisma.
- `shared/` — shared TypeScript types, enums, and schemas.
- `docs/` — product, architecture, planning, ADRs, and AI build instructions. See [`docs/planning/post-mvp-backlog.md`](docs/planning/post-mvp-backlog.md) for the post-MVP roadmap and [`docs/planning/PM0-01-scope-baseline.md`](docs/planning/PM0-01-scope-baseline.md) for the PRD-to-phase capability map.
- `scripts/` — local development, database, seed, and maintenance scripts.
- `tests/` — cross-application API and E2E tests.

## Versioning and releases

This project uses [Semantic Versioning](https://semver.org/). The version in
the root `package.json` is the single source of truth. Releases are tagged from
`main` as `v<version>`, for example `v0.1.0`.

See [CHANGELOG.md](CHANGELOG.md) for release history and [docs/release-process.md](docs/release-process.md) for the full release procedure.

## Local development

Configuration is documented in `.env.example`.

Do not commit real `.env` files or secrets.

### Prerequisites

- Node.js 20 LTS or newer.
- npm with workspace support.
- PostgreSQL 16 for later database-backed phases.

### Install

```sh
npm install
```

### Environment setup

Create a local environment file before running app or database commands:

```sh
cp .env.example .env
```

Then update `.env` with local-only values. Required variables are listed in
`.env.example`; the important local contract is:

- `NODE_ENV` - use `development` for local work.
- `PORT` - backend HTTP port; use `3000`.
- `DATABASE_URL` - PostgreSQL connection string for the backend and Prisma.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` - local PostgreSQL service settings.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` - random 256-bit signing secrets.
- `JWT_ACCESS_EXPIRY` - default access token lifetime; use `60m`.
- `JWT_REFRESH_EXPIRY_DAYS` - default refresh token lifetime in days; use `30`.
- `BCRYPT_COST_FACTOR` - bcrypt work factor; use `12` unless deliberately testing a lower local value.
- `CORS_ALLOWED_ORIGINS` - comma-separated browser origins allowed to call the API.
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_LOGIN` - auth rate-limit settings.
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` - local/dev System Admin bootstrap account.
- `SEED_DEMO_USER_PASSWORD` - optional local/dev password for seeded demo users Alice, Bob, and Carol.

Use placeholders only in `.env.example`. Real JWT secrets, database passwords,
and seed passwords belong in your uncommitted `.env` or runtime environment.

### Local ports

- Backend/API: `http://localhost:3000`
- Frontend dev server: `http://localhost:5173`
- PostgreSQL: `localhost:5432`

For host-based development, set `DATABASE_URL` to use `localhost`. Docker
Compose sets the app service `DATABASE_URL` to use the PostgreSQL service name
`db` as the database host.

### Database service

Local development expects PostgreSQL 16. Create a database and user matching
your `.env` values, then make sure `DATABASE_URL` points at that database before
running Prisma or backend commands. The default example database name is
`customrisk`.

### Local development vs release runtime

**Local development** runs two separate processes:

- Backend (`npm run dev:backend`) — Express API on `http://localhost:3000`.
- Frontend (`npm run dev:frontend`) — Vite dev server on `http://localhost:5173`.

The Vite dev server is a development-only tool. It is not used in release builds.

**Release runtime** runs a single Express process that serves both the compiled
React frontend and the API. The `Dockerfile` builds the React frontend and copies
the output into the backend image. Express serves the static files directly.
There is no separate frontend server in the release container.

### Docker runtime

Docker Compose runs the app and PostgreSQL together as a release-like environment:

```sh
docker compose up --build
```

The `app` service is built from the repository `Dockerfile` using Node 20
Alpine. Express serves the compiled React frontend from `./public` and the API
from `/api/v1/`. The service is published on port `3000`. The `db` service uses
`postgres:16-alpine`, publishes PostgreSQL on port `5432`, and stores data in
the named `pgdata` volume. Compose sets the app container `DATABASE_URL` to use
the `db` service host.

To stop the stack:

```sh
docker compose down
```

### Health endpoint

The app exposes a health endpoint at `GET /api/v1/health`. It checks that the
app is running and the database is reachable.

```sh
curl http://localhost:3000/api/v1/health
```

Healthy response (HTTP 200):

```json
{ "data": { "status": "ok", "database": "ok" } }
```

Degraded response (HTTP 503, database unreachable):

```json
{ "data": { "status": "degraded", "database": "unreachable" } }
```

### Smoke test

Run the smoke test after `docker compose up --build` to confirm the release
build is responding correctly:

```sh
npm run smoke-test
```

Pass an alternative base URL as the first argument when the app is not on port
3000:

```sh
sh scripts/smoke-test.sh http://localhost:8080
```

### Package scripts

Run these from the repository root:

- `npm run dev:backend` - start the backend package in watch mode on `PORT`.
- `npm run dev:frontend` - start the Vite frontend dev server on port `5173`.
- `npm run test` - run all workspace test suites.
- `npm run test:backend` - run only the backend test suite.
- `npm run test:frontend` - run only the frontend test suite.
- `npm run test:shared` - run only the shared package test suite.
- `npm run typecheck` - typecheck all workspace packages.
- `npm run typecheck:backend` - typecheck only the backend package.
- `npm run typecheck:frontend` - typecheck only the frontend package.
- `npm run typecheck:shared` - typecheck only the shared package.
- `npm run lint` - run the current baseline lint gate, which is TypeScript typechecking.
- `npm run build` - build all workspace packages that define a build script.
- `npm run db:migrate` - apply committed Prisma migrations to the configured database.
- `npm run db:setup` - apply migrations, then create or update the local seed data.
- `npm run seed:admin` - create or update the local seed data from `.env`.
- `npm run smoke-test` - run the health endpoint smoke test against `http://localhost:3000`.

The backend and frontend are separate TypeScript packages under npm workspaces.
The shared package is available for API DTOs, enums, and schemas that should not
be duplicated between frontend and backend.

### First login

Apply migrations and create the first local System Admin:

```sh
npm run db:setup
```

The setup flow uses `DATABASE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`,
`SEED_ADMIN_PASSWORD`, and optional `SEED_DEMO_USER_PASSWORD` from `.env`. It is
safe to rerun; it keeps the System Admin account active, grants System Admin,
clears lockout state, updates the admin password to the current
`SEED_ADMIN_PASSWORD`, and refreshes the demo registers, configuration,
permissions, and risks.

The demo users are:

- Alice Register Admin: `alice@example.com`
- Bob Risk Owner: `bob@example.com`
- Carol Viewer: `carol@example.com`

Set `SEED_DEMO_USER_PASSWORD` to make those demo accounts login-capable. When it
is omitted, the seed creates them with random non-printed passwords.

## Production environment variables

The following variables must be changed from their development defaults before
deploying to a production or shared environment.

| Variable | Production requirement |
|---|---|
| `NODE_ENV` | Must be `production` |
| `DATABASE_URL` | Point at the production PostgreSQL instance |
| `JWT_ACCESS_SECRET` | Random value of at least 256 bits — never reuse the dev value |
| `JWT_REFRESH_SECRET` | Random value of at least 256 bits — never reuse the dev value |
| `BCRYPT_COST_FACTOR` | Use `12` or higher |
| `CORS_ALLOWED_ORIGINS` | Set to the exact origin(s) of your deployment — wildcards are rejected at startup when `NODE_ENV=production` |
| `POSTGRES_PASSWORD` | A strong, unique password |
| `SEED_ADMIN_PASSWORD` | A strong password; this is the initial System Admin credential |
| `SEED_DEMO_USER_PASSWORD` | Omit in production, or set to a strong password if demo users are needed |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_LOGIN` | Review and tighten for your expected traffic |

Supply all secrets at runtime via environment variables or a secrets manager.
Do not bake secrets into container images or commit them to the repository.

Generate secure JWT secrets with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Secret scanning

GitHub secret scanning is available under **Settings → Security → Secret scanning**
for this repository. Enable it to be alerted if a secret pattern is accidentally
committed.
