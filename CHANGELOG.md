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

- **Custom fields: configurable validation modes (allow / warn / block)**
  - Each custom field can now be set to one of three validation modes. `BLOCK` prevents saving until the field is filled; `WARN` lets the user proceed after explicitly acknowledging the warning; `ALLOW` imposes no constraint. Existing required fields are migrated to `BLOCK`; all others default to `ALLOW`. Acknowledged warnings are recorded in the audit trail.

- **Risk register: per-risk validation status and register-level validation summary**
  - Each risk in the list now carries a `validationStatus` (`BLOCK`, `WARN`, or `OK`) computed from its custom field values against the register's active field definitions. A coloured dot is shown next to the Risk ID in the table for any risk with missing required or recommended fields. A summary banner above the table shows how many open risks have `BLOCK` or `WARN` issues, with a one-click filter to show only those risks.

- **Custom fields: multi-select field type**
  - A new `MULTI_SELECT` field type allows risks to hold multiple pre-defined values for a single field. Selections are stored in a dedicated junction table (`risk_custom_field_multi_select_value`) rather than the scalar custom field value row, enabling clean many-to-many semantics. Multi-select fields support options management, validation modes, and appear in both the risk form and risk table columns. The Options button in the field configuration table now appears for multi-select fields as well as dropdowns.

- **Custom fields: calculated field type data model**
  - A new `CALCULATED` field type establishes the schema and lifecycle rules for computed custom fields. Calculated fields store a formula expression and a dependency list (field UUIDs referenced by the formula). They cannot be edited directly by users, cannot be marked required, and always carry `ALLOW` validation mode. The formula syntax supports `{field:uuid}` references with basic arithmetic operators. Evaluation is handled in the separate evaluation service (PM5-05).

- **Custom fields: calculated field evaluation**
  - Calculated fields are now evaluated automatically on every risk create and update. The formula engine supports field references (`{field:uuid}`), built-in risk properties (`{score}`, `{likelihood}`, `{impact}`), basic arithmetic with correct operator precedence, and math functions (`round`, `ceil`, `floor`, `abs`, `min`, `max`). Computed values are stored in the standard custom field value table as text. Invalid formulas are rejected at field-creation/update time so broken formulas never reach risks.

- **Custom fields: field-level visibility by role**
  - Each custom field definition now carries a `visibleToRoles` list. When the list is non-empty, only users whose effective register role appears in that list will see the field in the risk form, risk detail, and risk table. An empty list means the field is visible to everyone. System Admins and Register Admins always see all fields regardless of the setting. Field admins configure visibility through a new multi-select control in the custom field modal.

- **Custom fields: field type migration framework**
  - Administrators can now migrate a custom field to a compatible type without data loss. A GET preview endpoint returns the number of risks and values that will be affected before any change is made. The POST migrate endpoint converts values atomically: dropdown selections become multi-select junction rows; number, boolean, and date values are coerced to their text representation. Unsafe conversions (e.g. MULTI_SELECT → DROPDOWN, CALCULATED ↔ anything, PERSON_PICKER) are rejected. Each migration writes an audit event recording the from/to type change.

- **Custom fields: Risk Response Owner visibility flag**
  - Each custom field definition now carries a `visibleToRiskResponseOwners` boolean (default `true`). When set to `false`, the field will be suppressed from the limited parent-risk context that Risk Response Owners see when acting on a linked action. The flag defaults to `true` so existing fields remain fully visible. Enforcement will activate when the Risk Response Owner permission model (Phase 7) is implemented.

## [1.7.0] - 2026-06-08

### Fixed

- **Risk ownership: person-picker owners can now view and edit their own risks**
  - Users assigned as Risk Owner through the person-picker field were not recognised for ownership-based access checks. They could not view or edit risks they owned unless they also held a broader register role. Ownership is now checked through both assignment paths consistently.

- **Password change: current session is preserved**
  - Changing your password previously signed you out of the session in which you made the change, forcing an immediate re-login. The current session is now kept active; all other sessions are still signed out.

- **User preferences: nested preference groups are merged, not replaced**
  - Saving a preference within a nested group (such as column visibility for one register) previously overwrote the entire group, losing settings for other registers or contexts. Each update now merges into the existing group rather than replacing it.

## [1.6.0] - 2026-06-08

### Fixed

