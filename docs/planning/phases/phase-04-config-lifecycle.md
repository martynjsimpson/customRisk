# Phase 4 — Configuration Lifecycle and Templates

**Status:** Mostly Shipped

Phase goal: protect register configuration changes through drafts, impact analysis, publishing, import/export, and reusable templates.

## Phase Dependencies

### Must have before starting

- Phase 0 — PM0-02 (`docs/planning/PM0-02-data-model-extension.md`) governs the configuration version table schema additions.

### Can run in parallel with

Phases 1, 2, 3, 7, 9, 10, and 12 can run at the same time.

### Unlocks

- Phase 5 (Advanced Field Model) — config versioning is the recommended prerequisite for field lifecycle controls.
- Phase 6 (Advanced Scoring) — formula and scoring configuration benefit from draft/publish versioning.
- Phase 11 (Reporting) — stable configuration is assumed before advanced report queries are built.

---

## PM4-01 — Configuration Version Data Model

**Status:** Done

**Goal:** Introduce versioned register configuration storage.

**Dependencies:** PM0-02 (`docs/planning/PM0-02-data-model-extension.md`); completed MVP configuration model.

**Deliverables:**

- configuration version tables;
- published/current version pointer;
- draft version representation;
- migration from live MVP configuration into version 1;
- version metadata and actor fields.

**Acceptance criteria:**

- existing register configuration is represented as an initial published version;
- each register has exactly one active published configuration;
- draft versions can exist without affecting live risk forms.

**Notes:**

Version-pointer and snapshot storage design is resolved — see `docs/decisions/ADR-0004-config-version-storage.md`. The PM0-02 Phase 4 section contains the corresponding schema additions and backfill requirements.

Summary of the decision:

- The existing MVP config tables (`custom_field_definition`, `likelihood_value`, etc.) remain unchanged and always hold the live published configuration. No `config_version_id` FK is added to them.
- A new `register_config_version` table stores both draft and published versions. Each row has a `snapshot_json` JSONB column containing the complete register config at that point.
- `register` gains two nullable FKs: `current_config_version_id` (latest published) and `draft_config_version_id` (in-progress draft).
- **Draft:** clone the published snapshot into a new `DRAFT` version row. Editing a draft updates `snapshot_json` on that row.
- **Publish:** single transaction — write `snapshot_json` back to the relational config tables, mark the version `PUBLISHED`, update `register.current_config_version_id`, clear `draft_config_version_id`.
- **Published versions are immutable** once published. Templates reuse the same `snapshot_json` shape.

The mandatory backfill: for every existing register, create a version 1 `PUBLISHED` row, populate its `snapshot_json` from the current relational config, and set `register.current_config_version_id`. Run and verify this backfill before deploying the draft/publish application logic.

## PM4-02 — Draft Configuration Editing API

**Status:** Done

**Goal:** Allow configuration changes to be staged in draft before publishing.

**Dependencies:** PM4-01.

**Deliverables:**

- draft create/update routes;
- draft custom field changes;
- draft scoring/matrix changes;
- draft review/notification settings where applicable;
- draft validation endpoint.

**Acceptance criteria:**

- Register Admins can edit a draft without changing live risk behaviour;
- validation detects incomplete draft configuration;
- concurrent draft editing rules are enforced.

## PM4-03 — Configuration Impact Analysis Service

**Status:** Done

**Goal:** Analyse the effect of publishing configuration changes.

**Dependencies:** PM4-01, PM4-02.

**Deliverables:**

- affected-record counts;
- validation impact report;
- formula recalculation impact;
- field deactivation/type-change impact;
- response action mode impact;
- publish blockers and warnings.

**Acceptance criteria:**

- impact analysis identifies records that would become invalid;
- warnings and blockers are separated;
- publish cannot proceed when hard blockers exist;
- analysis results are auditable.

## PM4-04 — Configuration Publish API

**Status:** Done

