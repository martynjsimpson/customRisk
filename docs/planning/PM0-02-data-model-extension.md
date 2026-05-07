# Post-MVP Data Model Extension Plan

**Ticket:** PM0-02  
**Version:** 1.0  
**Date:** 2026-05-07  
**Status:** Approved  
**Related documents:** `docs/product/mvp-data-model.md`, `docs/planning/post-mvp-backlog.md`, `docs/planning/PM0-01-scope-baseline.md`

---

## 1. Purpose

This document defines how the MVP Prisma schema will be extended safely for each post-MVP phase. It records extension principles, migration sequencing rules, rollback considerations, backfill approach, and test data strategy.

The authoritative MVP schema is at `backend/prisma/schema.prisma`. This document does not replace that schema; it supplements it with forward-looking extension guidance.

---

## 2. MVP Schema Baseline Summary

The shipped MVP schema contains these tables:

| Table | Purpose |
|---|---|
| `user` | Local user accounts, system admin flag, lockout state |
| `refresh_token` | JWT refresh token rotation and reuse detection |
| `api_key` | API key storage (hash + prefix only) |
| `register` | Configurable risk register |
| `register_permission` | Register Admin and Register Viewer assignments |
| `risk` | Core risk record with scoring, owner, and review fields |
| `risk_review` | Immutable review history entries |
| `likelihood_value` | Configurable likelihood values per register |
| `impact_value` | Configurable impact values per register |
| `risk_level` | Qualitative risk levels per register |
| `risk_matrix_cell` | Likelihood/impact-to-level matrix mappings |
| `response_strategy` | Response strategy values per register |
| `custom_field_definition` | Custom field definitions per register |
| `custom_field_option` | Dropdown options for `DROPDOWN` custom fields |
| `risk_custom_field_value` | EAV-style custom field values per risk |
| `audit_event` | Append-only audit event record |
| `audit_field_change` | Structured field-level before/after changes |
| `audit_risk_snapshot` | Full last-known snapshot for hard-deleted risks |
| `export_job` | Optional export job metadata |

Key schema design choices that constrain post-MVP extensions:

- `risk.owner_user_id` is a non-nullable FK to `user.id`. To support email-only Risk Owner (Phase 2), this will need a nullable companion column or separate person reference handling.
- `risk_custom_field_value.person_email` is already present in the schema for future email-only person picker use; it is not populated by MVP logic.
- `custom_field_definition.field_type` is a Postgres enum (`CustomFieldType`). New field types require an enum value addition migration.
- `audit_event.object_type` is a Postgres enum (`AuditObjectType`). New object types require an enum value addition migration.
- `audit_event.scope_type` has values `SYSTEM`, `REGISTER`, `RISK`. A `RISK_RESPONSE` scope will be needed for Phase 7.

---

## 3. Schema Extension Principles

### 3.1 Additive-first

Every post-MVP migration must be additive as far as possible: add new tables, new nullable columns, new columns with defaults, or new enum values. Avoid renaming columns, changing column types, or making optional columns required in a single step.

### 3.2 Enum additions are one-way

PostgreSQL enum values can be added but not removed without dropping the type. Do not add `CustomFieldType` or `AuditObjectType` enum values until the feature is ready to ship. A partially-added enum value in the schema that no production code uses is harmless; a half-shipped feature where the enum exists but validation is absent is not.

### 3.3 Separate migration from backfill

Structural migrations (DDL) and data backfills (DML) must run separately. A single migration that both alters a table and updates millions of rows creates long-held locks and a difficult rollback path. Pattern: migration adds column as nullable → separate backfill script populates data → follow-up migration adds NOT NULL constraint if needed.

For the register sizes expected in early post-MVP deployments, the register-count is low and backfills can be small. Still follow the pattern to build good habits.

### 3.4 Never drop MVP columns during an extension migration

If a column becomes logically superseded by a new model (e.g. `risk.response_action` when child-record actions are introduced), leave it in place. Mark it as deprecated in schema comments. Remove it only in a dedicated cleanup migration after the old feature is fully migrated and verified.

### 3.5 Register-scoped configuration additions must handle all existing registers

