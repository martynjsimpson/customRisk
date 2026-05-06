# MVP Release Checklist

**Version:** v0.1.0  
**Purpose:** Go/no-go gate for the first MVP release. Complete or explicitly waive each item before tagging.

---

## Architecture and runtime

- [ ] Architecture confirmed: single app container (Express + compiled React) + PostgreSQL container.
- [ ] Docker release build works from a clean checkout: `docker build -t customrisk:test .`
- [ ] `docker compose up --build` starts the full stack without errors.
- [ ] Health endpoint returns HTTP 200: `curl http://localhost:3000/api/v1/health`
- [ ] Smoke test passes: `npm run smoke-test`
- [ ] Frontend loads in a browser at `http://localhost:3000`

## Database

- [ ] Prisma migrations apply cleanly from a blank database: `npm run db:migrate`
- [ ] Seed/demo data workflow works: `npm run db:setup`
- [ ] No manual schema changes exist outside of Prisma migrations.

## Build and tests

- [ ] Frontend build passes: `npm run build --workspace @custom-risk/frontend`
- [ ] Backend build passes: `npm run build --workspace @custom-risk/backend`
- [ ] TypeScript typechecks pass: `npm run typecheck`
- [ ] Tests pass: `npm run test`
- [ ] CI pull request workflow (Quality Gates + Docker Build) has passed on at least one PR.

## CI and release workflows

- [ ] `main` branch protection is enabled (PR required, force-push blocked).
- [ ] Quality Gates and Docker Build are required status checks on `main`.
- [ ] Main-branch image workflow (`main-image.yml`) has published at least one image to GHCR.
- [ ] Release workflow (`release.yml`) is confirmed by a dry run or review of the workflow file.

## Version and changelog

- [ ] Version is set to `0.1.0` in root `package.json`, `backend/package.json`, and `frontend/package.json`.
- [ ] `CHANGELOG.md` `[Unreleased]` section renamed to `[0.1.0] - <release-date>`.
- [ ] New empty `[Unreleased]` section added above the release section.
- [ ] Changelog comparison links updated.

## Documentation and environment

- [ ] `README.md` covers local setup, Docker runtime, health endpoint, and smoke test.
- [ ] `.env.example` is complete and contains no real secrets.
- [ ] Production environment variables section in README reviewed.
- [ ] `docs/release-process.md` reviewed and accurate.
- [ ] No real secrets exist in the repository to the best of current knowledge.
- [ ] GitHub secret scanning is enabled (Settings → Security → Secret scanning).
- [ ] Update LICENSES file with a suitable open source license (to be determined)

## Release

- [ ] All checklist items above are complete or explicitly waived with a documented reason.
- [ ] Release prep PR (`release/v0.1.0`) is merged to `main`.
- [ ] Tag created from `main`: `git tag v0.1.0 && git push origin v0.1.0`
- [ ] Release workflow completes successfully in GitHub Actions.
- [ ] Versioned image `0.1.0` is published to GHCR.
- [ ] GitHub Release `v0.1.0` exists with release notes.
- [ ] Published image confirmed to start: pull and run `docker compose up`, then smoke test.

---

## Waived items

| Item | Reason |
|---|---|
| _(none)_ | |