- **Seed script: fixed crash on fresh database setup**
  - `db:setup` (and `seed:admin`) failed with a `PrismaClientInitializationError` after the app moved to the `PrismaPg` driver adapter. The seed was still constructing `PrismaClient` without an adapter. It now uses the same `pg.Pool` + `PrismaPg` setup as the rest of the backend.

- **Risk update: `nextReviewDate` no longer recalculates on unrelated saves**
  - Editing a risk (e.g. changing state) could silently shift `nextReviewDate` even when the user did not touch the created date. This happened because the recalculation was triggered whenever `createdDate` was present in the request, not only when it changed. The condition now checks that `createdDate` actually differs from the stored value before recalculating.

- **Risk detail modal: layout and display improvements**
  - Modal is now wider (900 px) and uses an auto-sizing scroll area, preventing horizontal overflow on risk detail, review history, and audit history tables.
  - IP address column is hidden from the audit history table within the risk detail modal, where it is not relevant.



### Added

- **Audit log: CSV export**
  - Export button added to the system audit page and register audit panels, exporting all rows matching the current filters.
  - Exports are capped at 5,000 rows; an error is shown if the limit is exceeded, prompting the user to narrow their filters.
  - JSON content (changed fields, metadata) is handled gracefully — changed fields are rendered as a readable comma-separated field-name list; metadata is stringified.

- **Audit log: actor IP address capture**
  - Actor IP address is now recorded as a first-class field on all audit events initiated by an HTTP request, and displayed as a dedicated column in the audit table alongside Actor.
  - IP address is available as a filter on the system audit page and register audit panels.
  - System-triggered events (no HTTP context) record null for IP address.

## [1.5.0] - 2026-05-19

### Added

- **Frontend behavioral test coverage**
  - Added a dedicated frontend runtime test stack using `vitest`, `jsdom`, `@testing-library/react`, and `@testing-library/user-event`.
  - Added the first behavioral regression test for register draft field configuration, covering custom field creation and the expected post-save UI update.
  - Split frontend test execution into static source-assertion checks and runtime behavioral checks.

### Changed

- **Refactoring and internal cleanup**
  - Consolidated repeated scoring-configuration CRUD logic into a shared frontend `ScoringValueConfigTab` and backend `scoringValueCrud.helper`, reducing duplication across likelihood, impact, and risk-level configuration flows while preserving behaviour.
  - Extracted shared async Express route handling into `backend/src/utils/asyncRoute.ts` and updated route modules to use the common helper instead of repeating inline wrappers.
  - Split session-related frontend API contracts out of `auth/session.tsx` into `frontend/src/api/contracts.ts`, reducing coupling between auth state management and API type reuse.
  - Added a dedicated persons controller/service path for person-reference lookups and cleanup work, including the supporting `personReference.service.ts` changes and updated backend tests.
  - Removed empty stub files from the shared workspace so the package surface better reflects the code that is actually implemented and exported.
- **Documentation and workflow**
  - Added an ADR recording the decision to use a lightweight frontend runtime test stack for browser-like component behavior checks.
  - Updated development workflow, AI build guidance, and technical architecture documentation to reflect the frontend testing strategy and quality gates.

### Fixed

- **Draft configuration editing**
  - Restored draft-mode editing for likelihood values, impact values, risk levels, and the risk matrix after refactoring had inverted the editability checks and left draft changes disconnected from the draft snapshot update path.
  - Restored draft-mode editing for custom field configuration, including dropdown options, and fixed draft config projection so draft custom fields and options are returned in the frontend's expected shape.
  - New custom fields now default to a display order after the built-in core fields, preventing newly created fields from appearing unexpectedly at the top of the configuration table.
- **Frontend dependency resolution**
  - Aligned the monorepo on a single React 19 runtime (`react` and `react-dom` 19.2.6) after the workspace had drifted into a mixed React 18/19 install tree. This fixes the local development blank page and `Invalid hook call` / `QueryClientProvider` startup failure caused by different packages resolving different React instances.
  - Added Vite React deduplication in the frontend config so the browser bundle consistently resolves one React runtime within the workspace.

## [1.4.0] - 2026-05-19

### Changed

