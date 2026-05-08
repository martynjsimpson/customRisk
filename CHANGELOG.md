# Changelog

All notable changes to Custom Risk are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Version levels:

- **Patch** — bug fixes, documentation corrections, dependency updates with no behaviour change.
- **Minor** — backwards-compatible new features or enhancements.
- **Major** — breaking changes to the API, data model, or deployment model.

---

## [Unreleased]

### Added

- First stable `1.0.0` release line for Custom Risk, reflecting a self-hosted product with a stable deployment model, versioned release assets, and a documented upgrade path.

### Changed

- Package versions across the monorepo are aligned on `1.0.0`.
- Release documentation now treats `1.0.0` as the current stable baseline rather than a future milestone.
- Documentation and release assets now consistently describe the `1.x` stable release line, including the release process, self-hosted install path, and release asset usage.
- The release compose asset now supports overriding `DATABASE_URL` directly for external PostgreSQL deployments, matching the documented operator workflow.

---

## [0.1.5] - 2026-05-08

### Added

- Self-hosted deployment distribution: every GitHub Release now attaches a ready-to-use `docker-compose.yml` and `.env.example` as downloadable assets, so operators can deploy without cloning the repository.
- Automatic database migration on container start: the container entrypoint runs `prisma migrate deploy` before starting the server, ensuring the schema is always current on first boot and after upgrades.
- First-run admin seeding: if `SEED_ADMIN_PASSWORD` is set, the container creates or upserts the admin account on startup. The password and display name are only written on first creation and are not overwritten on subsequent restarts.
- Optional demo data seeding: `SEED_DEMO_DATA` and `SEED_ADMIN_PASSWORD` are now independent controls. Set `SEED_DEMO_DATA=true` to also create demo users, two example registers, and representative sample risks. Omitting it gives a clean environment with only the admin account.
- Auto-generated JWT secrets: `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are generated on first container start if not provided, stored in a named volume, and reused on every restart. Operators no longer need to generate or manage these manually.
- `latest` image tag: the GHCR release image is now also tagged `latest` on every versioned release, allowing compose deployments to track the newest stable release without pinning a version.

### Fixed

- Seed re-run on container restart previously reset the admin account password and display name to the seed values, overwriting any changes made in the application. Password and display name are now preserved on all restarts after first creation.
- Demo user passwords were similarly reset on every container restart. Passwords are now only written on first creation.

### Changed

- `prisma` CLI moved from `devDependencies` to `dependencies` in the backend package so it is available in the production container for migration and seed execution.
- Container entrypoint changed from a direct `node` invocation to `docker/entrypoint.sh`, which handles migration, optional seeding, and server start in sequence.

### Migration

- No schema changes in this release. The container will apply `prisma migrate deploy` automatically on start; no manual migration step is required.

---

## [0.1.4] - 2026-05-08

### Changed

- Container publishing: GitHub Container Registry images are now built and published for both `linux/amd64` and `linux/arm64`, so the release image can be pulled natively on Apple Silicon as well as x86_64 hosts.
- Release image tags: documented the current GHCR tag layout more clearly. Main-branch builds publish `main` and `sha-<shortsha>`, while release builds publish the version tags such as `0.1.4` and `0.1`, with GHCR also marking the newest stable release as `latest`.

---

## [0.1.3] - 2026-05-07

### Added

- Profile page: users can update their display name and change their password from a new profile page, linked from the sidebar.
- Password change: the current password is verified before accepting a new one, and all active sessions are signed out on success.
- User preferences _(requires `FEATURE_USER_PREFERENCES=true`)_: per-user preferences are stored server-side and restored on login.
- Color scheme _(requires `FEATURE_USER_PREFERENCES=true`)_: users can choose Light, Dark, or Auto (follows OS) from their profile page.
- Feature flags: `FEATURE_*` environment variables let operators gate incomplete features; disabled features are hidden in the UI and return 404 from the API.
- Email-only person assignment: Person Picker fields now accept an email address for someone who does not yet have an account; the value is saved and shown with an "Unresolved" badge until they register.
- Person search: typing in a Person Picker field searches existing users by name or email; free-text email entry is available where the field allows it.
- Automatic person linking: when a user registers or logs in, any unresolved person assignments that match their email are automatically resolved to their account.
- Unresolved persons list: system administrators can view all unresolved person assignments across the register for data quality review.

### Changed

- Color scheme preference is applied before the first page render so there is no flash of the wrong theme on login.

### Fixed

- "Level", "Next Review", "Created By", and "Updated" were missing from the Fields configuration screen and ignored the field display order. All four now appear in configuration and respect the display order in both the Edit and Detail risk views.

### Migration

- Run `prisma migrate deploy` before starting the new version; two schema migrations are included.
- After migrating, run the person-reference backfill script once to link existing risk owner and person-picker assignments to the updated data model.

---

## [0.1.2] - 2026-05-07

### Changed

- Added version to the UI
- fixed broken node post upgrade

## [0.1.1] - 2026-05-07

### Changed

- Dependency updates: bumped GitHub Actions workflows (checkout, setup-node, Docker actions) and npm packages (pino, express-rate-limit, vite, @tabler/icons-react) to latest patch and minor versions.

---

## [0.1.0] - 2026-05-06

### Added

- Risk register core: create, view, update, and delete risks within registers.
- Register management: create and configure registers with scoring matrices, review frequency, and risk ID prefixes.
- Risk scoring: configurable likelihood values, impact values, risk levels, and matrix cell assignments.
- Custom fields: per-register dropdown and text fields attached to risks.
- Risk reviews: schedule and complete periodic risk reviews with due-date tracking.
- User management: create, activate, and deactivate users with System Admin or regular user roles.
- Register permissions: grant and revoke per-register access for users.
- Audit log: full event trail for risks, registers, users, and system actions.
- Dashboard: admin summary, personal risk view, and personal work queue.
- CSV export: filtered risk list export.
- Authentication: local email/password login with JWT access and refresh tokens.
- Health endpoint: `GET /api/v1/health` with database connectivity check.
- Docker release build: single app container serving compiled React frontend and Express API.
- Smoke test: `npm run smoke-test` for post-deployment health verification.

---

<!-- Release links — update when tagging -->
[Unreleased]: https://github.com/martynjsimpson/customRisk/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/martynjsimpson/customRisk/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/martynjsimpson/customRisk/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/martynjsimpson/customRisk/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/martynjsimpson/customRisk/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/martynjsimpson/customRisk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/martynjsimpson/customRisk/releases/tag/v0.1.0
