# Phase 7 — Child-Record Risk Response Actions

**Status:** Planned

Phase goal: replace the simple response-action field with a full child-record action model where configured.

## Phase Dependencies

### Must have before starting

- Phase 0 — PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`) defines the Risk Response Owner permission subject and `RISK_ACTION` audit events.

### Recommended before starting

- Phase 5 (PM5-07) before Risk Response Owner limited context — the `visibleToResponseOwner` field flag is introduced in Phase 5.

### Can run in parallel with

Phases 1, 2, 3, 4, 5, 6, 9, 10, and 12 can run at the same time. Phase 7 is large but self-contained.

### Unlocks

- Phase 8 — action review tickets (PM8-07, PM8-08) require child actions.
- Phase 9 — action reminder rules (PM9-06) and escalation (PM9-09) require child actions.
- Phase 10 — action import/export (PM10-08) requires the child action model.
- Phase 12 — action attachments (PM12-04) require child actions.

> **Note:** This is the largest phase. Suggested sub-milestones: (1) data model + CRUD (PM7-01 to PM7-05), (2) linking and UI (PM7-06 to PM7-08), (3) mode migration and edge cases (PM7-09 to PM7-12).

---

## PM7-01 — Risk Response Action Data Model

**Status:** Planned

**Goal:** Add separate Risk Response Action records and risk-to-action links.

**Dependencies:** PM0-02 (`docs/planning/PM0-02-data-model-extension.md`); PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`); MVP risk model.

**Deliverables:**

- `risk_response_action` table;
- action-to-risk link table;
- action owner fields;
- status/configuration references;
- action system metadata;
- migration plan for simple action text.

**Acceptance criteria:**

- actions are scoped to a single register;
- one action can link to multiple risks in the same register;
- one risk can link to multiple actions;
- existing simple response text remains available until migration.

## PM7-02 — Risk Response Action Status Configuration

**Status:** Planned

**Goal:** Allow Register Admins to configure action statuses.

**Dependencies:** PM7-01.

**Deliverables:**

- status configuration table;
- default statuses such as Planned, In Progress, Implemented, Deferred, Cancelled;
- status classification such as active, completed, paused, cancelled, failed;
- configuration API and UI;
- audit events.

**Acceptance criteria:**

- active action statuses can be configured per register;
- inactive statuses remain renderable for historical actions;
- completed/cancelled classification can drive dashboards and notifications.

## PM7-03 — Risk Response Action Field Configuration

**Status:** Planned

**Goal:** Allow configurable fields for child Risk Response Actions.

**Dependencies:** PM7-01; PM5 advanced field model recommended.

**Deliverables:**

- action field definition model;
- supported default fields: response text, owner, due date, priority, completion date, evidence, category, affects, notes;
- validation rules;
- form configuration endpoint.

**Acceptance criteria:**

- Register Admins can configure fields for actions;
- action forms render active configured fields;
- required fields block save according to validation configuration.

## PM7-04 — Risk Response Action Permission Model

**Status:** Planned

**Goal:** Implement derived Risk Response Owner permissions and limited parent-risk context.

**Dependencies:** PM7-01; PM5-07; Permission Model extension.

**Deliverables:**

- permission helper functions for action view/edit/review/link;
- Risk Response Owner effective access rules;
- parent-risk limited visibility enforcement;
- tests for System Admin, Register Admin, Register Viewer, Risk Owner, Risk Response Owner.

**Acceptance criteria:**

- Risk Response Owners can view and update assigned actions;
- Risk Response Owners do not automatically gain full parent-risk access;
- Register Viewers can view actions for visible risks according to visibility rules;
- hidden resources use appropriate 404 behaviour.

## PM7-05 — Risk Response Action CRUD API

**Status:** Planned

**Goal:** Implement create, list, detail, update, and delete behaviour for actions.

**Dependencies:** PM7-01 through PM7-04.

**Deliverables:**

- action list endpoint;
- create action endpoint;
- detail endpoint;
- update endpoint;
- restricted hard delete endpoint;
- audit events and field changes.