- **Dependency updates**
  - Prisma bumped from 5.22.0 to 7.8.0. Prisma 7 removes the `url` property from `datasource` in `schema.prisma`; connection configuration is now handled via a new `prisma.config.ts` file. The runtime `PrismaClient` now connects through `@prisma/adapter-pg` (a new direct dependency) backed by a `pg.Pool`, replacing the previous binary-engine model. `binaryTargets` removed from the generator as it is no longer relevant when using driver adapters.
  - React bumped from 18.3.1 to 19.2.6; `react-dom` updated in step. `@types/react` updated to 19.x; `@types/react-dom` updated to 19.x.
  - Mantine bumped from 7.17.8 to 9.2.1 across all packages (`@mantine/core`, `@mantine/form`, `@mantine/hooks`, `@mantine/notifications`). `@mantine/dates` and `mantine-datatable` removed — both were unused.
  - `react-router-dom` bumped from 6.30.3 to 7.15.1. No code changes required; all APIs in use are stable in v7.
  - TypeScript bumped from 5.9.3 to 6.0.3 across all workspaces.
  - Zod bumped from 3.25.76 to 4.4.3. One breaking change applied: `z.record()` now requires an explicit key schema — `z.record(z.unknown())` updated to `z.record(z.string(), z.unknown())` in `template.schemas.ts`.
  - `dotenv` bumped from 16.6.1 to 17.4.2.
  - `bcryptjs` bumped from 2.4.3 to 3.0.3.
  - Patch bumps: `axios` 1.16.1, `@tanstack/react-query` 5.100.11, `express-rate-limit` 8.5.2, `tsx` 4.22.3, `@types/node` 20.19.41.
  - Root `db:migrate` script updated to run via the backend workspace so Prisma CLI picks up `prisma.config.ts`.

## [1.3.0] - 2026-05-19

### Changed

- **Dependency updates**
  - `eslint` bumped from 9.27.0 to 10.4.0; `@eslint/js` bumped from 9.27.0 to 10.4.0.
  - `express` bumped from 4.22.1 to 5.2.1; `@types/express` bumped from 4.17.x to 5.0.6.
  - `dependabot/fetch-metadata` GitHub Actions step bumped from v2 to v3.
  - Patch and minor bumps: `vite` 8.0.13, `@vitejs/plugin-react` 6.0.2, `@tanstack/react-query` 5.100.10, `@tabler/icons-react` 3.44.0, `tsx` 4.22.3, `express-rate-limit` 8.5.2, `axios` 1.16.1, `@types/node` 20.19.41, `@types/react` 18.3.29.

### Fixed

- Express 5 changed `req.query` to a read-only getter. The `validateRequest` middleware was assigning parsed/coerced query data back to `req.query`, throwing a silent `TypeError` on every query-validated route. Fixed using `Object.defineProperty` to override the inherited getter on the request instance.
- Express 5 requires named wildcards in route paths (path-to-regexp v8). The production SPA catch-all route `"*"` updated to `"/{*path}"`.
- `@types/express` v5 widened `ParamsDictionary` to `{ [key: string]: string | string[] }`. Updated `TypedRequestBody`, `TypedRequestQuery`, and `TypedRequest` utility types in `express.d.ts`, and updated five controller files to import and use `ParamsDictionary` directly from `express-serve-static-core`. Route parameter lookups in `requirePermission` middleware now use a typed `routeParam()` helper that narrows `string | string[]` to `string`.

## [1.2.0] - 2026-05-19

All features in this release require `FEATURE_DRAFT_CONFIG=true`.

### Added

- **Register configuration and templates**
  - Versioned draft/publish workflow for register configuration: create a draft from the current published config, edit fields, scoring, and settings, then publish or discard. Only one draft can exist per register at a time.
  - Impact analysis before publish: reports blockers (empty active collections, broken matrix references) and warnings (items being deactivated that are assigned to live risks). Publishing is blocked until all blockers are resolved.
  - Publish applies all seven configuration sections (likelihood values, impact values, risk levels, response strategies, custom fields, matrix cells, register settings) atomically in a single database transaction. Items absent from the draft are deactivated rather than deleted, preserving referential integrity for historical risks.
  - Configuration export and import: download the current published config as a structured JSON file and re-import it into any register as a new draft for review.
  - Register configuration settings (description, risk ID prefix, review settings, etc.) are editable directly while a draft is in progress; they are not overwritten when the draft is published.
  - Template management (System Admin): create, version, and deactivate reusable register configuration templates. Templates are created from an exported config file or from an existing register's current configuration.
  - Create a register from a template: new registers are pre-populated with the template's full configuration using fresh database-generated IDs.
  - Template link tracking: registers created from a template, or whose config is saved as a template, are linked to that template version. The configuration panel shows whether the register is in sync with the latest template version.
  - Compare register to template: diff a register's current configuration against its linked template version across all seven configuration sections.
  - Apply latest template version: creates a draft from the latest published template version. The register's template link advances to the new version only when that draft is published.
  - Unlink a register from its template (System Admin).
  - Templates page (System Admin, `/templates`): list all templates with version, status, and actions to create a register, update the config, view details, download the config snapshot, and deactivate.
  - Thirteen new audit actions covering the full configuration and template lifecycle.

