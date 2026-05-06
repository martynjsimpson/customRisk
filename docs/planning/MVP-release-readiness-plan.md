# MVP Release Readiness Cleanup Plan

**Project:** Custom Risk  
**Document type:** Implementation plan  
**Status:** In progress — Tasks 1–7 complete, next: Task 8  
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

## Task 8 — Add Formal Release Workflow

**Objective:** Create intentional, versioned releases rather than treating every commit as a product release.

### Actions

1. Create a release workflow triggered by Git tags matching `v*.*.*`.
2. On tag creation:
   - Run the full validation suite.
   - Build the production Docker image.
   - Publish versioned container tags.
   - Create or update a GitHub Release.
   - Include changelog notes.
3. Tag container images with:
   - Exact version, for example `v0.1.0`.
   - Major/minor alias if useful, for example `v0.1`.
   - `latest` only if you are comfortable with it always pointing to the newest stable release.
4. Document the release procedure:
   - Update changelog.
   - Merge release prep PR.
   - Tag from `main`.
   - Confirm workflow completes.
   - Verify the published image can run.

### Acceptance criteria

- Versioned GitHub Releases are created from tags.
- Versioned container images are published from the same commit as the Git tag.
- Release notes are generated or copied from the changelog.
- `latest` usage is explicitly decided and documented.

---

## Task 9 — Add Database Migration Safety to the Release Process

**Objective:** Make schema changes safer as the product evolves.

### Actions

1. Confirm that Prisma migrations are the only accepted database schema change mechanism.
2. Add migration checks to CI.
3. Document the local migration workflow:
   - Create migration.
   - Review generated SQL where relevant.
   - Apply locally.
   - Test app behaviour.
   - Commit migration files.
4. Document the release migration workflow:
   - Back up production/self-hosted database before applying migrations.
   - Apply migrations using a controlled command.
   - Verify app health after migration.
5. Avoid automatic destructive migrations during container startup unless deliberately accepted.
6. Add guidance for rollback where database migrations are involved, noting that code rollback may not be sufficient after schema changes.

### Acceptance criteria

- Migration files are committed and reviewed.
- CI catches missing or invalid Prisma migration state where practical.
- Release notes identify migrations requiring operator attention.
- README documents migration apply and rollback considerations.

---

## Task 10 — Add Environment and Secret Handling Checks

**Objective:** Prevent accidental release of development-only settings or secrets.

### Actions

1. Review all environment variables used by frontend, backend, Docker, and CI.
2. Update `.env.example` with all required variables and safe example values.
3. Ensure real `.env` files are ignored by Git.
4. Add a README section explaining required production variables.
5. Confirm production CORS settings do not use wildcard origins.
6. Add a secret scanning/prevention step if available through GitHub settings or tooling.
7. Confirm generated container images do not bake in secrets.

### Acceptance criteria

- `.env.example` is complete and safe to commit.
- No real secrets exist in repository history to the best of current knowledge.
- Production secrets are supplied at runtime, not build time.
- CORS and auth secrets are explicitly configured for release.

---

## Task 11 — Add Repository Hygiene and Developer Guardrails

**Objective:** Reduce avoidable mistakes during future development.

### Actions

1. Add or standardise formatting and linting commands.
2. Consider adding pre-commit hooks with Husky/lint-staged if they do not slow development too much.
3. Add a `CONTRIBUTING.md` or `docs/development-workflow.md` covering:
   - Branching model.
   - PR expectations.
   - Local development startup.
   - Docker release-like startup.
   - Test commands.
   - Release process.
4. Add issue and PR templates:
   - Feature request.
   - Bug fix.
   - Release checklist.
5. Add dependency update workflow guidance, either manual or using a tool such as Dependabot.
6. Add a `CODEOWNERS` file only if useful. For a solo project, this may be unnecessary.

### Acceptance criteria

- New work has a documented path from branch to PR to merge.
- Common commands are discoverable.
- PRs have a checklist for tests, migrations, docs, and release impact.
- Dependency update expectations are documented.

---

## Task 12 — Create MVP Release Checklist

**Objective:** Provide a final go/no-go checklist for the first MVP release.

### Actions

Create a release checklist covering:

1. Architecture alignment confirmed.
2. Docker release build works from clean checkout.
3. `docker compose up --build` works.
4. Health endpoint passes.
5. Seed/demo data workflow works.
6. Prisma migrations apply cleanly.
7. Frontend build passes.
8. Backend build passes.
9. Tests pass.
10. CI pull request workflow passes.
11. `main` branch workflow publishes a commit image.
12. Version tag workflow publishes a versioned release image.
13. Changelog updated.
14. README updated.
15. `.env.example` updated.
16. No known secrets committed.
17. Known MVP limitations documented.
18. First release tag created.

### Acceptance criteria

- Checklist exists in the repo.
- The first MVP release is not tagged until checklist items are complete or explicitly waived.
- Any waived item is documented with a reason.

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
