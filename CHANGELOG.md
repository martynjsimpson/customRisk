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

## [1.21.0] - 2026-06-21

### Added

- **On-demand branch Docker publishing (MAINT-007)**
  - A new `branch-image` GitHub Actions workflow can be triggered manually from any branch to build and publish a Docker package to GHCR. Branch images are tagged `branch-<slug>-<sha>` so they are clearly distinct from release packages. The README documents how to trigger the build and how to target the resulting image in a production Docker Compose setup. This enables iterative production-environment testing of fixes without merging to main.

### Changed

- **Reduced duplicate CI runs (MAINT-009)**
  - CI no longer re-runs the same checks when an identical commit SHA has already passed on another ref. A concurrency group on commit SHA also cancels redundant simultaneous runs. Required branch protection checks are still satisfied on all paths.

- **Feature flags now work in production Docker deployments (BUG-055)**
  - `FEATURE_*` environment variables were not forwarded into the Docker container, so `.env` flag values had no effect in production. All ten feature flags are now passed through in both `docker-compose.yml` and `docker-compose.release.yml`, defaulting to `false`. The `.env.deploy.example` template and README production setup section now document all available flags so operators can discover and enable them.

### Fixed

- **Modal error state cleared on close (BUG-053)**
  - All modals that can display an error now reset their error state when closed. Reopening any modal — risk add/edit, response action add/edit, review, configuration modals, and API key creation — always starts clean with no stale error from a previous session.

- **Audit table refreshes after response action mutations (BUG-052)**
  - Adding, editing, or soft-deleting a response action in the View Risk modal now immediately updates the audit table without requiring the modal to be closed and reopened.

- **App degrades cleanly when feature flags are disabled (BUG-054)**
  - Flag-gated routes and components now handle their flag being `false` without crashing or showing broken UI. The `childActions` flag correctly hides the Response Actions configuration fieldset and the child records panel when disabled, even when a register was previously configured in child records mode. Flag-gated backend endpoints return 404 rather than a 500 error when their flag is off.

## [1.20.0] - 2026-06-21

### Added

- **Coding standards document (MAINT-010)**
  - A new `docs/engineering/coding-standards.md` establishes agreed standards for backend, frontend, and test code. Covers the four-layer backend architecture, error handling conventions, Zod validation patterns, frontend component and hook discipline, TanStack Query and form state patterns, and test writing expectations including when each test level is appropriate and how to avoid brittle assertions. Includes concrete refactoring triggers for both frontend and backend so engineers and reviewers have a shared reference.

- **Manual permission test plan (QA-001)**
  - A new `docs/engineering/permission-test-plan.md` is a comprehensive pass/fail checklist covering all six roles (System Admin, Register Admin, Register Editor, Register Viewer, Risk Owner, Risk Response Owner) against every permission-gated entity and action in the system — register and risk CRUD, response action CRUD and ownership, review actions, configuration and permissions tabs, export controls, audit log access, user and template management, and API key management. Executable by a human tester without code access; verified against the PRD permission model (§5, §12).

- **i18n architecture assessment spike (SPIKE-005)**
  - A new `docs/spikes/SPIKE-005.md` assesses the work required to add multi-language support. Covers frontend string externalisation (recommends react-i18next with namespace-based JSON files), backend-generated text (error messages localised on the frontend only; audit descriptions flagged as a deferred architectural concern), help content locale management, validation message localisation via zod-i18n-map, and date/number/currency formatting (recommends centralising behind shared utilities using Day.js and Intl.NumberFormat). Identifies the highest-effort areas and proposes a five-phase incremental sequencing.

- **Playwright evaluation spike (SPIKE-003)**
  - A new `docs/spikes/SPIKE-003.md` evaluates adopting Playwright for browser-based permission testing. Recommends Playwright over Cypress for its TypeScript-native authoring and built-in multi-role session serialisation. Defines a three-layer test model extending ADR-0008, a fixture design with named users and explicit cross-user access edges seeded independently of the development seed script, a CI integration approach that gates E2E tests separately from the unit/integration quality gate, and a six-step implementation plan for a follow-on release. References the new permission test plan (QA-001) as the source of truth for the permission matrix the future suite will automate.

