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

## [0.1.3] - 2026-05-07

### Added

- **Self-service profile:** authenticated users can update their own display name at `PATCH /api/v1/users/me`.
- **Self-service password change:** authenticated users can change their own password at `POST /api/v1/users/me/change-password`; current password is verified, the new password is validated against the password policy, and all active sessions are revoked on success.
- **User preferences API** _(requires `FEATURE_USER_PREFERENCES=true`)_: `GET` and `PATCH /api/v1/users/me/preferences` store a per-user preferences object in the database; partial updates preserve unset keys.
- **Dark mode / colour scheme** _(requires `FEATURE_USER_PREFERENCES=true`)_: users can choose Light, Dark, or Auto (follows OS) on their profile page; the selection is persisted server-side and applied on next login.
- **Profile page:** `/profile` route accessible to all authenticated users, containing the name, password, and (when enabled) appearance sections; linked from the sidebar.
- **Feature flag infrastructure** _(PM0-05)_: `FEATURE_*` environment variables gate incomplete post-MVP features; `requireFeature` middleware returns 404 on disabled backend routes; `useFeatureFlags` hook gates frontend UI; `GET /api/v1/auth/me` now includes an `enabledFeatures` map.
- **Post-MVP baseline governance docs** _(PM0-01 to PM0-04)_: data model extension plan, API versioning rules, audit and permission extension plan.

### Changed

- `GET /api/v1/auth/me` response now includes an `enabledFeatures` object listing the current state of all `FEATURE_*` flags; the field is always present and defaults to all `false`.
- Session bootstrap fetches user preferences immediately after login when `FEATURE_USER_PREFERENCES` is enabled, applying the saved colour scheme before the first page render.

### Migration

- Added nullable `preferences jsonb` column to the `user` table (`20260507000000_add_user_preferences`). Run `prisma migrate deploy` (production) or `prisma migrate dev` (local) before starting the new version.

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
[Unreleased]: https://github.com/martynjsimpson/customRisk/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/martynjsimpson/customRisk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/martynjsimpson/customRisk/releases/tag/v0.1.0
