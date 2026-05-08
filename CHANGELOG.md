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
[Unreleased]: https://github.com/martynjsimpson/customRisk/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/martynjsimpson/customRisk/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/martynjsimpson/customRisk/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/martynjsimpson/customRisk/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/martynjsimpson/customRisk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/martynjsimpson/customRisk/releases/tag/v0.1.0