### Fixed

- **Response actions help content now reachable from the in-app help page (BUG-051)**
  - The response actions help article written in v1.19.0 was not wired into the help UI. It now appears as a "Response Actions" section within the Managing Risks help tab, accessible from the existing accordion navigation. No standalone tab was added.

## [1.19.0] - 2026-06-21

### Added

- **Response Action child records (PM7-CORE)**
  - Registers now have a "Response Action Mode" setting (Simple or Child Records). In Simple mode, response actions continue to work exactly as before — a single free-text field on each risk. In Child Records mode, response actions become first-class records with three built-in fields: Response (text), Status (dropdown), and Risk Response Owner (person picker).
  - The mode toggle is draft-gated: it can only be changed while the register has an active draft, and the migration does not run until the draft is published. This keeps mode changes consistent with all other configuration changes.
  - When switching from Simple to Child Records mode and publishing, any existing simple-field response action values are automatically migrated — each non-empty value becomes one child action record linked to its risk.
  - Switching back from Child Records to Simple mode is also supported at publish time, provided every risk has 0 or 1 active action records. If any risk has 2 or more, the publish is blocked and the Impact Analysis modal lists the offending risks by name so the user knows exactly which to fix. When the revert is allowed, each single action's response text is written back to the simple field and the child records are soft-deleted.
  - Status options are: Planned, In Progress, Implemented, Deferred, Cancelled (default: Planned).
  - Risk Owners can create new action records on their risks, and edit or soft-delete those actions. Register Admins have full CRUD on all actions in their register. Register Viewers can read all actions on risks they can view.
  - The Risk Response Owner field on an action grants a new permission tier: Risk Response Owners can view and update the Response and Status fields of their assigned actions. They can also view limited read-only risk context (fields marked "Visible to Risk Response Owners" in register configuration), but do not gain broader access to the risk or register.
  - Linked actions appear in the risk detail modal as a panel showing Response, Status, and Owner. Register Admins and Risk Owners can add, edit, and delete actions directly from this panel.
  - The Publish button now always routes through the Impact Analysis flow. Blockers (including mode-revert conflicts) are shown with structured detail before any publish can proceed.
  - All action field changes, status changes, and the initial migration are captured in the Risk Response Audit Log. The risk's own audit log also cross-references action status changes so Risk Owners can see action-level context without opening each action.
  - Help content updated to cover Response Action Mode: what it is, how to enable it, how to manage action records, and what Risk Response Owners can see and do.

## [1.18.0] - 2026-06-20

### Added

- **Yellow asterisk for WARN custom fields in the risk edit form (UI-021)**
  - Custom fields with `validationMode: WARN` now display a yellow asterisk (*) next to the field label in the risk edit form, giving users a visual "suggested" signal before they attempt to save. BLOCK (required) fields continue to show a red asterisk; ALLOW fields show none. Both colours use Mantine colour tokens and work in light and dark mode.

- **Live formula validation in the CALCULATED field modal (UI-022)**
  - The formula textarea in the custom field configuration modal now validates the formula as you type (debounced 600ms). An invalid formula shows a clear error message below the textarea and disables the Save button; correcting the formula clears the error and re-enables Save. Validation is client-side against a stub context, catching syntax and structural errors immediately without needing a server round-trip.

- **Real-time CALCULATED field preview in the risk edit form (UI-023)**
  - CALCULATED custom fields in the risk edit form now update their displayed value in real time as you edit the numeric fields they reference. The preview is computed entirely client-side and is shown in italic dimmed text with a "Preview — saved on submit" label to distinguish it from the authoritative server value. On save, the server evaluates the formula authoritatively and the preview is discarded.

## [1.17.1] - 2026-06-20

### Added

- **In-app help for scoring formulas (MAINT-006)**
  - Help content now covers the configurable scoring formula feature that shipped in v1.17.0: how to write a formula, available variable names (`likelihood`, `impact`, numeric custom fields), supported operators, validation and publish behaviour, and a note that existing registers are unaffected unless a Register Admin changes the formula.

### Changed

