# Phase 5 — Advanced Field Model

**Status:** Planned

Phase goal: extend the MVP custom field system with advanced validation, calculated fields, lifecycle controls, and visibility rules.

## Phase Dependencies

### Must have before starting

- Phase 4 (Configuration Lifecycle) — draft/publish versioning is the recommended prerequisite; field type migrations and lifecycle controls depend on a versioned config model.

### Recommended before starting

- Complete Phase 4 before starting Phase 5 to avoid schema conflicts between config versioning and field lifecycle migrations.

### Can run in parallel with

Can start after Phase 4. Not dependent on Phases 1–3, 7, 9, 10, or 12.

### Unlocks

- Phase 6 — formula engine (PM6-01 to PM6-04) shares expression infrastructure with calculated fields (PM5-04, PM5-05).
- Phase 11 — field-level visibility (PM5-06) must exist before reports are built to prevent reports becoming an access-control bypass.
- Phase 13 — external API visibility rules depend on Phase 5 field visibility maturity.
- Phase 7 Risk Response Owner limited context (PM5-07) — the `visibleToResponseOwner` field flag is defined here.

---

## PM5-01 — Warn-on-Save Validation Model

**Status:** Planned

**Goal:** Add configurable validation behaviours: allow, warn, or block.

**Dependencies:** PM4-01 recommended; MVP custom field validation.

**Deliverables:**

- validation mode property for custom fields and relevant core fields;
- backend warning generation;
- frontend warning display and acknowledgement;
- audit metadata for warning acknowledgement where useful.

**Acceptance criteria:**

- fields can be configured to allow, warn, or block when empty/invalid;
- warning validation does not block save after acknowledgement;
- blocking validation still prevents save;
- warnings are visible at field and form level.

## PM5-02 — Register-Level Validation Summary

**Status:** Planned

**Goal:** Show validation warnings and errors across a register.

**Dependencies:** PM5-01.

**Deliverables:**

- validation summary endpoint;
- register table indicators;
- dashboard counts for invalid/incomplete risks;
- filtered view of risks with validation issues.

**Acceptance criteria:**

- Register Admins can identify incomplete or warning-state risks;
- Risk Owners can see validation issues on their assigned risks;
- closed-risk inclusion follows report/filter settings.

## PM5-03 — Multi-Select Custom Field Type

**Status:** Planned

**Goal:** Add a multi-select custom field type.

**Dependencies:** MVP dropdown option foundation; PM0-02 (`docs/planning/PM0-02-data-model-extension.md`).

**Deliverables:**

- junction table or equivalent value storage;
- `MULTI_SELECT` field type;
- backend validation and read/write support;
- frontend Mantine MultiSelect input;
- detail/table/export display;
- audit serialisation.

**Acceptance criteria:**

- Register Admins can create a Multi-select field with options;
- risks can save zero, one, or multiple selected values;
- required Multi-select fields block save when empty;
- existing Dropdown fields are unaffected.

## PM5-04 — Calculated Custom Field Data Model

**Status:** Planned

**Goal:** Add calculated custom field definitions and persisted calculated values.

**Dependencies:** PM6-01 formula engine or limited calculation expression design.

**Deliverables:**

- calculated field type;
- expression storage;
- dependency metadata;
- calculated value storage/backfill strategy;
- immutability rules for direct editing.

**Acceptance criteria:**

- calculated fields cannot be edited directly by normal users;
- dependencies can be inspected;
- invalid formulas are rejected before activation/publish.

## PM5-05 — Calculated Custom Field Evaluation

**Status:** Planned

**Goal:** Evaluate calculated custom fields on risk create/edit and configuration publish.

**Dependencies:** PM5-04; PM6-01.

**Deliverables:**

- evaluation service;
- recalculation trigger on input changes;
- bulk recalculation job or synchronous backfill strategy;
- audit events for calculated value changes where required.

**Acceptance criteria:**

- calculated values update when source fields change;
- failed calculations produce safe validation errors;
- recalculation cannot corrupt manually entered fields;
- table/detail/export surfaces calculated values correctly.

## PM5-06 — Field-Level Visibility Model

**Status:** Planned

**Goal:** Add field visibility rules by role and context.

**Dependencies:** PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`); MVP permission service.

**Deliverables:**

- visibility configuration schema;
- backend field-filtering service;
- table/detail/export/notification visibility enforcement;
- frontend configuration controls.

**Acceptance criteria:**

- hidden fields are removed server-side, not only hidden in the UI;
- visibility applies consistently to forms, details, tables, exports, notifications, and APIs;
- System Admin and Register Admin behaviour is clearly defined.

## PM5-07 — Visible to Risk Response Owners

**Status:** Planned

**Goal:** Implement the specific parent-risk visibility rule needed by Risk Response Owners.

**Dependencies:** PM5-06; PM7 child action permission model.

**Deliverables:**

- `visibleToRiskResponseOwners` setting for core and custom fields;
- backend parent-risk context filtering;
- frontend previews and linked-risk display;
- tests for limited risk context.

**Acceptance criteria:**

- Risk Response Owners see only permitted parent-risk fields;
- restricted parent-risk fields do not appear in exports or notifications;
- Register Admins can configure visibility clearly.

## PM5-08 — Field Type Migration Framework

**Status:** Planned

**Goal:** Allow controlled field type changes with migration or remapping where safe.

**Dependencies:** PM4-03; PM5-04 optional.

**Deliverables:**

- allowed type-change matrix;
- preview of affected values;
- migration/remapping flow;
- rollback/failure handling;
- audit events.

**Acceptance criteria:**

- unsafe type changes are blocked;
- safe conversions require impact analysis and confirmation;
- old values are preserved or snapshotted before transformation.

## PM5-09 — Advanced Field Lifecycle Controls

**Status:** Planned

**Goal:** Add stronger lifecycle management for custom fields and options.

**Dependencies:** PM4-01; PM5-08.

**Deliverables:**

- soft delete/deactivation improvements;
- destructive deletion rules;
- confirmation flow;
- field usage report;
- deleted/deactivated field audit.

**Acceptance criteria:**

- fields with data cannot be destructively deleted without explicit System Admin-level confirmation;
- deactivated fields retain historical values;
- field usage is visible before lifecycle changes.

## PM5-10 — Advanced Field Configuration Frontend

**Status:** Planned

**Goal:** Update configuration UI for validation modes, visibility, multi-select, calculated fields, and lifecycle controls.

**Dependencies:** PM5-01 through PM5-09.

**Deliverables:**

- enhanced field list;
- validation mode controls;
- visibility controls;
- calculated field editor entry point;
- lifecycle action flow.

**Acceptance criteria:**

- Register Admins can manage advanced field behaviours without editing JSON;
- high-risk changes route through impact analysis where required;
- field forms remain understandable for non-technical administrators.
