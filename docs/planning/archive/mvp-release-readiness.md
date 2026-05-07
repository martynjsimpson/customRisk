# MVP Release Readiness Cleanup Plan

**Project:** Custom Risk  
**Document type:** Implementation plan  
**Status:** Complete — all 12 tasks done  
**Purpose:** Prepare the MVP codebase for a controlled first release and make future development safer, repeatable, and easier to manage.

---

## 1. Goals

This plan covers the cleanup work needed before treating the MVP as a releasable product.

The main goals are to:

- Align the runnable product with the confirmed technical architecture.
- Move from direct development on `main` to branch-based development.
- Add formal build, test, container image, and release workflows.
- Establish clear release points and version numbering.
- Make future feature development safer without covering feature flags, which are already planned separately.

---

## 2. Architectural Baseline

The confirmed MVP architecture defines Custom Risk as a containerised web system using:

- React frontend.
- Node.js / Express API backend.
- PostgreSQL database.
- Prisma ORM.
- Docker Compose for local and self-hosted orchestration.

The current architecture document describes the MVP runtime as a single **app container** containing the compiled React frontend served by Express, plus a separate PostgreSQL database container. If the intended target has changed to separate frontend and backend containers, that should be captured as an explicit architecture change before release.

---

## 3. Task Sequence

## Task 1 — Confirm the Target Runtime Architecture ✅ DONE

**Objective:** Resolve the architecture expectation before changing Docker, CI, or release workflows.

### Outcome

Option A confirmed: one app container (Express backend serving compiled React static frontend) plus one PostgreSQL container. No architecture change required. README updated with an explicit "Local development vs release runtime" section documenting that the Vite dev server is a dev-only tool and is not used in the release container.

---

## Task 2 — Standardise Docker Runtime for Release ✅ DONE

**Objective:** Ensure the released product runs according to the confirmed architecture, not the current local development shortcut.

### Outcome

Three fixes applied:

- **`backend/src/app.ts`**: Added `express.static` serving from `./public` and an SPA fallback (`GET *` → `index.html`) active only when `NODE_ENV=production`. API routes (`/api/...`) are excluded from the SPA fallback so unmatched API paths still return JSON 404.
- **`Dockerfile`**: Added `COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma` to carry the Prisma-generated client into the runtime image. The `--ignore-scripts` flag on runtime `npm ci` was blocking the `@prisma/client` postinstall, meaning the runtime container had no Prisma client and would have failed to connect to the database.
- **`docker-compose.yml`**: Changed `NODE_ENV` default from `development` to `production` so `docker compose up --build` activates the static-file serving code. Database healthcheck and named `pgdata` volume were already correct.

---

## Task 3 — Add Runtime Health and Release Smoke Checks ✅ DONE

**Objective:** Provide simple checks that CI and operators can use to verify a built release.

### Outcome

- **`backend/src/routes/health.routes.ts`**: Enhanced the existing `GET /api/v1/health` endpoint to run `prisma.$queryRaw\`SELECT 1\`` on every request. Returns `{ status: "ok", database: "ok" }` with HTTP 200 when healthy; `{ status: "degraded", database: "unreachable" }` with HTTP 503 when the database cannot be reached. No secrets or stack traces in either response.
- **`scripts/smoke-test.sh`**: Shell script that curls the health endpoint and exits 0/1 based on HTTP status. Accepts an optional base URL argument.
- **`package.json`**: Added `npm run smoke-test` shortcut.
- **`README.md`**: Documented the health endpoint response shapes and the smoke-test command.

---

## Task 4 — Move to Branch-Based Development ✅ DONE

**Objective:** Stop direct work on `main` and protect the release line.

### Outcome

- **`docs/development-workflow.md`**: Created. Covers branching model, branch naming conventions (`feature/`, `fix/`, `chore/`, `docs/`, `release/`), PR expectations, local development startup, Docker release startup, test commands, and release process overview.
- **GitHub branch protection** enabled on `main`: requires a pull request before merging, blocks force-pushes and branch deletion. Approving review not required (solo project). CI status checks will be added as a required check once Task 6 CI workflows have run (see Task 6).
- **Decision**: No approving review required for solo project; PRs serve as reviewable checkpoints and audit trail.

---

## Task 5 — Define Versioning and Release Rules ✅ DONE

**Objective:** Create formal release points with predictable version numbers.

### Outcome

- **Version**: `v0.1.0` chosen as first MVP release. All three `package.json` files (root, backend, frontend) were already at `0.1.0`. Root `package.json` is the single source of truth.
- **`CHANGELOG.md`**: Created at repo root using Keep a Changelog format. `[Unreleased]` section lists all MVP features. Will be renamed to `[0.1.0] - <date>` when the release tag is cut.
- **`docs/release-process.md`**: Created. Covers version increment rules, full release procedure (branch → changelog → PR → merge → tag → confirm CI → verify image), image tagging convention (`latest` not published), and rollback considerations.
- **`README.md`**: Added versioning section linking to changelog and release process doc.