Any new register-level setting column must have a safe default that represents the current MVP behaviour for existing registers. Existing registers must not exhibit changed behaviour after a migration runs.

### 3.6 Migrations must be reviewed before the feature is implemented

Per PM0-01 backlog governance: identify migration and backfill requirements before starting feature tickets. The migration approach for each phase should be agreed before the first schema file is written for that phase.

---

## 4. Phase-by-Phase Extension Notes

### Phase 1 — User Profile and Preferences (PM1-03)

**Table changes:**
- `user`: add `preferences` column (`JSONB`, nullable, default `null`).

**Rationale:** Simpler than a separate `user_preference` table. JSONB allows partial updates without changing the schema per new preference key. An allow-list is enforced by application logic, not schema.

**Migration type:** Add nullable JSONB column. Safe on any table size.

**Backfill:** None. Null is treated as an empty object by the preferences API.

**Rollback:** Drop the column. No data loss risk unless preferences have been written; at that point, dropping is a data-loss event and should not be done without user consent.

---

### Phase 2 — Person Identity Expansion (PM2-01 to PM2-04)

**Table changes:**
- `risk_custom_field_value.person_email`: already exists and is nullable. Post-MVP application logic may populate it for unresolved email person picker values.
- `risk`: add `owner_email` column (`String`, nullable) to support a future email-only Risk Owner before a user account exists. `owner_user_id` remains required for MVP-created risks; post-MVP the service layer decides which field is active based on whether the email is resolved.

**Optionally, a `person_reference` table may be introduced** if normalised linking is preferred over per-column email fields. Decision to be made during PM2-01. If introduced, it should backfill from all existing `risk.owner_user_id` and `risk_custom_field_value.person_user_id` values to create normalised person reference rows. Existing FK columns remain valid; person references are supplementary.

**Migration type:** Additive nullable columns. Safe.

**Backfill for `owner_email`:** When column is added, a backfill should set `owner_email = user.email` for all existing risks so the denormalised value is consistent. This makes display and search consistent regardless of whether `owner_user_id` resolves.

**Rollback:** Drop the nullable column. If a `person_reference` table is added, drop it and its FKs. Existing MVP data is unaffected.

---

### Phase 3 — Enterprise Authentication (PM3-01 to PM3-08)

**New tables:**
- `identity_provider` — SAML provider configuration (encrypted secrets, metadata URL, claim mappings, enabled flag).
- `user_external_identity` — links a `user.id` to an external provider identity (provider ID, external sub/email, linked-at timestamp).
- `mfa_enrollment` — TOTP secret (encrypted), recovery codes (hashed), enrolment state.
- `password_reset_token` — hashed token, expiry, single-use flag, user FK.

**Table changes:**
- `user`: add `mfa_enabled` boolean (default `false`).
- `audit_event.object_type` enum: add `IDENTITY_PROVIDER`, `MFA_ENROLLMENT`, `PASSWORD_RESET_TOKEN`.

**Migration type:** All new tables; one nullable boolean column on `user`.

**Backfill:** None. All new tables start empty. `mfa_enabled` defaults to `false` for all existing users.

**Rollback:** Drop the new tables and the `user.mfa_enabled` column. No existing MVP data affected.

**Security notes:** `identity_provider` secrets and SAML certificates must be stored encrypted. The schema should store the encrypted blob and a key reference; the application is responsible for encryption/decryption. Do not store secrets in plaintext columns.

---

### Phase 4 — Configuration Lifecycle and Templates (PM4-01 to PM4-11)

This is the most structurally significant post-MVP phase. It adds versioning on top of the MVP register configuration model.

**New tables:**
- `register_config_version` — version number, status (`DRAFT`, `PUBLISHED`), register FK, actor, published-at timestamp.
- Configuration versioning approach: two options.

**Option A — Version pointer on existing tables (recommended for simplicity):**  
Add a `config_version_id` FK to `register_config_version` on each configuration table (`custom_field_definition`, `likelihood_value`, `impact_value`, `risk_level`, `risk_matrix_cell`, `response_strategy`). A published version has config rows with its version ID. A draft clones or modifies rows with the draft version ID.