**Acceptance criteria:**

- authorised users can create and update actions according to role;
- action status, owner, and due date are persisted and audited;
- unauthorised users cannot see or modify actions;
- delete snapshots are captured where required.

## PM7-06 — Risk-to-Action Linking API

**Status:** Planned

**Goal:** Allow actions to be linked and unlinked from risks.

**Dependencies:** PM7-05.

**Deliverables:**

- link action to risk endpoint;
- unlink endpoint;
- searchable existing action picker endpoint;
- linking permission checks;
- audit events on action and risk histories.

**Acceptance criteria:**

- Risk Owners can link/unlink actions for risks they own where register settings permit;
- Register Admins can manage all links in their register;
- cross-register links are blocked;
- link changes appear in risk and action audit views.

## PM7-07 — Risk Detail Linked Actions UI

**Status:** Planned

**Goal:** Show linked Risk Response Actions on the risk detail page.

**Dependencies:** PM7-05, PM7-06.

**Deliverables:**

- linked action panel;
- create/link/unlink controls;
- status and owner display;
- limited context handling;
- loading/error states.

**Acceptance criteria:**

- Risk Owners can understand the status of actions linked to their risks;
- linked action status does not automatically change residual scoring;
- only permitted actions are shown.

## PM7-08 — Risk Responses / My Actions Page

**Status:** Planned

**Goal:** Build the main action-owner work queue.

**Dependencies:** PM7-05.

**Deliverables:**

- Risk Responses / My Actions route;
- action table with filters, sorting, search;
- due date and overdue indicators;
- linked-risk display;
- role-aware views for owners/admins/viewers.

**Acceptance criteria:**

- Risk Response Owners can find and update assigned actions;
- Register Admins/System Admins can view actions across relevant scope;
- table respects field visibility and permissions.

## PM7-09 — Response Action Mode Switching: Simple to Child

**Status:** Planned

**Goal:** Allow a register to migrate from simple field mode to child-record mode.

**Dependencies:** PM7-01 through PM7-08; PM4 impact analysis.

**Deliverables:**

- mode setting;
- migration preview;
- option to convert existing simple response values to child actions;
- migration commit flow;
- audit events.

**Acceptance criteria:**

- simple mode remains available for registers that do not migrate;
- converted actions retain original text and link to source risks;
- migration cannot run without admin confirmation;
- migration is reversible only according to documented rules.

## PM7-10 — Response Action Mode Switching: Child to Simple Restriction

**Status:** Planned

**Goal:** Restrict or guide migration from child mode back to simple mode.

**Dependencies:** PM7-09.

**Deliverables:**

- impact analysis for child-to-simple downgrade;
- export/archive requirement where needed;
- explicit restriction or migration option;
- admin UI messaging.

**Acceptance criteria:**

- child-to-simple mode cannot silently discard action records, links, owners, reviews, or audit history;
- admins receive clear guidance on export/archive requirements;
- any permitted downgrade is audited.

## PM7-11 — Risk and Action Hard Delete Orphan Handling

**Status:** Planned

**Goal:** Handle linked actions when risks are hard-deleted.

**Dependencies:** PM7-06; MVP hard-delete snapshot.

**Deliverables:**

- orphan detection;
- delete-or-preserve orphan action option;
- enriched risk deletion snapshot including linked actions;
- action deletion snapshot where needed.

**Acceptance criteria:**

- deleting a risk removes its links;
- actions linked to other risks remain;
- actions that would become orphaned can be preserved or deleted according to admin selection;
- snapshots include required linked-action context.

## PM7-12 — Risk Response Audit Log

**Status:** Planned

**Goal:** Provide action-specific audit views.

**Dependencies:** PM7-05 through PM7-06; Audit Model extension.

**Deliverables:**

- Risk Response audit event scope/object handling;
- action audit route;
- action audit UI;
- field-change display;
- relationship-change display.

**Acceptance criteria:**

- action field changes, status changes, ownership changes, reviews, and link changes are visible;
- risk audit history shows relevant linked-action changes;
- permissions protect action audit details.