- **Open-risk and overdue counts on /registers are now clickable links (UI-020)**
  - The open-risk count in the register list links directly to that register filtered to open risks. The overdue count links to that register filtered to overdue reviews. Consistent with the existing Admin Summary widget pattern.

### Fixed

- **CALCULATED custom fields now work end-to-end (BUG-050, BUG-049)**
  - Adding a CALCULATED custom field no longer throws a validation error. The frontend now sends `validationMode: "ALLOW"` automatically for CALCULATED fields.
  - The formula is now persisted correctly through draft saves. Previously, any draft write (reorder, edit another field, etc.) would silently wipe the formula from the snapshot.
  - The formula is now pre-populated when reopening an existing CALCULATED field for editing.
  - Deleting a CALCULATED field that was added in the current draft (not yet published) no longer throws a "custom field not found" error.
  - Publishing a draft that includes CALCULATED fields now triggers recalculation of all existing risks in the register. Previously, existing risks retained stale or empty calculated values until they were individually saved.

## [1.17.0] - 2026-06-20

### Added

- **Configurable risk score formula engine (PM6-SCORING)**
  - Register Admins can now define a custom scoring formula per register in the register configuration panel. Formulas use canonical variable names (`{likelihood}`, `{impact}`, and any numeric custom fields) with standard arithmetic operators, so renaming likelihood or impact display labels has no effect on the formula.
  - Formulas are validated on save (draft) and enforced on publish — invalid formulas are rejected with a clear error message and block publishing.
  - When a configuration version containing a formula change is published, all risk scores in the register recalculate immediately. Each score change is captured in the audit log.
  - Existing registers default to `likelihood × impact` and are completely unaffected unless a Register Admin explicitly defines a new formula.
  - The formula engine is designed for reuse by inherent and residual scoring in a future release.

## [1.16.0] - 2026-06-20

### Changed

- **Node 24 LTS upgrade (MAINT-001)**
  - The project toolchain now targets Node 24 LTS. The `.nvmrc`, all GitHub Actions workflows, and the Docker base image have been updated. The `engines.node` constraint in `package.json` is tightened to `>=24.0`. All key dependencies (Prisma, Express, Vite, Vitest, TypeScript) are confirmed compatible.

- **CI/CD pipeline parallelisation (MAINT-004)**
  - Typecheck, test, and build steps now run across all workspaces in parallel using npm's native `--workspaces` flag, reducing quality job duration by an estimated 30–40%.

## [1.15.0] - 2026-06-19

### Added

- **Help content externalised to Markdown files (MAINT-002, MAINT-003)**
  - The /help page content is now stored in static Markdown files under `frontend/public/help/en/` rather than embedded in source code. Content is fetched at runtime with no new build dependencies. The directory structure supports future localisation without restructuring. Help content has been audited and corrected to reflect the current product: added API keys documentation, corrected register permissions (Viewer and Admin only), added the State field to risk creation, documented the Calculated field type, and added My Risks column picker and register filter.

- **Descriptive helper text beneath page titles (UI-011)**
  - All pages now show a short subtitle beneath the page title, matching the pattern already used on /help. The /api-keys page converts its previous alert box into helper text. Register pages use the register's own description field as their subtitle.

- **Review status field position configurable in risk detail modal (UI-014)**
  - Register admins can now control where the Review status row appears within the risk detail modal's field table, relative to custom fields. The position is set in the register's field configuration UI and stored in the register config (version-controlled alongside all other settings). Review status defaults to the last position in existing registers, preserving current behaviour. The position control is hidden when reviews are disabled for a register.

### Changed

- **Deleted legacy docs/planning directory (MAINT-005)**
  - The `docs/planning` directory and all 63 files within it have been removed. These documents were superseded by the `docs/work` planning system and risked being consulted as authoritative. References across architecture docs, ADRs, and the work README have been updated.

## [1.14.0] - 2026-06-19

### Added

- **Pagination for Audit History and Review History in View Risk modal (UI-018, UI-019)**
  - Both history tables in the View Risk modal are now paginated with 5 rows per page. A hard server-side cap of 100 records is enforced — the most recent 100 are returned. When the cap applies, the table shows a note explaining that only the most recent 100 records are shown.