**Option B — Separate versioned snapshots:**  
Store configuration as a JSON snapshot per version. Simpler to snapshot; harder to query individual field values for validation.

**Decision to be made during PM4-01.** Either option must satisfy: existing MVP configuration rows are tagged as version 1 (published) for every register, and the live risk form always reads from the current published version.

**New tables for templates (PM4-08 to PM4-11):**
- `register_template` — template name, description, owner (System Admin), created/updated metadata.
- `register_template_version` — version number, status, snapshot or config version reference.

**Migration type:** New tables; potentially new FKs on existing configuration tables (Option A).

**Critical backfill — Phase 4 has the only mandatory backfill:**  
When Phase 4 migrations run, a backfill must create an initial `register_config_version` record for every existing register, mark it as `PUBLISHED`, and (if Option A) tag all existing configuration rows with that version ID. This backfill must run and be verified before the draft/publish application logic is deployed. The existing MVP configuration tables must not be truncated or modified structurally before this backfill completes.

**Rollback:** Phase 4 rollback is complex if the versioning FK (Option A) has been applied to existing configuration rows. A rollback plan must be documented before Phase 4 migration is written. The general approach: keep the version-ID columns nullable so that MVP configuration rows with `config_version_id = null` remain readable by the pre-Phase-4 code path during a rollback window.

---

### Phase 5 — Advanced Field Model (PM5-01 to PM5-10)

**Table changes:**
- `custom_field_definition`: add `validation_mode` enum column (`ALLOW`, `WARN`, `BLOCK`, default `BLOCK` for `is_required=true`, `ALLOW` otherwise — to be decided at PM5-01), `visibility_config` JSONB column (nullable, default null), `expression` text column (nullable, for calculated fields only), `dependency_metadata` JSONB (nullable).
- `CustomFieldType` enum: add `MULTI_SELECT`, `CALCULATED`.
- `AuditObjectType` enum: no new values required for Phase 5 specifically.

**New tables:**
- `risk_custom_field_multi_value` — junction table for multi-select field values: `risk_id`, `custom_field_definition_id`, `custom_field_option_id`, `register_id`. This is separate from `risk_custom_field_value` to avoid making the EAV model more complex.

**Migration type:** New nullable columns on `custom_field_definition`; new enum values; new junction table.

**Backfill:**
- `validation_mode`: existing fields should be backfilled to `BLOCK` where `is_required=true` and `ALLOW` where `is_required=false`. This preserves current MVP behaviour exactly.
- All other new columns default to null.

**Rollback:** Remove `multi_select` and `calculated` enum values is not possible in PostgreSQL without data migration. Do not add these enum values until the Phase 5 feature is ready. Drop the nullable columns and junction table; existing fields are unaffected.

---

### Phase 6 — Advanced Scoring and Risk Methodologies (PM6-01 to PM6-10)

**Table changes:**
- `register`: add `score_formula` text (nullable; null = default `likelihood * impact`), `inherent_residual_enabled` boolean (default `false`).
- `risk`: add six nullable scoring columns for inherent/residual mode: `inherent_likelihood_value_id` (UUID FK nullable), `inherent_impact_value_id` (UUID FK nullable), `inherent_risk_score` (Decimal nullable), `inherent_risk_level_id` (UUID FK nullable), `residual_likelihood_value_id`, `residual_impact_value_id`, `residual_risk_score`, `residual_risk_level_id` (all nullable).

**New tables:**
- `risk_state_config` — configurable state names and transition rules per register (Phase 6, PM6-09). Existing `RiskState` enum remains valid; the state config table defines display names and transition rules layered on top.
- `risk_id_format_token` — token definitions for complex Risk ID formats (Phase 6, PM6-08). `register.risk_id_prefix` and `risk_id_zero_padding_*` fields remain; the new table provides an alternative when complex formats are configured.

**Migration type:** New nullable columns on `register` and `risk`; new tables.

**Backfill:** None. Existing registers have `inherent_residual_enabled = false` (default) and `score_formula = null` (= default formula). Existing risks have null inherent/residual columns, which signals standard scoring mode.

**Rollback:** Drop nullable columns and new tables. No existing risk data is affected because columns default to null.