**Goal:** Publish a draft configuration version safely.

**Dependencies:** PM4-03.

**Deliverables:**

- publish endpoint;
- acknowledgement of warnings;
- transactional publish flow;
- recalculation/backfill hooks;
- audit events for published changes.

**Acceptance criteria:**

- draft changes affect live forms only after publish;
- publish creates a new immutable published version;
- audit shows who published, when, and what changed;
- failed publish leaves the previous configuration active.

## PM4-05 — Configuration Draft and Publish Frontend

**Status:** Done

**Goal:** Build UI for draft configuration, impact analysis, and publishing.

**Dependencies:** PM4-02 through PM4-04.

**Deliverables:**

- draft status indicator;
- draft editing screens;
- impact analysis view;
- publish confirmation flow;
- discard draft action.

**Acceptance criteria:**

- Register Admins can see whether they are editing draft or published configuration;
- impact analysis is shown before publish;
- publish requires confirmation when warnings exist;
- live risk forms remain stable until publish.

## PM4-06 — Register Configuration JSON Export

**Status:** Done

**Goal:** Export register configuration as portable JSON.

**Dependencies:** PM4-01.

**Deliverables:**

- configuration export route;
- JSON schema definition;
- inclusion/exclusion decision for permissions;
- exported version metadata;
- audit event.

**Acceptance criteria:**

- Register Admins can export configuration for registers they administer;
- System Admins can export any register configuration;
- exported JSON validates against the documented schema;
- export excludes secrets and sensitive unrelated data.

## PM4-07 — Register Configuration JSON Import

**Status:** Done

**Goal:** Import register configuration JSON into a draft.

**Dependencies:** PM4-06, PM4-03.

**Deliverables:**

- upload/import endpoint;
- JSON schema validation;
- mapping rules for IDs and references;
- import-to-draft behaviour;
- impact analysis after import.

**Acceptance criteria:**

- imported configuration does not immediately change live registers;
- invalid JSON is rejected with field-level errors;
- imported configuration can be reviewed and published like any other draft;
- import is audited.

## PM4-08 — Global Template Data Model

**Status:** Done

**Goal:** Model reusable versioned register templates.

**Dependencies:** PM4-01, PM4-06.

**Deliverables:**

- template and template version tables;
- template metadata;
- published template version state;
- System Admin ownership/management rules.

**Acceptance criteria:**

- templates can have multiple immutable versions;
- only published template versions can be used to create registers;
- template versions preserve configuration context.

## PM4-09 — Template Management API

**Status:** Done

**Goal:** Allow System Admins to create and manage global templates.

**Dependencies:** PM4-08.

**Deliverables:**

- template list/detail/create/update routes;
- template version publish route;
- create-template-from-register route;
- deactivate template route;
- audit events.

**Acceptance criteria:**

- System Admins can create templates from existing register configuration;
- inactive templates cannot be selected for new registers;
- template changes are audited.

## PM4-10 — Create Register From Template

**Status:** Done

**Goal:** Allow registers to be created from a selected template version.

**Dependencies:** PM4-08, PM4-09; MVP register creation.

**Deliverables:**

- create-register-from-template backend flow;
- frontend create-register template selection;
- configuration copy service;
- template version reference on register where useful.

**Acceptance criteria:**

- a new register can be created with a full copied configuration from a template;
- later template changes do not automatically alter the register;
- created register remains independently configurable.

## PM4-11 — Template Update and Migration Planning

**Status:** Done

**Goal:** Allow administrators to compare a register with a newer template version and plan migration.

**Dependencies:** PM4-03, PM4-08 through PM4-10.

**Deliverables:**

- template comparison service;
- migration impact report;
- apply-template-update-to-draft flow;
- audit event coverage.

**Acceptance criteria:**

- Register Admins can see differences between current register config and newer template version;
- applying a template update creates a draft, not an immediate live change;
- impact analysis runs before publish.
