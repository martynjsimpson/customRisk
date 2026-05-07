# Phase 11 — Reporting, Saved Views, and Dashboards

**Status:** Planned

Phase goal: evolve operational MVP dashboards into configurable reporting, saved views, charts, and scheduled reporting.

## Phase Dependencies

### Must have before starting

- Phase 5 (Advanced Field Model) — field-level visibility (PM5-06) must be enforced before reports are built to prevent reports from becoming an access-control bypass.

### Recommended before starting

- Phase 6 complete — inherent/residual risk and custom scoring make dashboard charts more useful.
- Phase 7 complete — child action data is a core reporting dimension.

### Can run in parallel with

Phases 8, 9, 10, 12, and 13 can run at the same time.

### Unlocks

- Nothing hard-blocks on Phase 11.

---

## PM11-01 — Saved View Data Model

**Status:** Planned

**Goal:** Store reusable table/report views.

**Dependencies:** MVP risk table filters; PM5 field visibility.

**Deliverables:**

- saved view table;
- owner/scope model: personal, register, system;
- filter/sort/column JSON schema;
- sharing rules.

**Acceptance criteria:**

- users can save personal views;
- Register Admins can create register-level views;
- saved views cannot expose fields the user cannot access.

## PM11-02 — Saved Views API and Frontend

**Status:** Planned

**Goal:** Add create, update, delete, select, and share behaviour for saved views.

**Dependencies:** PM11-01.

**Deliverables:**

- saved view routes;
- frontend saved-view selector;
- save current view action;
- default view selection.

**Acceptance criteria:**

- users can save and reload filters, sort, and columns;
- deleting a saved view does not affect underlying risk data;
- shared views respect permissions.

## PM11-03 — Advanced Reporting Data Service

**Status:** Planned

**Goal:** Provide report-ready aggregate queries.

**Dependencies:** MVP dashboard; PM6/PM7/PM8 if reporting those objects.

**Deliverables:**

- reporting service layer;
- risk counts by level/state/owner/register;
- review due/overdue aggregates;
- validation issue aggregates;
- action aggregates where PM7 is complete.

**Acceptance criteria:**

- aggregate results match underlying filtered data;
- queries enforce permissions;
- closed risks are excluded by default unless requested.

## PM11-04 — Dashboard Charts

**Status:** Planned

**Goal:** Add charts beyond simple counts.

**Dependencies:** PM11-03.

**Deliverables:**

- chart components;
- risks by level chart;
- overdue trend or age distribution;
- action status chart where actions exist;
- responsive layout.

**Acceptance criteria:**

- charts use permitted data only;
- chart filters align with table/report filters;
- charts remain understandable to non-risk specialists.

## PM11-05 — Cross-Register Reporting

**Status:** Planned

**Goal:** Allow authorised users to report across multiple registers.

**Dependencies:** PM11-03; Permission Model extension.

**Deliverables:**

- cross-register report endpoints;
- register selection filters;
- field compatibility handling;
- System Admin/Register Admin access rules.

**Acceptance criteria:**

- System Admins can report across all registers;
- Register Admins can report only across administered registers;
- custom fields are included only where compatible and permitted.

## PM11-06 — Custom Report Builder Foundation

**Status:** Planned

**Goal:** Provide a configurable report builder for common risk/report objects.

**Dependencies:** PM11-01 through PM11-05.

**Deliverables:**

- report definition model;
- data source selection;
- field selection;
- filter builder;
- preview endpoint.

**Acceptance criteria:**

- users can build reports from permitted objects and fields;
- invalid report definitions are rejected;
- preview data respects permissions and visibility.

## PM11-07 — Report Export

**Status:** Planned

**Goal:** Export saved and custom reports.

**Dependencies:** PM11-06; PM10 export infrastructure.

**Deliverables:**

- report CSV export;
- optional PDF/HTML export decision;
- export audit metadata;
- frontend export actions.

**Acceptance criteria:**

- exported report data matches on-screen filtered data;
- hidden fields are not exported;
- report exports are audited.

## PM11-08 — Scheduled Reports

**Status:** Planned

**Goal:** Send or generate reports on a schedule.

**Dependencies:** PM11-07; PM9 email delivery.

**Deliverables:**

- schedule model;
- recipient model;
- scheduler job;
- delivery logging;
- UI for schedule management.

**Acceptance criteria:**

- authorised users can schedule reports they are allowed to run;
- scheduled delivery respects recipient permissions or uses explicit distribution rules;
- failures are logged and visible.