---

### Phase 7 — Child-Record Risk Response Actions (PM7-01 to PM7-12)

**New tables:**
- `risk_response_action` — action record scoped to a register.
- `risk_response_action_link` — many-to-many junction between `risk_response_action` and `risk`.
- `response_action_status_config` — configurable status values per register.
- `response_action_field_config` — configurable fields for child actions.

**Table changes:**
- `register`: add `response_action_mode` enum column (`SIMPLE`, `CHILD`, default `SIMPLE`). Existing registers stay on `SIMPLE` mode.
- `risk.response_action` text column: **retained** as the simple-mode value. Do not remove or rename this column at Phase 7. It remains the source of truth for registers in `SIMPLE` mode.
- `audit_event.scope_type` enum: add `RISK_RESPONSE` value.
- `AuditObjectType` enum: add `RISK_RESPONSE_ACTION`.

**Migration type:** New tables; new nullable/defaulted columns on `register`.

**Backfill:** None. Existing registers default to `SIMPLE` mode. `risk.response_action` text is unaffected.

**Rollback:** Drop new tables. Remove `response_action_mode` column (safe if no registers have been switched to `CHILD` mode). If registers have already been switched, rollback requires re-switching them back and deciding whether to retain orphaned child action rows.

---

### Phase 8 — Risk Response Reviews and Advanced Review Rules (PM8-01 to PM8-08)

**New tables:**
- `review_rule` — field-based frequency rule per register.
- `review_attestation_version` — versioned attestation text per register.
- `risk_response_action_review` — review history for child actions.

**Table changes:**
- `register`: add `review_comment_mode` enum (`DISABLED`, `OPTIONAL`, `MANDATORY`, default `OPTIONAL`) — `OPTIONAL` is current MVP behaviour.
- `risk_review`: add `outcome` text (nullable), `attestation_version_id` FK (nullable, to `review_attestation_version`).

**Migration type:** New tables; new nullable/defaulted columns.

**Backfill:** `review_comment_mode` defaults to `OPTIONAL` for all existing registers. `risk_review.attestation_version_id` will be null for all MVP review records, meaning the snapshot-text approach (existing `attestation_text` column) is preserved as the fallback.

**Rollback:** Drop new tables and new columns. MVP review history is unaffected.

---

### Phase 9 — Notifications and SMTP (PM9-01 to PM9-09)

**New tables:**
- `notification` — in-app notification record per user.
- `notification_rule` — configurable rule per register.
- `notification_delivery_attempt` — delivery log for email channel.
- `smtp_config` — system-wide SMTP settings. **Credentials must be stored encrypted.** The schema stores only an encrypted blob; the encryption key reference is outside the schema. Do not store SMTP passwords in plaintext columns.

**Migration type:** All new tables. No changes to existing tables.

**Backfill:** None. Registers start with no notification rules.

**Rollback:** Drop new tables. Completely safe.

---

### Phase 10 — Import, Export, Data Portability (PM10-01 to PM10-10)

**New tables:**
- `import_job` — job state machine record.
- `import_file_meta` — uploaded file metadata (not the file content itself).
- `import_column_mapping` — stored column mappings for a job.
- `import_validation_result` — per-row validation results.

**Table changes:** None to existing MVP tables.

**Migration type:** All new tables.

**Backfill:** None.

**Rollback:** Drop new tables.

---

### Phase 11 — Reporting, Saved Views, Dashboards (PM11-01 to PM11-08)

**New tables:**
- `saved_view` — serialised filter/sort/column configuration with owner and scope.

**Migration type:** New table.

**Backfill:** None.

**Rollback:** Drop the table.

---

### Phase 12 — Attachments and Evidence (PM12-01 to PM12-06)

**New tables:**
- `attachment` — file metadata, type, size, storage reference.
- `attachment_link` — polymorphic link to `risk`, `risk_response_action`, or `risk_review` (or separate typed tables to avoid polymorphism).

**Migration type:** New tables. The storage backend decision (filesystem, object storage) does not affect the schema for metadata.

**Backfill:** None.

**Rollback:** Drop tables. Orphaned files on disk/object storage need a separate cleanup job.