### Changed

- Removed a test assertion that required a specific comment to be present in `configVersion.service.ts`. The assertion now verifies the conditional application of register settings (`allowViewerExport: regSettings.allowViewerExport`) rather than the existence of a prose comment describing that behaviour.

### Fixed

- Semantic badges no longer truncate, clip, or render with ellipses across the application. Shared badge styling now preserves full labels for risk levels, review states, roles, actions, and other short status values, while badge-heavy tables and detail views use horizontal scrolling where needed instead of squeezing badge text.

### Migration

- Four new tables: `register_config_version`, `register_template`, `register_template_version`, and a `source_template_version_id` column on `register_config_version` for tracking template-originated drafts.
- `register` gains three nullable columns: `current_config_version_id`, `draft_config_version_id`, and `linked_template_version_id`.
- `AuditObjectType` enum gains two new values: `CONFIG_VERSION` and `REGISTER_TEMPLATE`.
- Run the backfill script (`scripts/backfill-phase4-config-versions.ts`) once after applying the migration to create an initial `PUBLISHED` version 1 snapshot for each existing register.

---

## [1.1.0] - 2026-05-09

### Added

- Per-user column selection on the Risk Register table and My Risks page. A Columns button opens a popover with checkboxes for every available column. Column visibility is saved to the user's server-side preferences and restored across devices and sessions. Each register maintains its own column set; My Risks has a separate scope. Custom fields appear as selectable columns grouped under a "Custom Fields" section (register table) or grouped by register name (My Risks). Disabled or deleted custom fields are silently omitted; cross-register custom fields show `—` for risks where the field does not apply. Action columns (Review, Edit, Delete) are always present and not hideable.
- Columns are rendered in canonical display order: core fields follow the application's field configuration order; custom fields are interleaved according to their `displayOrder` setting in the register's field configuration. The saved column list is a membership set — display order is always recomputed from configuration on render, not from the order in preferences.
- Audit event detail expansion: every audit table (Register Audit, system Audit page, dashboard Recent Audit Activity widget) now shows a chevron on rows that carry detail data. Clicking a row expands an inline JSON view of `metadataJson` and `fieldChanges` for that event.
- Register column on the system Audit page and dashboard Recent Audit Activity widget, showing which register each event belongs to. System-level events (login, user management) show `—`.
- `register_display_name` column on `audit_event`: the register's human-readable name is now captured at write time for all register- and risk-scoped audit events. The value is resolved automatically inside `recordAuditEvent` when not supplied by the caller, requiring no changes to existing audit call sites.
- `RISK_CREATED` audit events now include the risk's display ID and title in the summary (e.g. `Risk ISEC-0001 created: Security Misconfiguration`) and capture the full initial risk state in `metadataJson` (title, state, owner, likelihood, impact, risk score, risk level, response strategy, response action, created date, and next review date). The row is now expandable in all three audit views.
- Risk review audit events now produce a single `RISK_REVIEWED` event whose summary reads `Risk ISEC-0001 reviewed`, replacing the separate `NEXT_REVIEW_DATE_UPDATED` event that was previously emitted alongside it. The previous and new next-review date values are preserved as field-change detail on the same event, visible on row expansion. `NEXT_REVIEW_DATE_UPDATED` is retained as the action for any standalone next-review-date edits outside the review workflow.
- The system Audit page and Register Audit panel now include a filter bar with: a free-text Search input (matches across event summary, object name, and display risk ID), an Actor input (matches name or email), a date range (From / To), an Action select (all 37 actions organised by group), and an Object type select. Filters are applied as AND conditions; changing any filter resets pagination to page 1. The dashboard Recent Audit Activity widget is intentionally unfiltered.
- Favicon: the application now displays a Custom Risk favicon (blue rounded square with a white shield and "R" letterform) in browser tabs, bookmarks, pinned tabs, and iOS home screen shortcuts. Assets included: `favicon.ico` (16×16 and 32×32 ICO), `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png` (180×180), and `favicon.svg` (scalable, preferred by modern browsers). Source assets live in `frontend/public/`; `scripts/generate-favicon-ico.py` regenerates `favicon.ico` if the SVG is updated.
- Environment and version label in the left navigation: the expanded sidebar now displays the current runtime environment alongside the application version in the format `[DEVELOPMENT v1.1.0]` or `[PRODUCTION v1.1.0]`. The environment value is sourced from `NODE_ENV` on the backend and exposed through the existing `/api/v1/auth/me` session endpoint — only the sanitised environment label (`development` or `production`) is sent to the client. The collapsed sidebar state is unaffected.