---

## Task 6 — Improve CI for Pull Requests ✅ DONE

**Objective:** Ensure code is validated before it reaches `main`.

### Outcome

- **`.github/workflows/ci.yml`**: Two jobs — **Quality Gates** (typecheck, lint, migrations, tests, Prisma schema validation, builds for shared/backend/frontend) and **Docker Build** (builds image, no push). PostgreSQL 16 service added to Quality Gates so database-backed tests run against a real database in CI.
- **`.github/pull_request_template.md`**: Created with What/Why/Notes sections and a merge checklist covering CI, typecheck, tests, migrations, env vars, docs, and changelog.
- **`backend/test/app.test.mjs`**: Health test updated to accept either 200 (DB available) or 503 (DB unreachable) and validate response shape in both cases.
- **GitHub branch protection**: Quality Gates and Docker Build added as required status checks on `main`.

### Actions

1. Create or update a GitHub Actions workflow for pull requests.
2. Run checks for both frontend and backend packages:
   - Install dependencies with `npm ci`.
   - Type-check TypeScript.
   - Run linting if configured.
   - Run unit tests if present.
   - Build frontend.
   - Build backend.
3. Validate Prisma schema and migrations:
   - Run Prisma generate.
   - Run Prisma migration validation where practical.
4. Build the Docker image as part of PR validation, but do not publish it.
5. Add caching for npm dependencies where useful.

### Acceptance criteria

- Pull requests cannot merge unless validation passes.
- Frontend and backend builds are both checked.
- Docker build failures are caught before merge.
- PR workflow does not publish release images.

---

## Task 7 — Add Main-Branch Container Build and Publish ✅ DONE

**Objective:** Build and publish container images automatically when changes land on `main`.

### Outcome

- **`.github/workflows/main-image.yml`**: Created. Triggers via `workflow_run` after CI completes successfully on `main` (avoiding duplicate quality runs) and also via `workflow_dispatch` for manual triggers. Publishes to `ghcr.io/<owner>/customrisk` using `GITHUB_TOKEN` with `packages: write`. Tags every successful main-branch image with `main` and `sha-<shortsha>`. Adds `org.opencontainers.image.revision` label with the full commit SHA. Repository name is lowercased before use in the image reference. Version tags are left entirely to Task 8's release workflow.

---

## Task 8 — Add Formal Release Workflow ✅ DONE

**Objective:** Create intentional, versioned releases rather than treating every commit as a product release.

### Outcome

- **`.github/workflows/release.yml`**: Created. Triggered by `v*.*.*` tags. Three sequential jobs: **Quality Gates** (full validation suite including PostgreSQL service and migrations, identical to ci.yml since ci.yml does not trigger on tags), **Publish Release Image** (builds and pushes versioned Docker images to `ghcr.io`), **Create GitHub Release** (uses `gh release create --generate-notes --latest`). Image tags use semver patterns: `{{version}}` (e.g. `0.1.0`) and `{{major}}.{{minor}}` (e.g. `0.1`). `latest` Docker tag is not published (Decision 3). Release notes are auto-generated from merged PRs by the GitHub CLI.

---

## Task 9 — Add Database Migration Safety to the Release Process ✅ DONE

**Objective:** Make schema changes safer as the product evolves.

### Outcome

- **`docs/development-workflow.md`**: Expanded the database migrations section with the full local workflow (generate, review SQL, apply, commit) and a `--create-only` option for pre-review. Removed the stale forward reference to Task 9. Added link to release-process.md for production guidance.
- **`docs/release-process.md`**: Added a "Database migrations" section covering the required pre-migration database backup, two methods for applying migrations to a self-hosted deployment, health-check verification step, and a note to call out migrations explicitly in GitHub Release notes. Migrations do not run on container startup (Dockerfile confirmed — Decision 4).

---

## Task 10 — Add Environment and Secret Handling Checks ✅ DONE

**Objective:** Prevent accidental release of development-only settings or secrets.

### Outcome

- **`.env.example`**: Already complete with all required variables and safe placeholder values. No changes needed.
- **`.gitignore`**: Already ignores `.env` and `.env.local`. No changes needed.
- **CORS wildcard check**: `app.ts` already throws at startup if `CORS_ALLOWED_ORIGINS` contains `*` in production. No changes needed.
- **`README.md`**: Added "Production environment variables" section — table of every variable requiring a non-default production value, with requirement notes. Added note on generating secure JWT secrets. Added "Secret scanning" section directing to GitHub Settings → Security → Secret scanning.
- **Container image secrets**: Confirmed the Dockerfile does not bake in secrets; all secrets are supplied at runtime via environment variables.