### Changed

- **Action buttons now visually distinct from plain text links (UI-017)**
  - Table row action buttons (Review, Edit, Delete, Revoke, and similar) across all pages now use the Mantine `light` variant, giving them a clear button appearance. Previously they used the `subtle` variant which made them look like plain text links. Modal cancel and secondary text actions that are intentionally low-weight are unchanged.

- **Rounded corners on left nav hover and active states (UI-015)**
  - The left-hand navigation highlight now uses rounded corners consistent with the rest of the app's design language.

- **Ellipsis appended to API key prefixes in the audit log (UI-016)**
  - API key prefixes in the audit log (both the Object column and the event description) now show a trailing ellipsis (e.g. `cr_live_27e6515b…`) to make clear the value is a truncated prefix, not the full key.

## [1.13.0] - 2026-06-19

### Added

- **Search and filter bar on /my-risks (UI-005)**
  - The /my-risks page now has a filter bar with title/description text search, state, risk level, and register dropdowns. Filters work across risks from different registers. Filter state is stored in URL params — refreshing the page or sharing the URL restores the active filters. A Reset button clears all active filters.

- **Export CSV on /my-risks (UI-006)**
  - An Export CSV button has been added to the /my-risks page, consistent in style and position with the register page export. The export reflects the current filter state — if filters are active, only the filtered risks are exported; if no filters are active, all risks owned by the user across all registers are exported.

### Fixed

- **Filter controls on /my-risks not updating results (UI-005)**
  - Typing in the search box or selecting from the state, risk level, or register dropdowns had no effect. The filter state was being written to the URL correctly, but a React `useMemo` dependency on the `URLSearchParams` object reference (rather than the primitive values within it) prevented the query from refetching. Fixed by extracting individual filter values as `useMemo` dependencies.

### Changed

- **Date picker for API key expiry (UI-012)**
  - The expiry date field in the Create API Key modal now uses a native date picker instead of a plain text input, preventing invalid date entry.

## [1.12.0] - 2026-06-19

### Added

- **Inline modals on /my-risks (UI-004)**
  - Clicking a risk ID or Edit on the /my-risks page now opens the view or edit modal directly on that page, without navigating away to the register. After dismissing or submitting, the user stays on /my-risks and the table refreshes.

- **Inline Review action on "My overdue risks" homepage widget (UI-008)**
  - Each row in the My overdue risks widget now has a Review button. Clicking it opens the review modal in-place on the homepage — no navigation required. The widget data refreshes automatically after submission.

- **Admin summary widget counts link to pre-filtered register (UI-007)**
  - The open risks and overdue reviews counts in the Admin summary homepage widget are now clickable links. Each links to the relevant register page with the correct filter pre-applied, so admins can drill straight into the filtered list.

### Changed

- **Risk modal sticky headers now show risk ID and title (UI-002)**
  - The risk view modal header now shows the risk ID and title instead of the generic "Risk Detail" label. The edit modal header shows the risk ID and the live title field value, updating as the user types.

## [1.11.0] - 2026-06-19

### Fixed

- **Save View completely broken on register page (BUG-003)**
  - Saving a view was failing on every attempt because the frontend was sending `columns` as an object instead of an array. The API rejected the payload with a validation error, making the Save View feature entirely unusable. The serialisation is now correct — `columns` is always sent as an array, and the API types have been tightened to `string[]` to prevent the same mistake recurring.

- **Calculated fields unreadable in dark mode (BUG-004)**
  - Calculated field inputs in the add and edit risk modals used a hardcoded light-grey background that stayed light regardless of colour scheme, making the text invisible in dark mode. Replaced with a Mantine CSS variable that adapts correctly to both light and dark themes.

- **Review button shown for risks that don't require review (BUG-005)**
  - The /my-risks table was showing a Review button for every risk, even when the parent register has reviews disabled. Risks with a review status of "not required" no longer show the button. Risks with an active review requirement are unaffected.

- **Views dropdown styled differently from adjacent toolbar controls (BUG-006)**
  - The Views dropdown on the register page used a different button variant and size from the Columns dropdown and Export CSV button next to it. All three toolbar controls now use a consistent `light` variant.

