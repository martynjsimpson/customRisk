# Phase 10 — Import, Export, and Data Portability

**Status:** Planned

Phase goal: support reliable import/export workflows for risks, actions, links, templates, and audit evidence.

## Phase Dependencies

### Must have before starting

- Phase 0 — PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`) defines import job audit events.

### Recommended before starting

- Risk-only CSV import (PM10-01 to PM10-07) can ship before Phases 5–7.
- Full import including custom fields, inherent/residual scoring, and child actions should wait until Phases 5, 6, and 7 are stable to avoid column-mapping schema churn.

### Can run in parallel with

Phases 1–4 can all run alongside a risk-only import. Full import is better sequenced after Phases 5–7.

### Unlocks

- Phase 14 — import background jobs require observability and job monitoring.

> **Note:** Consider a risk-only import sub-release (PM10-01 to PM10-07) early, then extend for actions and custom fields after Phase 7.

---

## PM10-01 — Import Job Data Model

**Status:** Planned

**Goal:** Model import jobs, files, mappings, validation results, and commit status.

**Dependencies:** PM0-02 (`docs/planning/PM0-02-data-model-extension.md`).

**Deliverables:**

- import job table;
- uploaded file metadata;
- column mapping storage;
- validation result storage;
- commit result storage;
- audit event types.

**Acceptance criteria:**

- import jobs have clear statuses such as uploaded, mapped, validated, committed, failed;
- validation results can be reviewed before commit;
- import file metadata avoids storing unnecessary sensitive data.

## PM10-02 — CSV Upload and Parsing Service

**Status:** Planned

**Goal:** Safely accept and parse CSV risk import files.

**Dependencies:** PM10-01; Security Model extension.

**Deliverables:**

- upload endpoint;
- file type/size validation;
- CSV parser;
- header detection;
- safe error handling.

**Acceptance criteria:**

- oversized or invalid files are rejected;
- parsing errors are returned as actionable messages;
- uploaded data is not committed during parsing.

## PM10-03 — Risk Import Column Mapping

**Status:** Planned

**Goal:** Allow users to map CSV columns to register fields.

**Dependencies:** PM10-02; MVP risk/custom field configuration.

**Deliverables:**

- mapping suggestion service;
- mapping API;
- frontend mapping screen;
- support for core and custom fields;
- date/dropdown/person handling notes.

**Acceptance criteria:**

- users can map CSV columns to current register configuration;
- required target fields are clearly identified;
- unmapped optional fields are allowed.

## PM10-04 — Risk Import Validation Preview

**Status:** Planned

**Goal:** Validate imported rows before commit.

**Dependencies:** PM10-03.

**Deliverables:**

- row-level validation service;
- error/warning summary;
- duplicate Risk ID detection;
- dropdown/date/person validation;
- calculated field ignore/recalculate behaviour.

**Acceptance criteria:**

- hard errors block commit;
- warnings require acknowledgement;
- row and field locations are shown clearly;
- no data is committed during validation.

## PM10-05 — Risk Import Commit

**Status:** Planned

**Goal:** Commit validated imports transactionally or in controlled batches.

**Dependencies:** PM10-04.

**Deliverables:**

- commit endpoint;
- create mode;
- created-date override enforcement;
- risk ID preservation where allowed;
- audit events per import and summary metadata.

**Acceptance criteria:**

- valid rows are created according to mapped fields;
- Risk Score, Risk Level, and review dates are calculated by the system;
- import commit is auditable;
- failed commits do not leave partially created records unless explicitly designed as batch mode.

## PM10-06 — Duplicate Risk ID Update/Merge Mode

**Status:** Planned

**Goal:** Support update/merge behaviour for imports with existing Risk IDs.

**Dependencies:** PM10-05.

**Deliverables:**

- update mode rules;
- merge conflict handling;
- preview of records to update;
- field-level audit strategy;
- confirmation flow.

**Acceptance criteria:**

- duplicate imported Risk IDs block by default;
- update/merge mode requires explicit selection;
- updated fields are audited with before/after values;
- unauthorised updates are blocked.

## PM10-07 — CSV Template Generation

**Status:** Planned

**Goal:** Generate CSV templates from current register configuration.

**Dependencies:** MVP configuration; PM5 advanced fields where applicable.

**Deliverables:**

- template generation endpoint;
- current core/custom field headers;
- dropdown values reference where practical;
- date/person field guidance;
- frontend download action.

**Acceptance criteria:**

- generated template reflects the current register configuration;
- required fields are identifiable;
- templates do not expose hidden or unauthorised fields.

## PM10-08 — Risk Response Import/Export

**Status:** Planned

**Goal:** Support import/export for child Risk Response Actions and risk-to-action links.

**Dependencies:** PM7; PM10-01 through PM10-07.

**Deliverables:**

- action CSV export;
- action import mapping/validation/commit;
- link CSV import/export;
- staged import support for risks, actions, and links.

**Acceptance criteria:**

- actions and links can be imported without cross-register linking;
- invalid link references are detected before commit;
- action imports respect permissions and validation.

## PM10-09 — Advanced Export Visibility and Field Selection

**Status:** Planned

**Goal:** Allow authorised users to choose export fields while respecting visibility.

**Dependencies:** PM5-06; MVP CSV export.

**Deliverables:**

- export field selection API;
- frontend export options dialog;
- visibility-filtered field list;
- audit metadata for selected fields.

**Acceptance criteria:**

- users cannot export fields they cannot see;
- selected fields are captured in export audit metadata;
- defaults match existing MVP export behaviour.

## PM10-10 — Audit Log Export

**Status:** Planned

**Goal:** Export audit logs for authorised users.

**Dependencies:** MVP audit routes; PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`).

**Deliverables:**

- system audit export route;
- register audit export route;
- filter reuse;
- CSV output;
- audit event for audit export.

**Acceptance criteria:**

- System Admins can export system audit logs;
- Register Admins can export assigned register audit logs;
- exports respect audit visibility rules;
- export action itself is audited.
