# ADR-0007 — Self-Hosted Deployment Distribution via Release Assets

**Status:** Accepted  
**Date:** 2026-05-08  
**Applies to:** Custom Risk — all releases from v0.1.4 onwards, including the stable `1.x` line  
**Related documents:** Technical Architecture v1.1, docs/operations/release-process.md

---

## 1. Context

The CI pipeline builds and publishes the app container image to GitHub Container Registry (GHCR) on every release tag. However, no mechanism existed for an end user to deploy the application without cloning the repository. The `docker-compose.yml` in the repository uses `build: context: .`, which rebuilds from source and is unsuitable for end users. The GitHub Release contained only auto-generated changelog notes — no deployable artefacts.

Three gaps were identified:

1. **No user-facing compose file.** End users needed a compose file referencing the pre-built GHCR image rather than building from source.
2. **No distribution mechanism.** Nothing connected the GitHub Release to the files a user would need to run the application.
3. **No automatic migration on container start.** The container started the Node.js server directly without running `prisma migrate deploy`. On a fresh database this caused an immediate crash. On upgrade it required a separate manual migration step that was easy to forget or mis-sequence.

---

## 2. Decision

### 2.1 Release asset distribution

Two files are attached to every GitHub Release as downloadable assets:

- **`docker-compose.yml`** — a release-oriented compose file that references the GHCR image by tag rather than building from source. Source file in the repository: `docker-compose.release.yml`.
- **`env.example`** — a deployment-focused environment template with comments distinguishing required values from optional ones. Source file in the repository: `.env.deploy.example`.

The release workflow copies these files to `/tmp/` under their published names and uploads them via `gh release upload`. The repository source files retain their distinct names to avoid confusion with the developer-facing `docker-compose.yml` and `.env.local.example`.

The end-user install procedure is:

```sh
curl -LO https://github.com/martynjsimpson/customRisk/releases/latest/download/docker-compose.yml
curl -LO https://github.com/martynjsimpson/customRisk/releases/latest/download/env.example
cp env.example .env
# Edit .env — set POSTGRES_PASSWORD, CORS_ALLOWED_ORIGINS,
#              and SEED_ADMIN_PASSWORD
docker compose up -d
```

### 2.2 Automatic database migration on container start

The container entrypoint is changed from a direct `node` invocation to a shell script (`docker/entrypoint.sh`) that:

1. Runs `prisma migrate deploy` against `DATABASE_URL` before starting the server.
2. Runs the database seed script if `SEED_ADMIN_PASSWORD` is set in the environment.
3. Execs into `node backend/dist/server.js`.

`prisma migrate deploy` is idempotent — if all migrations have already been applied it exits immediately with no effect. Running it on every container start is therefore safe and eliminates the need for a separate pre-start migration step in the operator's deployment procedure.

The seed step is conditional on `SEED_ADMIN_PASSWORD` being non-empty. The seed script uses `upsert` throughout, making it safe to re-run. Operators who do not set `SEED_ADMIN_PASSWORD` skip seeding entirely, which is correct for enterprise deployments where the database is pre-populated or managed externally.

Because the seed script is TypeScript, a separate `backend/tsconfig.seed.json` is introduced to compile it to `backend/dist-seed/` during the Docker build. This avoids the need for `tsx` at runtime.

### 2.3 External database support

The release compose file supports an external PostgreSQL server by:

1. Setting `DATABASE_URL` directly to the external connection string.
2. Removing (or commenting out) the `db` service block.

No application code changes are required. The entrypoint migration step works identically against an external database.

### 2.4 `latest` image tag

The release workflow now publishes a `latest` tag in addition to semver tags such as `1.0.0` and `1.0`. The release compose file defaults to `latest` when `CUSTOMRISK_VERSION` is not set in the operator's environment. Operators who want a pinned, immutable deployment should set `CUSTOMRISK_VERSION` to a specific semver tag in their `.env`.

---

## 3. Decision Drivers

- **Zero-dependency install.** An operator with only Docker installed should be able to download two files and run one command to have a working application. No source checkout, no build toolchain, no extra orchestration tooling beyond Docker Compose (now bundled with Docker Desktop and standard on most server environments).
- **External database is a first-class deployment target.** Enterprise operators with an existing PostgreSQL server should not be required to run a database container. The compose file and entrypoint both support this without special casing.
- **Automatic migration reduces operational risk.** The previous model (manual migration as a separate pre-start step) created a window where an upgraded container could start against an un-migrated schema. Running migrations in the entrypoint closes that window: the schema is always current before the server accepts requests.
- **Avoid single-container anti-pattern.** Bundling PostgreSQL inside the app container via a process supervisor (supervisord, s6) was considered and rejected. It produces large images (~400–500 MB), complicates database backup and upgrade procedures, and is contrary to Docker's single-process-per-container convention. Docker Compose is the established distribution mechanism for multi-service self-hosted applications (Gitea, Outline, Bitwarden all use this pattern).

---

## 4. Alternatives Considered

### 4.1 Single container with embedded PostgreSQL

A supervisord-based image would bundle both the Node.js server and PostgreSQL, allowing a true `docker run` without a compose file.

**Rejected** because:
- Images would be ~400–500 MB versus ~150 MB for the app-only image.
- Database backup is non-standard: the operator must exec into the container to run `pg_dump`.
- PostgreSQL version upgrades require rebuilding the entire application image.
- Data volume management is more complex without explicit volume declarations.
- `docker compose up` with a two-line compose file is functionally equivalent to `docker run` from the operator's perspective.

Remains a viable option for a future "demo" or "trial" image variant if demand arises.

### 4.2 Manual migration as a documented release step

The previous approach: operators run `prisma migrate deploy` manually before restarting the container after an upgrade.

**Rejected** (for the primary deployment model) because:
- It is easy to forget, particularly for infrequent upgrades.
- The sequence matters: running the new container against an un-migrated schema causes a crash rather than a clean failure message.
- `prisma migrate deploy` is idempotent, so running it unconditionally on every start has no cost.

Manual migration remains documented as an alternative for operators who need explicit control over when schema changes are applied (e.g., during a maintenance window with a database backup taken first).

### 4.3 Repository clone as the distribution method

Operators could clone the repository and use the existing `docker-compose.yml` with `build: context: .`.

**Rejected** as the primary distribution path because:
- Requires Git, Node.js, and a full build environment on the host.
- Build times are significant (~2–3 minutes for a cold Docker build).
- Operators are exposed to in-progress development state rather than a tested release artefact.

The repository clone path remains appropriate for developers and contributors.

---

## 5. Consequences

- The `docker-compose.release.yml` file in the repository must be kept in sync with any future environment variable additions. When a new required variable is introduced, it must be added to both `docker-compose.release.yml` and `.env.deploy.example`.
- The `backend/tsconfig.seed.json` must continue to include any new files that `prisma/seed.ts` imports from `src/`, if those files' paths change.
- Operators should be advised to back up the database before upgrades that include Prisma migrations. The automatic migration step runs without prompting. This guidance belongs in the GitHub Release notes whenever a migration is included.
- The `latest` image tag is now published on every release. Operators using `CUSTOMRISK_VERSION=latest` will receive the newest release on their next `docker compose pull && docker compose up -d`. Operators who want stability should pin to a semver tag.
- The `prisma` CLI is now a production dependency of the `backend` package (moved from `devDependencies`). This increases the production `node_modules` size by approximately 10 MB.
