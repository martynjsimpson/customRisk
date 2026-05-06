# MVP Release Readiness Cleanup Plan

**Project:** Custom Risk  
**Document type:** Implementation plan  
**Status:** Draft  
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

## Task 1 — Confirm the Target Runtime Architecture

**Objective:** Resolve the architecture expectation before changing Docker, CI, or release workflows.

### Actions

1. Review the current implementation against the confirmed technical architecture.
2. Confirm whether the release target is either:
   - **Option A:** One app container containing the Express backend and compiled React static frontend, plus one PostgreSQL container.
   - **Option B:** Separate frontend, backend, and PostgreSQL containers.
3. If Option A is still correct, document that the frontend running locally under Node during development is a dev-only pattern.
4. If Option B is now preferred, create a new ADR or superseding architecture note before changing the implementation.
5. Update the README so developers understand the difference between local development mode and release/runtime mode.

### Acceptance criteria

- The release container model is explicitly confirmed.
- The README clearly explains local development versus release execution.
- Any architecture change is captured in an ADR before implementation.
- No CI or release workflow assumes an architecture that conflicts with the documented target.

---

## Task 2 — Standardise Docker Runtime for Release

**Objective:** Ensure the released product runs according to the confirmed architecture, not the current local development shortcut.

### Actions

1. Review the root `Dockerfile` and `docker-compose.yml`.
2. Ensure the production Docker build performs all required steps:
   - Install frontend dependencies.
   - Build the React frontend.
   - Install backend dependencies.
   - Build the backend TypeScript.
   - Copy the frontend build output into the backend/runtime image if using the single app-container architecture.
   - Run the backend from compiled JavaScript, not TypeScript source.
3. Ensure Express serves the compiled frontend static files in production.
4. Ensure `docker compose up --build` creates a complete working local release-like environment.
5. Add or verify a database healthcheck and app dependency on database readiness.
6. Add a production-oriented compose file if useful, for example `docker-compose.release.yml`, while keeping local development convenient.

### Acceptance criteria

- A clean checkout can be built and run fully through Docker Compose.
- The frontend does not need to be run separately through local Node for release execution.
- PostgreSQL data persists through a named Docker volume.
- Required environment variables are documented in `.env.example`.
- The app starts successfully after database healthcheck completion.

---

## Task 3 — Add Runtime Health and Release Smoke Checks

**Objective:** Provide simple checks that CI and operators can use to verify a built release.

### Actions

1. Add a lightweight backend health endpoint, for example `GET /api/v1/health`.
2. Include basic checks such as:
   - App process is running.
   - Environment is loaded.
   - Database connection is reachable.
3. Avoid exposing sensitive configuration or secrets in the health response.
4. Add a smoke-test script that can be run after container startup.
5. Document the health endpoint and smoke-test command in the README.

### Acceptance criteria

- Health endpoint returns a clear success/failure result.
- Smoke test can be run locally and in CI.
- No secrets or stack traces are exposed through the health endpoint.

---

## Task 4 — Move to Branch-Based Development

**Objective:** Stop direct work on `main` and protect the release line.

### Actions

1. Create a default branch workflow:
   - `main` is always releasable.
   - Work happens on short-lived feature, fix, chore, or release-prep branches.
   - Changes are merged through pull requests.
2. Create branch naming conventions:
   - `feature/<short-description>`
   - `fix/<short-description>`
   - `chore/<short-description>`
   - `docs/<short-description>`
   - `release/<version>`
3. Enable GitHub branch protection for `main`:
   - Require pull request before merge.
   - Require CI checks to pass.
   - Require branch to be up to date before merge where practical.
   - Block force-pushes.
   - Block deletion of `main`.
4. Decide whether to require approving review. For a solo project this can be optional initially, but PRs should still be used to create reviewable checkpoints.
5. Update the contributor/developer workflow documentation.

### Acceptance criteria

- Direct pushes to `main` are blocked or strongly discouraged.
- All changes to `main` go through pull requests.
- Branch naming conventions are documented.
- Required checks must pass before merge.

---

## Task 5 — Define Versioning and Release Rules

**Objective:** Create formal release points with predictable version numbers.

### Actions

1. Adopt Semantic Versioning:
   - `MAJOR.MINOR.PATCH`
   - Start MVP release at `v0.1.0` or `v1.0.0` depending on whether you want MVP to indicate pre-stable or stable.
2. Recommended approach:
   - Use `v0.1.0` for the first MVP release if the product is still expected to change quickly.
   - Move to `v1.0.0` when the API, data model, and deployment model are considered stable.
3. Add version metadata in a single source of truth, such as the root `package.json` or a dedicated `VERSION` file.
4. Tag releases from `main` using Git tags, for example `v0.1.0`.
5. Add a `CHANGELOG.md` using a simple Keep a Changelog style.
6. Define what increments each version level:
   - Patch: bug fixes and documentation-only release changes.
   - Minor: backwards-compatible features.
   - Major: breaking API, data model, deployment, or migration changes.

### Acceptance criteria

- Versioning approach is documented.
- First MVP version number is chosen.
- Releases are associated with immutable Git tags.
- Changes are captured in `CHANGELOG.md`.

---

## Task 6 — Improve CI for Pull Requests

**Objective:** Ensure code is validated before it reaches `main`.

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

## Task 7 — Add Main-Branch Container Build and Publish

**Objective:** Build and publish container images automatically when changes land on `main`.

### Actions

1. Create a GitHub Actions workflow triggered on pushes to `main`.
2. Run the full validation suite before publishing.
3. Build the production Docker image.
4. Publish the image to a container registry, such as GitHub Container Registry.
5. Apply image tags such as:
   - `main`
   - Git commit SHA, for example `sha-<shortsha>`
   - Version tag when the workflow is triggered by a release tag.
6. Ensure registry credentials use GitHub Actions secrets or `GITHUB_TOKEN`, not committed credentials.
7. Add metadata labels to the image:
   - Source repository.
   - Commit SHA.
   - Version.
   - Build date.

### Acceptance criteria

- Every successful merge to `main` produces a traceable image.
- Image tags allow rollback to a specific commit.
- No image is published if validation fails.
- Container registry authentication is handled securely.

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
