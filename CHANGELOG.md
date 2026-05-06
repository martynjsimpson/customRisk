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
[Unreleased]: https://github.com/martynjsimpson/customRisk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/martynjsimpson/customRisk/releases/tag/v0.1.0
