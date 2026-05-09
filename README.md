# Custom Risk

Custom Risk is a self-hosted, configurable risk register web application. It lets teams create and manage risk registers with custom scoring matrices, review schedules, configurable fields, and a full audit trail.

---

## Self-hosted deployment

### Prerequisites

- Docker with Compose (Docker Desktop, or Docker Engine with the Compose plugin).

### Install

Download the two deployment files from the [latest release](https://github.com/martynjsimpson/customRisk/releases/latest):

```sh
curl -LO https://github.com/martynjsimpson/customRisk/releases/latest/download/docker-compose.yml
curl -LO https://github.com/martynjsimpson/customRisk/releases/latest/download/env.example
```

Create your environment file:

```sh
cp env.example .env
```

Open `.env` and set the three required values:

| Variable | What to set |
|---|---|
| `POSTGRES_PASSWORD` | Any strong password — used only within the private Docker network |
| `CORS_ALLOWED_ORIGINS` | The URL users will access the app from, e.g. `https://risk.example.com` |
| `SEED_ADMIN_PASSWORD` | Your initial admin login password — see [First run](#first-run) below |

JWT signing secrets are auto-generated on first start and stored in a Docker volume. You do not need to set them unless you want to manage them yourself.

Quote password and secret values in `.env` so Docker Compose passes them literally, especially if they contain `$`, spaces, or other shell-special characters. Example: `SEED_ADMIN_PASSWORD='Abc123456789$qw'`.

Start the application:

```sh
docker compose up -d
```

The app will be available on port `3000` by default. Change `PORT` in `.env` to use a different port.

### First run

On container start, if `SEED_ADMIN_PASSWORD` is set, the admin account is created. If the account already exists, only its active status and lockout state are updated — **the password and display name are not overwritten**. It is safe to leave `SEED_ADMIN_PASSWORD` set across restarts.

If the first seed used the wrong password because your shell or Compose expanded an unquoted `$`, correcting `.env` later will not update the existing admin password automatically. Change it in the app after logging in, or recreate/reset the admin user before reseeding.

Log in at `http://<your-host>:3000` with:

- Email: the value of `SEED_ADMIN_EMAIL` (default: `admin@customrisk.local`)
- Password: the value of `SEED_ADMIN_PASSWORD`

### Demo data

To start with two example registers and a set of representative risks, also set `SEED_DEMO_DATA=true` in `.env` alongside `SEED_ADMIN_PASSWORD`. This creates three demo users and populates both registers with realistic sample data.

Demo users created when `SEED_DEMO_DATA=true`:

| Name | Email | Role |
|---|---|---|
| Alice Register Admin | `alice@example.com` | Register Admin on both demo registers |
| Bob Risk Owner | `bob@example.com` | Risk owner on sample risks |
| Carol Viewer | `carol@example.com` | Register Viewer on both demo registers |

Set `SEED_DEMO_USER_PASSWORD` in `.env` to give demo users a known password. If omitted, they are created with random non-printed passwords and cannot be used for login.

Demo data is idempotent — re-running with `SEED_DEMO_DATA=true` updates records in place rather than duplicating them. Demo user passwords are not reset on subsequent starts.

For a clean production environment with no sample data, leave `SEED_DEMO_DATA` unset.

### Database migrations

Migrations run automatically on every container start before the server accepts requests. There is no separate migration step required after an upgrade.

### Upgrading

Pull the latest image and restart:

```sh
docker compose pull
docker compose up -d
```

Migrations are applied automatically on startup. Back up your database before upgrading releases that include schema changes — those releases are noted in [CHANGELOG.md](CHANGELOG.md).

### Pinning a version

The compose file defaults to the `latest` release image. To pin to a specific version, set `CUSTOMRISK_VERSION` in your `.env`:

```sh
CUSTOMRISK_VERSION=1.0.0
```

### External database

To use an existing PostgreSQL server instead of the bundled database container, remove the `db` service block from the downloaded `docker-compose.yml` and set `DATABASE_URL` directly in `.env`:

```sh
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
```

All other configuration and the automatic migration behaviour are unchanged.

### Health check

```sh
curl http://<your-host>:3000/api/v1/health
```

Healthy response (HTTP 200):

```json
{ "data": { "status": "ok", "database": "ok" } }
```

---

## Versioning and releases

This project uses [Semantic Versioning](https://semver.org/). See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Contributing and local development

### Prerequisites

- Node.js 20 LTS or newer
- npm with workspace support
- PostgreSQL 16

### Install

```sh
npm install
```

### Environment setup

```sh
cp .env.local.example .env
```

Edit `.env` with local values. Key variables for local development:

- `NODE_ENV=development`
- `PORT=3000`
- `DATABASE_URL` — PostgreSQL connection string (use `localhost` for host-based dev)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — local PostgreSQL settings
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — random 256-bit secrets
- `SEED_ADMIN_PASSWORD` — initial System Admin password for local setup
- `SEED_DEMO_DATA=true` and `SEED_DEMO_USER_PASSWORD` — optional demo data

Prefer quoting password and secret values in `.env`, for example `SEED_ADMIN_PASSWORD='Abc123456789$qw'`.

### Local ports

| Service | URL |
|---|---|
| Backend / API | `http://localhost:3000` |
| Frontend dev server | `http://localhost:5173` |
| PostgreSQL | `localhost:5432` |

### Database setup and first login

Apply migrations and create the local admin account:

```sh
npm run db:setup
```

This runs `prisma migrate deploy` then the seed script using values from `.env`. It is idempotent — safe to re-run. The admin password and name are only set on first creation; subsequent runs update only active status and lockout state.

### Running locally

Start backend and frontend dev servers in separate terminals:

```sh
npm run dev:backend    # Express API on http://localhost:3000
npm run dev:frontend   # Vite dev server on http://localhost:5173
```

The Vite dev server is development-only. The release build serves the compiled React frontend directly from Express.

### Docker (local release build)

To run a release-like build locally:

```sh
docker compose up --build
```

### Package scripts

| Script | What it does |
|---|---|
| `npm run dev:backend` | Start backend in watch mode |
| `npm run dev:frontend` | Start Vite frontend dev server |
| `npm run build` | Build all workspace packages |
| `npm run test` | Run all test suites |
| `npm run test:backend` | Run backend tests only |
| `npm run test:frontend` | Run frontend tests only |
| `npm run test:shared` | Run shared package tests only |
| `npm run typecheck` | Typecheck all packages |
| `npm run lint` | Run the lint gate (TypeScript typecheck) |
| `npm run db:migrate` | Apply Prisma migrations to the configured database |
| `npm run db:setup` | Migrate then seed (admin + demo data from `.env`) |
| `npm run seed:admin` | Run the seed script only |
| `npm run smoke-test` | Health check against `http://localhost:3000` |

### Repository structure

- `frontend/` — React, Vite, TypeScript frontend
- `backend/` — Node.js, Express, TypeScript API with Prisma ORM
- `shared/` — shared TypeScript types, enums, and schemas
- `docker/` — container entrypoint script
- `docs/` — architecture, ADRs, planning, and product documents
- `scripts/` — local development and maintenance scripts

### Secret scanning

GitHub secret scanning can be enabled under **Settings → Security → Secret scanning** to alert on accidentally committed secrets.
