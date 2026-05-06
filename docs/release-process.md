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

Update the same version in `backend/package.json` and `frontend/package.json`
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
- Confirm the versioned container image is published to the container registry.
- Confirm a GitHub Release is created with changelog notes.

### 7. Verify the published image

Pull and run the released image to confirm it starts correctly:

```sh
docker pull ghcr.io/martynjsimpson/customrisk:v<version>
docker compose up
npm run smoke-test
```

---

## Image tagging convention

| Tag | Meaning |
|---|---|
| `v0.1.0` | Exact version — immutable |
| `sha-<shortsha>` | Build from a specific commit |
| `main` | Latest build from `main` branch |

`latest` is not published. Use explicit version or SHA tags for deployments.

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
