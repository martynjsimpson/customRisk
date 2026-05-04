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
- `SEED_ADMIN_PASSWORD` - local/dev password used by seed scripts for the default System Admin.

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

### Docker runtime

Docker Compose runs the app and PostgreSQL together:

```sh
docker compose up --build
```

The `app` service is built from the repository `Dockerfile` using Node 20
Alpine and is published on port `3000`. The `db` service uses
`postgres:16-alpine`, publishes PostgreSQL on port `5432`, and stores data in
the named `pgdata` volume. Compose sets the app container `DATABASE_URL` to use
the `db` service host.

To stop the stack:

```sh
docker compose down
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

The backend and frontend are separate TypeScript packages under npm workspaces.
The shared package is available for API DTOs, enums, and schemas that should not
be duplicated between frontend and backend.