- **Export CSV on /audit wrongly styled and mispositioned (BUG-007)**
  - The Export CSV button on the audit page used the wrong button variant and appeared below the page title rather than inline with it. The button now matches the register page pattern — `light` variant, sitting in the same row as the page title.

- **Rogue icon in /help page header (BUG-008)**
  - The /help page was the only page rendering a theme icon before its heading text. The icon has been removed so the header matches every other page in the app.

- **Redundant "Show closed" checkbox on register page (UI-003)**
  - The register page filter bar had both a State dropdown (which already includes Closed as an option) and a separate "Show closed" checkbox. The checkbox was redundant and has been removed. Closed risks remain accessible via the State dropdown.

- **Version-controlled alert positioned below action buttons on config page (UI-009)**
  - The "Configuration is version-controlled" alert on the register configuration page appeared after the action buttons, making it easy to miss. It now appears above the buttons, where it provides context before the user acts.

- **Permissions page not using Mantine Fieldset (UI-010)**
  - The register permissions page was the only settings sub-page not using Mantine Fieldset for content grouping. The add-permission form and the current permissions table are now each wrapped in a Fieldset, consistent with the configuration settings page pattern.

## [1.10.0] - 2026-06-18

### Fixed

- **SavedViewsPanel crash on /registers (BUG-002)**
  - The saved views panel was calling `.map()` on the API response before confirming it was an array. When the API returned an envelope object (as all list endpoints do), this threw an unhandled React error and made /registers completely unusable. The API client now reads the correct `data` property from the envelope, with an `Array.isArray` guard as a safety net.

- **Profile page card styling inconsistency (UI-001)**
  - The /profile page was the only page using a Mantine Card component, which rendered a grey background out of step with the rest of the app. Replaced with a plain Stack layout matching every other page.

- **API keys table horizontal scrollbar on /profile (UI-001)**
  - The API keys table was overflowing its container and showing a horizontal scrollbar at standard desktop width. Widened the page layout constraint so the table fits comfortably.

### Added

- **Password strength meter on /profile (QOL-001)**
  - The new password field on the change-password form now shows a live strength indicator as you type — scoring weak, fair, or strong based on length, uppercase, digits, and special characters. The meter is advisory only; the form submits at any strength.

## [1.9.1] - 2026-06-18

### Fixed

- **Audit filter bar layout (BUG-001)**
  - All seven search facets (Search, Actor, IP Address, From date, To date, Action, Object type) now sit on a single row at normal desktop width (1728 px). The Object type filter was previously wrapping onto a second row on its own.

## [1.9.0] - 2026-06-17

### Added

- **Audit log CSV export (PM10-10)**
  - System Admins and Register Admins can now download a register's audit log as a CSV file. The export reflects the same filters and date range applied in the audit log view.

- **API key management (PM13-01/02)**
  - System Admins can create, list, and revoke API keys from the admin panel. Keys are user-scoped: each key is owned by a specific user and inherits that user's permissions. Keys are shown once at creation and stored as hashed values.

- **Saved views (PM11-01/02)**
  - Users can save their current filter, sort, and column visibility state as a named personal view on any risk register. Saved views are listed in the risk register toolbar and can be applied in one click to restore the exact configuration. Views are personal and not shared across accounts.

- **Email-only owner access (PM2-05)**
  - Users assigned as a risk owner via email address (rather than as a registered account) now receive correct owner-level access to those risks. Previously, email-only owners were not granted the permissions their ownership implied.

### Changed

- **Password change: active session preserved (PM1-01)**
  - After a user changes their password, their current session remains valid so they stay logged in. All other active sessions for that account are revoked, ensuring security without disrupting the user who made the change.

- **Preference updates propagate across the UI immediately (PM1-05)**
  - Changes such as theme toggles now apply everywhere in the app without requiring a page reload.

- **CI pipeline now runs on release branches**
  - The CI workflow previously only triggered on pull requests and pushes to main, leaving release branches without automated checks. It now runs on all `release/*` branches so issues are caught earlier in the release process.

## [1.8.0] - 2026-06-14

### Added