---

## Task 11 — Add Repository Hygiene and Developer Guardrails ✅ DONE

**Objective:** Reduce avoidable mistakes during future development.

### Outcome

- **`docs/development-workflow.md`**: Already exists and covers branching, PR expectations, local and Docker startup, test commands, release process, and migration commands. Stale "see Task 9" reference removed.
- **`.github/pull_request_template.md`**: Already exists (created in Task 6).
- **`.github/ISSUE_TEMPLATE/bug_report.md`**: Created with Description, Steps to reproduce, Expected/Actual behaviour, Environment, and Additional context sections.
- **`.github/ISSUE_TEMPLATE/feature_request.md`**: Created with Problem, Proposed solution, Alternatives, and Additional context sections.
- **`.github/dependabot.yml`**: Created. Configures weekly Dependabot PRs for npm (grouped into dev and production dependency groups) and GitHub Actions, both targeting Monday, capped at 5 open PRs per ecosystem.
- **Pre-commit hooks**: Skipped. For a solo project with fast CI, Husky/lint-staged adds friction without clear benefit. Can be added later if needed.
- **`CODEOWNERS`**: Skipped — not useful for a solo project.

---

## Task 12 — Create MVP Release Checklist ✅ DONE

**Objective:** Provide a final go/no-go checklist for the first MVP release.

### Outcome

- **`docs/mvp-release-checklist.md`**: Created. Covers architecture and runtime verification, database migrations, build and test validation, CI and release workflow confirmation, version and changelog update, documentation and environment review, and the final release tag and publish steps. Includes a "Waived items" table for any explicitly skipped items.

---

## 4. Recommended Implementation Order

1. Confirm target runtime architecture.
2. Standardise Docker runtime for release.
3. Add health and smoke checks.
4. Move to branch-based development.
5. Define versioning and release rules.
6. Add PR CI validation.
7. Add main-branch container build and publish.
8. Add formal tag-based release workflow.
9. Add database migration safety checks.
10. Add environment and secret handling checks.
11. Add repository hygiene and developer guardrails.
12. Create and complete MVP release checklist.

---

## 5. Suggested Files to Add or Update

| File | Purpose |
|---|---|
| `README.md` | Local dev, Docker runtime, release usage, environment setup |
| `.env.example` | Safe documented environment variables |
| `Dockerfile` | Production multi-stage app image build |
| `docker-compose.yml` | Local/self-hosted runtime orchestration |
| `docker-compose.release.yml` | Optional release-like compose overlay |
| `.github/workflows/pr-checks.yml` | Pull request validation |
| `.github/workflows/main-image.yml` | Main branch image build and publish |
| `.github/workflows/release.yml` | Version tag release workflow |
| `CHANGELOG.md` | Versioned release notes |
| `docs/development-workflow.md` | Branching, PRs, development workflow |
| `docs/release-process.md` | Release tagging, image publishing, rollback notes |
| `docs/mvp-release-checklist.md` | Final release go/no-go checklist |
| `.github/pull_request_template.md` | PR quality and release-impact checklist |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |

---

## 6. Notes and Decisions to Make

### Decision 1 — Single app container or separate frontend/backend containers

The current confirmed architecture describes one app container serving both the compiled React frontend and Express API, plus a PostgreSQL container. If separate frontend and backend containers are now preferred, treat that as a deliberate architecture change rather than a cleanup task.

### Decision 2 — First MVP version number

Recommended default: `v0.1.0`.

Use `v1.0.0` only if the MVP is considered stable enough that breaking API, database, or deployment changes should be treated as major-version events.

### Decision 3 — Whether to publish `latest`

Recommended default: avoid `latest` initially, or only publish it from formal version tags. Commit-specific and version-specific tags are safer and more traceable.

### Decision 4 — Whether migrations run automatically

Recommended default: do not run production migrations automatically on app startup. Use an explicit migration command or documented release step so schema changes are controlled.

---

## 7. Definition of Done for MVP Release Readiness

MVP release readiness is complete when:

- The release runtime architecture is confirmed and documented.
- The app can be built and run from containers without local frontend Node execution.
- `main` is protected and treated as releasable.
- Pull requests validate build quality before merge.
- Merges to `main` produce traceable container images.
- Version tags produce formal release images and GitHub Releases.
- Version numbering and changelog rules are documented.
- Database migration handling is documented and checked.
- Environment and secret handling is safe for release.
- The MVP release checklist has been completed or explicitly waived item by item.
