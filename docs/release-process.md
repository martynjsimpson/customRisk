# Release Process

**Project:** Custom Risk  
**Versioning:** Semantic Versioning (`MAJOR.MINOR.PATCH`)  
**Version source of truth:** root `package.json`

---

## Version number rules

| Level | When to increment |
|---|---|
| **Patch** | Bug fixes, documentation corrections, dependency updates with no behaviour change |
| **Minor** | Backwards-compatible new features or enhancements |
| **Major** | Breaking changes to the API contract, data model, or deployment model |

The first MVP release is `v0.1.0`. Move to `v1.0.0` only when the API, data
model, and deployment model are considered stable enough that breaking changes
should be treated as major events.

---

## Release procedure

### 1. Create a release branch

```sh
git checkout main
git pull
git checkout -b release/v<version>
```

### 2. Update the version

Update `version` in the root `package.json`:

```json
{ "version": "0.1.0" }
```

Update the same version in `backend/package.json` and `frontend/package.json` and `shared/package.json`
to keep all packages in sync.

### 3. Update the changelog

In `CHANGELOG.md`:

1. Rename `[Unreleased]` to `[<version>] - <YYYY-MM-DD>`.
2. Add a new empty `[Unreleased]` section above it.
3. Update the comparison link at the bottom of the file:

```markdown
[Unreleased]: https://github.com/martynjsimpson/customRisk/compare/v<version>...HEAD
[<version>]: https://github.com/martynjsimpson/customRisk/compare/v<previous>...v<version>
```

### 4. Open and merge the release PR

Push the release branch and open a pull request targeting `main`.

```sh
git add package.json backend/package.json frontend/package.json CHANGELOG.md
git commit -m "chore: release v<version>"
git push origin release/v<version>
```

Merge the PR once CI checks pass.

### 5. Tag the release from `main`

```sh
git checkout main
git pull
git tag v<version>
git push origin v<version>
```

### 6. Confirm the release workflow

- Check GitHub Actions: the release workflow triggered by the `v*.*.*` tag should run.
- Confirm the versioned container image is published to the container registry with tags `<version>`, `<major>.<minor>`, and `latest`.
- Confirm a GitHub Release is created with changelog notes.
- Confirm `docker-compose.yml` and `.env.example` are attached as downloadable assets on the GitHub Release.

### 7. Verify the published image

Download the release assets and verify the full end-user install path:

```sh
curl -LO https://github.com/martynjsimpson/customRisk/releases/download/<version>/docker-compose.yml
curl -LO https://github.com/martynjsimpson/customRisk/releases/download/<version>/.env.example
cp .env.example .env
# Fill in POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# CORS_ALLOWED_ORIGINS, and SEED_ADMIN_PASSWORD in .env
docker compose up -d
npm run smoke-test
```

The container entrypoint runs `prisma migrate deploy` automatically before starting the server, so no separate migration step is needed during this verification.

---

## Image tagging convention

| Tag | Meaning |
|---|---|
| `0.1.0` | Exact version — immutable |
| `0.1` | Major/minor release line |
| `sha-<shortsha>` | Build from a specific commit |
| `main` | Latest build from `main` branch |
| `latest` | Latest stable release image |

Use explicit version tags for deployments when you want an immutable release target.

---

## Database migrations

Migrations run automatically when the container starts. The entrypoint runs
`prisma migrate deploy` before handing off to the server. This is idempotent —
if all migrations have already been applied it exits immediately.

### Before upgrading a deployment that includes schema changes

1. Back up the database before pulling the new image:
   ```sh
   pg_dump -U <user> -h <host> <database> > backup-$(date +%Y%m%d-%H%M%S).sql
   ```
2. Review the SQL in `backend/prisma/migrations/` to understand what will change.
3. Pull the new image and restart:
   ```sh
   docker compose pull
   docker compose up -d
   ```
   Migrations apply automatically on the first start of the new container.

### Applying migrations manually

If you need explicit control over when migrations run (e.g. during a maintenance
window), you can apply them before restarting the container:

```sh
docker compose exec app node_modules/.bin/prisma migrate deploy --schema backend/prisma/schema.prisma
```

Or from the host, with `DATABASE_URL` set:

```sh
DATABASE_URL=<production-url> npm run db:migrate
```

### Verifying after upgrade

Check the health endpoint after the container restarts:

```sh
curl https://<your-host>/api/v1/health
```

A healthy response confirms the server started and connected to the migrated database.

### Release notes

If a release includes Prisma migrations, note it explicitly in the GitHub
Release so operators know to take a database backup before upgrading.

---

## Rollback

To roll back to a previous version, deploy the container image for that version
tag and apply the corresponding database state.

**Important:** code rollback may not be sufficient after a schema migration. If
the new version applied Prisma migrations, reverting the container image without
also reverting the database schema may cause the old image to fail. Assess
migration impact before rolling back and restore from a database backup if needed.

---

## Known MVP limitations

Document any limitations or known issues in the GitHub Release notes at the time
of tagging. Update this section with standing limitations that apply across releases.
