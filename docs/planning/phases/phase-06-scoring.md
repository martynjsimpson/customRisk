# Phase 6 — Advanced Scoring and Risk Methodologies

**Status:** Planned

Phase goal: support configurable formulas, inherent/residual scoring, and richer risk methodology options.

## Phase Dependencies

### Must have before starting

- Phase 4 (Configuration Lifecycle) — scoring configuration changes rely on draft/publish versioning.
- Phase 5 (Advanced Field Model) — the formula engine (PM6-01 to PM6-04) shares expression infrastructure with calculated custom fields (PM5-04, PM5-05); Phase 5 should be complete or in progress to avoid duplicating the parser.

### Can run in parallel with

Phases 7, 8, 9, 10, and 12 can run at the same time.

### Unlocks

- Inherent/residual scoring workflows, complex Risk ID formats, configurable state machines, and bulk edit.

> **Note:** The safe formula parser (PM6-01) and calculated field evaluator (PM5-05) share expression machinery. Design them together to avoid duplication.

---

## PM6-01 — Safe Formula Parser and Evaluator

**Status:** Planned

**Goal:** Implement a restricted arithmetic formula engine for risk scoring and calculated fields.

**Dependencies:** PM0-03 (`docs/planning/PM0-03-api-versioning-compatibility.md`); PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`).

**Deliverables:**

- parser for numeric fields, numeric lookup values, constants, `+`, `-`, `*`, `/`, and parentheses;
- AST validation;
- safe evaluator with divide-by-zero handling;
- formula test suite;
- expression error messages.

**Acceptance criteria:**

- formulas cannot execute arbitrary code;
- unsupported field types are rejected;
- invalid expressions produce actionable validation errors;
- evaluator is deterministic and covered by unit tests.

## PM6-02 — Risk Score Formula Configuration API

**Status:** Planned

**Goal:** Allow Register Admins to configure risk score formulas.

**Dependencies:** PM6-01; PM4 draft/publish recommended.

**Deliverables:**

- formula configuration routes;
- formula validation endpoint;
- preview evaluation endpoint;
- audit events.

**Acceptance criteria:**

- Register Admins can save valid formulas;
- invalid formulas cannot be published;
- formula changes are audited and run through impact analysis.

## PM6-03 — Formula Builder Frontend

**Status:** Planned

**Goal:** Provide a usable frontend for building and validating formulas.

**Dependencies:** PM6-02.

**Deliverables:**

- formula editor;
- insertable field list;
- validation feedback;
- sample calculation preview;
- help text.

**Acceptance criteria:**

- admins can build formulas without knowing internal field IDs;
- validation runs before save/publish;
- preview shows expected output for sample inputs.

## PM6-04 — Formula-Based Scoring Recalculation

**Status:** Planned

**Goal:** Use configured formulas to calculate risk score.

**Dependencies:** PM6-02.

**Deliverables:**

- score recalculation service update;
- risk create/edit integration;
- matrix compatibility checks;
- bulk recalculation strategy;
- audit events for score changes.

**Acceptance criteria:**

- risks use the current published formula;
- recalculation runs when formula inputs change;
- risk saves are blocked when formula cannot be evaluated;
- previous MVP likelihood × impact formula remains the default.

## PM6-05 — Inherent and Residual Risk Data Model

**Status:** Planned

**Goal:** Add optional inherent/residual risk fields per register.

**Dependencies:** PM6-01; PM4 recommended.

**Deliverables:**

- register setting for inherent/residual mode;
- schema additions for inherent/residual likelihood, impact, score, and level;
- migration for existing standard-risk registers;
- API DTO updates.

**Acceptance criteria:**

- existing registers remain in standard scoring mode;
- enabling inherent/residual mode is gated by impact analysis;
- required scoring fields are clearly defined per mode.

## PM6-06 — Inherent and Residual Scoring Behaviour

**Status:** Planned

**Goal:** Calculate inherent and residual score/level values.

**Dependencies:** PM6-05.

**Deliverables:**

- same-formula vs separate-formula support;
- recalculation service;
- matrix lookup behaviour;
- risk table/detail output updates;
- audit events.

**Acceptance criteria:**

- inherent and residual scores calculate correctly;
- users cannot directly edit calculated scores/levels;
- changes to relevant inputs update the correct calculated values;
- reports and dashboards clearly identify which score/level is used.

## PM6-07 — Inherent and Residual Frontend

**Status:** Planned

**Goal:** Update forms, tables, details, filters, and exports for inherent/residual mode.

**Dependencies:** PM6-06.

**Deliverables:**

- risk create/edit form changes;
- risk detail layout changes;
- table columns and filters;
- CSV export updates;
- configuration UI controls.

**Acceptance criteria:**

- standard-mode registers are unaffected;
- inherent/residual registers show the correct fields;
- table/export columns match register mode.

## PM6-08 — Complex Risk ID Format Builder

**Status:** Planned

**Goal:** Support configurable Risk ID formats beyond prefix and numeric sequence.

**Dependencies:** MVP Risk ID generation; PM4 impact analysis recommended.

**Deliverables:**

- format token model;
- safe format validation;
- preview generation;
- uniqueness enforcement;
- frontend format builder.

**Acceptance criteria:**

- admins can preview future generated IDs;
- changing format does not retroactively alter existing Risk IDs;
- invalid or collision-prone formats are blocked.

## PM6-09 — Advanced State Workflow

**Status:** Planned

**Goal:** Allow configurable risk states and state-transition rules.

**Dependencies:** PM4; MVP state model.

**Deliverables:**

- state configuration table;
- transition rules;
- default state setting;
- closed/operational classification;
- frontend workflow controls.

**Acceptance criteria:**

- existing Draft/Open/Closed states migrate safely;
- default views still exclude states classified as closed/inactive;
- invalid state transitions are blocked server-side;
- state changes are audited.

## PM6-10 — Bulk Edit Framework

**Status:** Planned

**Goal:** Support controlled bulk updates for selected risks.

**Dependencies:** PM5 validation; PM6 state/scoring rules as applicable.

**Deliverables:**

- bulk edit selection model;
- allowed bulk-edit fields;
- preview/impact step;
- transactional or chunked update service;
- audit strategy.

**Acceptance criteria:**

- users can bulk edit only fields they are permitted to edit;
- validation runs before commit;
- audit evidence identifies bulk operation actor, filters/selection, and changed fields;
- partial failure handling is explicit.