---

### Phase 13 — APIs, Webhooks, Integration Admin (PM13-01 to PM13-07)

**Note:** `api_key` is already present in the MVP schema and supports the PM13 use case.

**New tables:**
- `webhook_subscription` — outbound webhook subscription. Secrets stored as hashed values only.
- `webhook_delivery_attempt` — per-delivery log.

**Table changes:**
- `api_key`: review whether additional `scope` column is needed (PM13-01 design decision). If added: nullable text or JSONB column, default null = inherit user permissions.

**Migration type:** New tables; optionally one nullable column on `api_key`.

**Backfill:** Existing API keys default to null scope (= inherit user permissions).

**Rollback:** Drop tables; drop nullable `api_key.scope` column if added.

---

### Phase 14 — Operational Hardening (PM14-01 to PM14-09)

**No new application tables expected.** Phase 14 work involves:
- New composite indexes on high-traffic query paths identified through production profiling.
- Possible Redis-backed caching (no schema changes).
- Background job locking mechanism (may require a `job_lock` or `scheduled_job` table).

**Migration type:** Index additions and optional job-lock table. Safe.

---

## 5. Migration Sequencing Principles

1. **Phase 0 migrations run first.** Feature flag infrastructure (PM0-05) should be in place before any feature code from Phases 1–14 is deployed.

2. **Phases 1 and 2 are independently safe.** They touch only `user` and `risk_custom_field_value` with nullable additions.

3. **Phase 4 must be sequenced carefully.** The config versioning backfill must complete and be verified before Phase 4 application code goes live. Run the Phase 4 migration in a maintenance window or behind a feature flag.

4. **Phase 5 enum additions are irreversible.** Add `MULTI_SELECT` and `CALCULATED` to `CustomFieldType` only when the feature is ready. Do not add them speculatively.

5. **Phase 6 inherent/residual columns depend on Phase 5 formula engine.** The formula columns on `custom_field_definition` should exist before inherent/residual scoring is wired up, because they share the expression evaluation model.

6. **Phase 7 requires Phase 0 audit scope extension.** The `RISK_RESPONSE` `AuditScopeType` enum value must be added before any risk response action audit events are written.

7. **Never apply two phases of schema changes in a single Prisma migration file.** Each phase's schema changes must be in its own migration directory and reviewed independently.

8. **Migration files must be committed to the repository** before any related application code is deployed. Never deploy application code that depends on a schema change before the migration has been applied.

---

## 6. Downgrade and Rollback Considerations

| Phase | Rollback risk | Rollback approach |
|---|---|---|
| 1 — Preferences | Low. Column is nullable JSONB. | Drop `user.preferences` column. No data loss if preferences have not been written. |
| 2 — Person identity | Low. Nullable column additions. | Drop `owner_email` and any `person_reference` table. |
| 3 — Auth | Low–medium. New tables only. | Drop new tables. No effect on existing local auth. |
| 4 — Config versioning | **High.** Backfill modifies all register configuration rows. | Keep `config_version_id` nullable so MVP code path can run without version IDs. Rollback plan must be documented before migration is written. |
| 5 — Advanced fields | Medium. Enum value additions are irreversible. | New columns are droppable. Cannot un-add `MULTI_SELECT`/`CALCULATED` enum values without a type migration. Gate enum additions with feature flag. |
| 6 — Advanced scoring | Low. All nullable columns. | Drop columns. Existing standard-mode risks are unaffected. |
| 7 — Child actions | Low. New tables, defaulted column on `register`. | Drop tables, drop `response_action_mode` column (safe if no registers have been switched). |
| 8–14 | Low. All additive, new tables or nullable columns. | Drop tables and new nullable columns. |

**General rule:** If rollback requires data loss, it requires explicit admin confirmation and a documented data export or archive before proceeding. Do not build rollback scripts that silently discard data.

---

## 7. Backfill Approach for Existing MVP Records