- **Email-only risk owners (PM2-01, PM2-02)**
  - Risk owners can now be specified as a plain email address when the person is not a registered user in the system. The owner field accepts either a registered user (selected from a dropdown) or a free-typed email address. If a registered user who owns risks is later removed, their ownership is preserved as an email address rather than lost.

### Fixed

- **User preference updates: nested keys no longer overwrite siblings (PM1-03)**
  - Saving a preference that lives under a shared parent key (e.g. `notifications.email`) previously erased sibling keys under the same parent. Preferences are now deep-merged so only the targeted key changes.

## [1.7.1] - 2026-06-14

### Added

- **Help page**
  - A new Help section is accessible from the left-hand navigation, available to all users.
  - Content is organised into seven tabs: Getting Started, Risk Concepts, Registers, Managing Risks, Users & Permissions, Templates, and Audit & Reporting.
  - Getting Started covers navigation, the home dashboard, and the user profile.
  - Risk Concepts introduces likelihood and impact scoring, inherent and residual risk, risk response strategies, the risk review lifecycle, governance and compliance context, and how to build a healthy risk culture.
  - Registers covers creating and managing registers, register configuration (scoring, fields, settings), the draft/publish workflow, and register templates.
  - Managing Risks covers creating and editing risks, custom fields (including multi-select and calculated types), field validation modes, risk ownership, and the My Risks view.
  - Users & Permissions covers user roles (System Admin, Register Admin, Editor, Viewer), register-level permissions, and user account management.
  - Templates covers creating reusable register templates, applying a template to a new register, and keeping registers in sync with template updates.
  - Audit & Reporting covers the system and register audit logs, available filters, CSV export, and what each audit event type represents.

## [1.7.0] - 2026-06-10

### Added

- **Register: soft delete**
  - System administrators can now delete a register from the Settings tab (Danger zone section). Deleting a register hides it from all users but retains all data (risks, configuration, audit history) in the database for recovery. Deletion requires typing the register name to confirm, and is recorded as a `REGISTER_DELETED` audit event.

### Changed

- **Risk register: state badges are now color-coded**
  - Draft, Open, and Closed state badges in the risk list now use distinct colors (gray, blue, and dark respectively) for faster visual scanning.

- **Register configuration: risk matrix always recalculates on save and publish**
  - The "Recalculate existing risks" checkbox has been removed from the risk matrix tab. Saving the matrix (non-draft mode) or publishing a draft that includes matrix changes now always recalculates risk levels for all open risks. Publishing a draft also invalidates the risk list so updated risk levels appear immediately without a page refresh. A blue informational note is shown on the matrix tab when a draft is in progress to make this behaviour explicit.

- **Register configuration: settings auto-save in draft mode**
  - The "Save settings" button is no longer shown when a draft is in progress. Settings are saved automatically when focus leaves the settings form, keeping the UI consistent with the rest of the draft workflow.

- **Register configuration: settings page restructured into logical groups**
  - Settings are now grouped into four labelled sections — General, Risk IDs, Features, and Reviews — using fieldset frames consistent with the rest of the configuration UI. The register name is no longer editable outside of a draft; all settings now follow the same draft-gated rules. Dependent inputs (padding width, review frequency) are disabled when their parent toggle is off.

- **Register configuration: consistent fieldset framing across all tabs**
  - The Fields and Scoring tabs now present their content inside labelled fieldset frames matching the style introduced on the Settings tab. The version-controlled alert is shown above the tab strip (it applies to all tabs) and the greyed-out locked state now correctly applies only to tab content — the Scoring sub-tab strip remains fully interactive.

- **Register configuration: action buttons moved below tables**
  - Add and save actions (Add field, Add likelihood value, Add risk level, Save matrix, etc.) now sit below their respective tables rather than floating above them, removing the whitespace gap that appeared between the fieldset border and the table.

- **Register configuration: tables now have an outer border**
  - All configuration tables (fields, likelihood, impact, risk levels, matrix) render with a surrounding border, visually separating them from the fieldset background.

### Fixed

- **Custom field options modal: improved table sizing and action layout**
  - The options modal opened from field configuration is now wider, no longer shows an unnecessary horizontal scrollbar for the options table, and keeps the row action buttons inline unless an unusually long label leaves no remaining space.

