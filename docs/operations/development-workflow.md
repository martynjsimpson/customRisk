# Development Workflow

**Project:** Custom Risk  
**Applies to:** MVP and onwards

---

## Branching model

`main` is always releasable. All changes reach `main` through pull requests.
Direct pushes to `main` are blocked by branch protection.

```
main          ──────────────────────────────────────────▶  (always releasable)
                  ↑ PR merge          ↑ PR merge
feature/...   ────────────▶
fix/...                          ────────────▶
```

---

## Branch naming

| Prefix | Use |
|---|---|
| `feature/<short-description>` | New functionality |
| `fix/<short-description>` | Bug fix |
| `chore/<short-description>` | Non-functional work: dependencies, tooling, config |
| `docs/<short-description>` | Documentation only |
| `release/<version>` | Release preparation, e.g. `release/v1.0.0` (see [release-process.md](release-process.md)) |

Use lowercase and hyphens. Keep descriptions short.

Examples:

```
feature/risk-export-csv
fix/review-date-timezone
chore/update-dependencies
docs/development-workflow
release/v1.0.0
```

---

## Starting new work

```sh
git checkout main
git pull
git checkout -b feature/<description>
```

Work on the branch, commit regularly, then open a pull request when ready.

---

## Pull request expectations

- Open a PR when the work is complete and the branch builds and typechecks cleanly.
- Give the PR a clear title describing what it does.
- Include context in the description: what changed, why, any migration or deployment notes.
- Check the PR template checklist before marking the PR ready.
- If the change affects frontend user interaction, ensure the PR includes or updates runtime behavioral coverage rather than relying only on source-assertion tests.
- For a solo project, self-review is acceptable. PRs still serve as a reviewable checkpoint and audit trail.

CI checks must pass before merging (once CI is configured — see Task 6 of the
release readiness plan).

---

## Local development startup

See [README.md](../README.md) for full environment setup.

Quick start — run both processes from the repo root:

```sh
# Terminal 1 — backend API on http://localhost:3000
npm run dev:backend

# Terminal 2 — frontend Vite dev server on http://localhost:5173
npm run dev:frontend
```

---

## Docker release-like startup

To run the full app as a single release container:

```sh
docker compose up --build
```

Access the app at `http://localhost:3000`. Both the API and the compiled
frontend are served by Express on the same port.

Run the smoke test after startup:

```sh
npm run smoke-test
```

---

## Test commands

```sh
npm run test            # all packages
npm run test:backend    # backend only
npm run test:frontend   # frontend only
npm --workspace @custom-risk/frontend run test:static   # source-shape guard tests
npm --workspace @custom-risk/frontend run test:runtime  # jsdom/vitest behavioral tests
npm run typecheck       # TypeScript typecheck all packages
npm run lint            # baseline lint gate (TypeScript typecheck)
```

### Frontend testing expectations

- `frontend/test/*.test.mjs` covers static source assertions and lightweight guardrails such as feature wiring, route exposure, and script/package expectations.
- `frontend/test/*.behavior.test.tsx` covers runtime component behavior using `vitest`, `jsdom`, and Testing Library.
- Frontend changes that modify user interaction, mutation flows, conditional rendering, or cache-refresh behavior should include a runtime behavioral test when the regression would not be caught by a static assertion alone.
- When fixing a UI bug, prefer adding a regression test that exercises the user-visible workflow, not only the implementation detail.

---

## Release handoff

Day-to-day development ends when the branch is merged to `main`. From that
point onwards, follow [release-process.md](release-process.md) for release
branch preparation, version bumps, changelog updates, tagging, release
verification, and rollback guidance.

---

## Database migrations

Prisma migrations are the only permitted mechanism for schema changes. Never
alter the database schema manually outside of Prisma migrations.

### Local migration workflow

1. Make model changes in `backend/prisma/schema.prisma`.
2. Generate the migration file:
   ```sh
   npm --workspace @custom-risk/backend exec -- prisma migrate dev --name <description>
   ```
3. Review the generated SQL in `backend/prisma/migrations/<timestamp>_<description>/migration.sql`.
4. Apply and verify the app works locally.
5. Commit the new migration file alongside the schema change.

```sh
npm run db:migrate    # apply committed migrations to the configured database
npm run db:setup      # apply migrations and refresh seed data (local only)
```

### Creating migrations without applying them

To generate a migration file without applying it (for review before applying):

```sh
npm --workspace @custom-risk/backend exec -- prisma migrate dev --create-only --name <description>
```

### Production releases

Production database backup, upgrade, verification, and rollback steps live in
[release-process.md](release-process.md). Keep this document focused on authoring
and validating migrations during development.