### Changed

- Logout moved to left navigation: the Logout action has been removed from the top-right header and added to the bottom section of the left navigation, below the expand/collapse sidebar control. In collapsed sidebar mode, the control is shown as an icon with a tooltip. The top-right header now contains only the profile access link.
- Profile navigation consolidated: the user's display name in the top-right header area now links to My Profile, with the user icon shown alongside it. The duplicate My Profile entry has been removed from the left navigation.
- Field configuration screen now uses drag-and-drop to reorder custom fields. Each custom field row has a grip handle; dragging it repositions the field relative to both core fields (which act as fixed anchors) and other custom fields. The numeric display-order input has been removed from the add and edit field modals — order is managed exclusively through drag-and-drop.
- Audit event summaries for custom field events now include the field name and type, e.g. `Custom field 'Risk Owner' created (TEXT)` instead of `Custom field created`. Option events include both the option label and the parent field name.
- Custom field creation audit events now capture all field properties in `metadataJson` (`fieldName`, `fieldType`, `helpText`, `isRequired`, `isActive`, `displayOrder`), up from the previous three (`fieldType`, `isRequired`, `isActive`).
- Dropdown option creation audit events now capture `label` and `displayOrder` in `metadataJson` alongside the existing parent field reference.
- Dashboard Recent Audit Activity widget now uses the shared `AuditEventTable` component, giving it consistent column layout, expand-on-click behaviour, and the Register column.

### Fixed

- Typing in the Add field or Edit field modal would immediately delete each character as it was entered. The cause was Mantine's `useForm` returning a new object reference on every render, which caused the form-reset effect to re-fire on every keystroke and overwrite the input with the initial empty value.
- Dashboard Recent Audit Activity widget crashed with `event.fieldChanges is undefined` because the underlying query omitted the `fieldChanges` include. The dashboard now uses the shared `listAuditEvents` service function, which always includes field changes and maps events through the standard `mapAuditEvent` shape.
- Login page background was hardcoded to a light grey, leaving the page background white when the OS is in dark mode while the login card rendered correctly in dark mode. The background now adapts to the active colour scheme.

### Migration

- `audit_event` gains a nullable `register_display_name TEXT` column. The column is `NULL` for all pre-existing rows; new events written after this release will have the value populated automatically.

---

## [1.0.0] - 2026-05-09

### Added

- First stable `1.0.0` release line for Custom Risk, reflecting a self-hosted product with a stable deployment model, versioned release assets, and a documented upgrade path.

### Changed

- Package versions across the monorepo are aligned on `1.0.0`.
- Release documentation now treats `1.0.0` as the current stable baseline rather than a future milestone.
- Documentation and release assets now consistently describe the `1.x` stable release line, including the release process, self-hosted install path, and release asset usage.
- The release compose asset now supports overriding `DATABASE_URL` directly for external PostgreSQL deployments, matching the documented operator workflow.
- Release downloads now publish the deployment environment template as `env.example` instead of `.env.example`, avoiding a broken GitHub release asset URL for end users.

---

## [0.1.5] - 2026-05-08

### Added

- Self-hosted deployment distribution: every GitHub Release now attaches a ready-to-use `docker-compose.yml` and `env.example` as downloadable assets, so operators can deploy without cloning the repository.
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
[Unreleased]: https://github.com/martynjsimpson/customRisk/compare/v1.7.0...HEAD
[1.7.0]: https://github.com/martynjsimpson/customRisk/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/martynjsimpson/customRisk/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/martynjsimpson/customRisk/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/martynjsimpson/customRisk/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/martynjsimpson/customRisk/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/martynjsimpson/customRisk/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/martynjsimpson/customRisk/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/martynjsimpson/customRisk/compare/v0.1.5...v1.0.0
[0.1.5]: https://github.com/martynjsimpson/customRisk/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/martynjsimpson/customRisk/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/martynjsimpson/customRisk/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/martynjsimpson/customRisk/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/martynjsimpson/customRisk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/martynjsimpson/customRisk/releases/tag/v0.1.0
