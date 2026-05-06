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
| `release/<version>` | Release preparation, e.g. `release/v0.1.0` |

Use lowercase and hyphens. Keep descriptions short.

Examples:

```
feature/risk-export-csv
fix/review-date-timezone
chore/update-dependencies
docs/development-workflow
release/v0.2.0
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
npm run typecheck       # TypeScript typecheck all packages
npm run lint            # baseline lint gate (TypeScript typecheck)
```

---

## Release process

See [release-process.md](release-process.md) for the full release procedure
once that document is created.

High-level steps:
1. Create a `release/<version>` branch.
2. Update `CHANGELOG.md`.
3. Open and merge a release prep PR to `main`.
4. Tag the merge commit: `git tag v<version>`.
5. Push the tag: `git push origin v<version>`.
6. Confirm the release workflow completes and the versioned image is published.

---

## Database migrations

Prisma migrations are the only permitted mechanism for schema changes.

```sh
npm run db:migrate    # apply committed migrations to the configured database
npm run db:setup      # apply migrations and refresh seed data (local only)
```

Never alter the database schema manually outside Prisma migrations.

See the release readiness plan (Task 9) for production migration safety guidelines.