| Phase | Backfill required | Description |
|---|---|---|
| 1 | No | `preferences` defaults to null. |
| 2 | Optional | If `owner_email` is added: set to `user.email` for all existing risks via a data migration script. |
| 3 | No | New auth tables start empty. `mfa_enabled` defaults to false. |
| **4** | **Yes — critical** | Create a `register_config_version` (status=PUBLISHED, version=1) for every existing register. Tag all existing configuration rows with that version ID (Option A). This is the only mandatory backfill in the post-MVP plan. |
| 5 | Partial | `validation_mode`: backfill to `BLOCK` where `is_required=true`, `ALLOW` otherwise. All other columns default to null. |
| 6 | No | All new columns default to null or false. Existing registers stay in standard mode. |
| 7 | No | `response_action_mode` defaults to `SIMPLE`. Existing `risk.response_action` text is preserved. |
| 8 | No | `review_comment_mode` defaults to `OPTIONAL` (current behaviour). |
| 9–14 | No | All new tables start empty. |

### Backfill script guidelines

- Backfill scripts live in `scripts/` alongside existing migration helpers, not inside Prisma migration files.
- Each backfill script must be idempotent: safe to re-run without creating duplicates.
- Backfill scripts should log the number of rows processed and any skipped rows.
- Backfill scripts must not run in the same database transaction as a structural DDL migration.
- Each backfill script should have a corresponding test that verifies the output state on a seeded test database.

---

## 8. Test Data Strategy for Migrated Registers

### 8.1 Seed script preservation

The existing `scripts/seed.ts` creates two demo registers (Operational Risks and IT Security Risks) with full MVP configuration and sample risks. All post-MVP migrations must leave the seed data intact and usable.

Test requirement: after each post-MVP migration and backfill, run `npm run db:setup` against a clean database and verify the seed completes without errors. Include this check in CI for all schema-changing PRs.

### 8.2 Phase-specific seed extensions

| Phase | Seed extension needed |
|---|---|
| 1 | Seed a demo user with stored preferences (colour scheme). |
| 2 | Seed a sample unresolved person email value in one person picker field. |
| 3 | No new seed required. SAML and MFA are admin-configured at runtime. |
| 4 | Seed must verify that both demo registers have a version 1 published config after the backfill. |
| 5 | Add one multi-select field and one calculated field to the IT Security demo register. |
| 6 | Add a second demo register with inherent/residual mode enabled. |
| 7 | Seed 3–5 sample Risk Response Actions linked to existing demo risks in child-action mode. |
| 8 | Seed one review rule per demo register. |
| 9 | Seed one notification rule (in-app only) per demo register. Do not seed SMTP credentials. |
| 10 | No seed changes; import is tested through the import wizard flow. |
| 11 | Seed one saved view per demo register. |
| 12 | No seed required for attachments (file storage is operator-configured). |
| 13 | Seed one inactive sample webhook subscription for documentation purposes. |
| 14 | No seed changes. |

### 8.3 Migration test coverage

For each post-MVP Prisma migration:

1. Write a migration test that: applies the migration to a test database populated with MVP seed data, verifies existing rows are preserved, and verifies new columns/tables are in the expected initial state.
2. For Phase 4 backfill specifically: test that every seeded register has a published version 1 after the backfill runs.
3. For Phase 5 `validation_mode` backfill: test that all `is_required=true` fields have `BLOCK` and all `is_required=false` fields have `ALLOW` after backfill.

---

## 9. Forward Compatibility Notes

Several MVP schema decisions were made to ease future extension. These should not be undone:

| Decision | Reason |
|---|---|
| `risk_custom_field_value.person_email` exists but is null in MVP | Avoids a schema change when unresolved email assignment is introduced in Phase 2. |
| `risk.response_action` is nullable text, not an FK | Allows simple-mode registers to continue indefinitely without child-action tables. |
| `register.default_new_risk_state` is a column, not a hard-coded enum default | Supports configurable default state (Phase 6 advanced workflow) without a schema change. |
| `audit_event.metadata_json` is open JSONB | New audit metadata shapes for future phases can be stored without schema changes. |
| `audit_risk_snapshot.snapshot_json` is open JSONB | Can include child action and other related data in the snapshot as Phase 7 is added. |
| `api_key` table is already in the schema | PM13 API key management UI can be built without a schema migration. |