- **Custom field options modal: option state changes update immediately**
  - Activating or deactivating an option now refreshes the options table state immediately while the modal remains open, so the status badge and available action button stay in sync without closing and reopening the dialog.

- **Custom field options modal: edit form no longer resets while typing**
  - Editing an existing option now keeps the label and other form values stable while you type, fixing a regression where the edit form immediately reset itself on every keystroke and made the field appear non-editable.

- **Custom field options modal: consistent close actions in the main dialog**
  - The main options modal now includes both `Cancel` and `Save` actions that close the dialog, matching the close affordances used in the nested add/edit option flow and making the interaction model more predictable.

- **Risk edit form: required custom fields now show the expected required marker**
  - When custom field validation is enabled, the required marker is driven by validation mode: fields set to `BLOCK` show the red asterisk; all others do not. When validation is disabled the marker falls back to the field's `isRequired` flag.

### Added

- **Registers: guided creation wizard**
  - Creating a new register now opens a step-by-step wizard rather than a minimal single-screen form. Steps cover naming and admins, risk ID format, feature toggles (with an additional reviews step when reviews are enabled), likelihood scale, impact scale, risk levels, risk matrix, and an optional custom fields step. Each step includes explanatory help text. The wizard creates the register on step one, then saves each configuration section in turn, so the user arrives at the configuration already populated and ready to use. The matrix step auto-saves on cell change and omits the recalculate option (no existing risks at creation time).

- **Registers: simplified default scoring scale**
  - New registers are seeded with a simpler Low / Medium / High likelihood scale, Low / Medium / High impact scale, and Low / Medium / High risk level set with a symmetric 3×3 default matrix (Low+High combinations in either direction map to Medium). Previously the defaults were five-level scales with more formal terminology. Existing registers are unaffected.

- **Custom field options modal: inactive options can now be reactivated**
  - Inactive dropdown and multi-select options now show an `Activate` action in the options modal, allowing administrators to restore an option directly from the table.

- **Custom field options modal: add and edit now use a dedicated stacked editor dialog**
  - The main options modal now focuses on the options table and actions, while `Add option` and `Edit` open a separate stacked modal for editing option details. Saving from that editor returns the user to the main options list with the table state refreshed.

- **Custom fields: configurable validation modes (allow / warn / block)**
  - Each custom field can now be set to one of three validation modes. `BLOCK` prevents saving until the field is filled; `WARN` lets the user proceed after explicitly acknowledging the warning; `ALLOW` imposes no constraint. This behavior applies only when custom field validation is enabled in that register's settings. Existing required fields are migrated to `BLOCK`; all others default to `ALLOW`. Acknowledged warnings are recorded in the audit trail.
  - When custom field validation is enabled for a register, the `isRequired` toggle is hidden in the field configuration modal and superseded by the validation mode. `BLOCK` is the equivalent of required; the field's `isRequired` value is derived automatically from the chosen mode on save. When validation is disabled, `isRequired` is shown and used as before.

- **Risk register: per-risk validation status and register-level validation summary**
  - When custom field validation is enabled in that register's settings, each risk in the list carries a `validationStatus` (`BLOCK`, `WARN`, or `OK`) computed from its custom field values against the register's active field definitions. A coloured dot is shown next to the Risk ID in the table for any risk with missing required or recommended fields. A summary banner above the table shows how many open risks have `BLOCK` or `WARN` issues, with a one-click filter to show only those risks.

- **Custom fields: multi-select field type**
  - A new `MULTI_SELECT` field type allows risks to hold multiple pre-defined values for a single field. Selections are stored in a dedicated junction table (`risk_custom_field_multi_select_value`) rather than the scalar custom field value row, enabling clean many-to-many semantics. Multi-select fields support options management, validation modes, and appear in both the risk form and risk table columns. The Options button in the field configuration table now appears for multi-select fields as well as dropdowns.

- **Custom fields: calculated field type data model**
  - A new `CALCULATED` field type establishes the schema and lifecycle rules for computed custom fields. Calculated fields store a formula expression and a dependency list (field UUIDs referenced by the formula). They cannot be edited directly by users, cannot be marked required, and always carry `ALLOW` validation mode. The formula syntax supports `{field:uuid}` references with basic arithmetic operators. Evaluation is handled in the separate evaluation service (PM5-05).

