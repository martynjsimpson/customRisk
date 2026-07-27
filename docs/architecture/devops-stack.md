# DevOps stack and conventions

Extracted 2026-07-27 from `.claude/agents/devops-engineer.md` during `/work-init`
adoption, preserved close to verbatim.

## Deployment architecture

- The app is containerised: a single App Container (Express + React static build) + a DB
  Container (PostgreSQL 16).
- Local development uses `docker-compose.yml` (builds from source).
- Releases use `docker-compose.release.yml` (references the GHCR image by version tag).
- The container entrypoint (`docker/entrypoint.sh`) runs `prisma migrate deploy`,
  optionally seeds, then starts `node backend/dist/server.js`.
- Public app port: `3000`.
- App runtime image: `node:22-alpine`.
- DB image: `postgres:16-alpine`.

## Multi-stage build

```
Stage 1 (build): npm ci → npm run build → compile seed script
Stage 2 (runtime): npm ci --omit=dev → copy dist files → ENTRYPOINT entrypoint.sh
```

## Release distribution (ADR-0007)

- Every GitHub Release attaches two asset files:
  - `docker-compose.yml` — sourced from `docker-compose.release.yml`, references GHCR
    image by version tag
  - `env.example` — sourced from `.env.deploy.example`
- Image is published to GHCR and tagged with the version (e.g.
  `ghcr.io/martynjsimpson/customrisk:v1.7.1`).

## GitHub Actions workflows

The active workflows in `.github/workflows/` are:

- `ci.yml` — runs on PR to main; runs tests, typecheck, and build
- `release.yml` — builds and pushes the Docker image to GHCR, creates a GitHub Release
  with assets
- `main-image.yml` — builds the main branch image
- `dependabot-auto-merge.yml` — auto-merges approved Dependabot PRs

> Note: this file (as extracted) previously described `release.yml` as triggered "on push
> to main." The actual workflow, checked during `/work-init`, triggers on `v*.*.*` tag
> push instead. Left as a flag for the DevOps Engineer to correct rather than silently
> rewritten.

## Node runtime (ADR-0002)

- CI and Docker both use Node.js 22 (`.nvmrc`, `Dockerfile`, GitHub Actions workflows).
- Package engine constraint in `package.json` is `>=20.19` — do not tighten without a
  deliberate decision.

> Note: root `package.json` engines currently reads `>=24.0`, not `>=20.19` as stated
> above, and `docs/architecture/technical-architecture.md` states Node 20 LTS. Three
> different numbers across the repo — reconcile before relying on any one of them.

## Responsibilities

1. **Maintain CI/CD pipelines** — ensure workflows run correctly on PRs and pushes. When
   new test commands or build steps are added by other agents, update the relevant
   workflow to include them.
2. **Docker image maintenance** — keep the Dockerfile and compose files accurate and
   optimised. When the build process changes (new package, new build step), update the
   Dockerfile accordingly.
3. **Release pipeline** — ensure `release.yml` correctly tags the image with the version
   from `package.json`, attaches release assets, and creates the GitHub Release.
4. **Scripts** — maintain and create scripts in `scripts/` for common automation tasks
   (database operations, environment setup).
5. **Environment variable documentation** — when new environment variables are introduced
   by the backend developer, update `.env.local.example` and `.env.deploy.example` with
   appropriate comments.
6. **Dependabot** — maintain `.github/dependabot.yml` configuration.

## Working conventions

- Understand what changed in the build (new npm package, new test suite, new output
  directory) and update the pipeline accordingly.
- Coordinate with the backend developer when entrypoint or migration steps change.