- **Custom fields: calculated field evaluation**
  - Calculated fields are now evaluated automatically on every risk create and update. The formula engine supports field references (`{field:uuid}`), built-in risk properties (`{score}`, `{likelihood}`, `{impact}`), basic arithmetic with correct operator precedence, and math functions (`round`, `ceil`, `floor`, `abs`, `min`, `max`). Computed values are stored in the standard custom field value table as text. Invalid formulas are rejected at field-creation/update time so broken formulas never reach risks.

- **Custom fields: field-level visibility by role**
  - Each custom field definition now carries a `visibleToRoles` list. When the list is non-empty, only users whose effective register role appears in that list will see the field in the risk form, risk detail, and risk table. An empty list means the field is visible to everyone. System Admins and Register Admins always see all fields regardless of the setting. Field admins configure visibility through a new multi-select control in the custom field modal.

- **Custom fields: advanced field configuration UI**
  - The field configuration table now shows a Delete action for System Admins. Before deletion is confirmed, the UI fetches the current usage count for the field; if data exists, the confirmation dialog warns that all values will be permanently removed and requires an explicit "Force delete" acknowledgement. The custom field modal now includes the "Visible to roles" multi-select and the "Visible to Risk Response Owners" toggle introduced in PM5-06 and PM5-07.

- **Custom fields: advanced field lifecycle controls**
  - Custom fields can now be permanently deleted by System Admins. A GET usage endpoint returns the count of scalar and multi-select values that exist for a field before any destructive action is taken. Deleting a field with existing risk data requires an explicit `force=true` query parameter; without it the request is rejected with a 409 and a count of affected values. Forced deletion removes all associated scalar values, multi-select junction rows, and options atomically, and records an audit event. Deactivation behavior is unchanged.

- **Custom fields: field type migration framework**
  - Administrators can now migrate a custom field to a compatible type without data loss. A GET preview endpoint returns the number of risks and values that will be affected before any change is made. The POST migrate endpoint converts values atomically: dropdown selections become multi-select junction rows; number, boolean, and date values are coerced to their text representation. Unsafe conversions (e.g. MULTI_SELECT → DROPDOWN, CALCULATED ↔ anything, PERSON_PICKER) are rejected. Each migration writes an audit event recording the from/to type change.

- **Custom fields: Risk Response Owner visibility flag**
  - Each custom field definition now carries a `visibleToRiskResponseOwners` boolean (default `true`). When set to `false`, the field will be suppressed from the limited parent-risk context that Risk Response Owners see when acting on a linked action. The flag defaults to `true` so existing fields remain fully visible. Enforcement will activate when the Risk Response Owner permission model (Phase 7) is implemented.

### Fixed

- **Risk ownership: person-picker owners can now view and edit their own risks**
  - Users assigned as Risk Owner through the person-picker field were not recognised for ownership-based access checks. They could not view or edit risks they owned unless they also held a broader register role. Ownership is now checked through both assignment paths consistently.

- **Password change: current session is preserved**
  - Changing your password previously signed you out of the session in which you made the change, forcing an immediate re-login. The current session is now kept active; all other sessions are still signed out.

- **User preferences: nested preference groups are merged, not replaced**
  - Saving a preference within a nested group (such as column visibility for one register) previously overwrote the entire group, losing settings for other registers or contexts. Each update now merges into the existing group rather than replacing it.

- **Deployment: database migrations now run correctly on container start**
  - The `prisma migrate deploy` step in the container entrypoint was failing with "datasource.url property is required" because the Prisma config file (`prisma.config.ts`) was not included in the runtime image. Prisma 7 reads the datasource URL from this config file rather than from the schema, so the file is now copied into the image and referenced explicitly at deploy time.

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
[Unreleased]: https://github.com/martynjsimpson/customRisk/compare/v1.7.1...HEAD
[1.7.1]: https://github.com/martynjsimpson/customRisk/compare/v1.7.0...v1.7.1
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
