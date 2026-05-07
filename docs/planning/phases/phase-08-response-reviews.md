# Phase 8 — Risk Response Reviews and Advanced Review Rules

**Status:** Planned

Phase goal: expand review behaviour from a single register-wide risk frequency to configurable risk and action review rules.

## Phase Dependencies

### Must have before starting

- Phase 7 (Child-Record Risk Response Actions) — action review tickets (PM8-07, PM8-08) require the action data model.

### Recommended before starting

- Implement Phase 8 before building Phase 9 notification rules — reminder timing (PM9-05) should follow the final review-date calculation model from Phase 8 (PM8-01 to PM8-03).

### Can run in parallel with

Phases 9 (basic in-app only), 10, 11, 12, and 13 can run at the same time.

### Unlocks

- Phase 9 — action reminder and escalation rules work correctly once Phase 8 review logic is finalised.

---

## PM8-01 — Review Rule Data Model

**Status:** Planned

**Goal:** Model field-based review frequency rules.

**Dependencies:** PM4 configuration versioning recommended; MVP review model.

**Deliverables:**

- review rule table/model;
- rule priority/order;
- target object type: risk or action;
- condition model based on field values;
- frequency outcome in days/months.

**Acceptance criteria:**

- rules can be scoped per register;
- default review frequency remains fallback;
- invalid rule definitions are rejected before publish.

## PM8-02 — Review Rule Evaluation Service

**Status:** Planned

**Goal:** Calculate next review dates using review rules.

**Dependencies:** PM8-01.

**Deliverables:**

- rule evaluator;
- recalculation on relevant field changes;
- rule-change recalculation strategy;
- tests for priority/fallback behaviour.

**Acceptance criteria:**

- high-priority matching rule determines review frequency;
- default frequency applies when no rule matches;
- recalculation is deterministic and auditable.

## PM8-03 — Review Rule Configuration UI

**Status:** Planned

**Goal:** Allow Register Admins to configure review frequency rules.

**Dependencies:** PM8-01, PM8-02.

**Deliverables:**

- review rules configuration screen;
- condition builder;
- frequency controls;
- test/preview panel;
- impact analysis integration.

**Acceptance criteria:**

- Register Admins can configure rules without writing code;
- invalid or conflicting rules are clearly highlighted;
- publishing rule changes shows affected records.

## PM8-04 — Review Comment Mode Configuration

**Status:** Planned

**Goal:** Support disabled, optional, or mandatory review comments.

**Dependencies:** MVP review flow.

**Deliverables:**

- register review comment mode setting;
- backend validation;
- review form UI changes;
- audit metadata updates.

**Acceptance criteria:**

- disabled comments are not collected;
- mandatory comments block review completion when empty;
- optional comments preserve MVP behaviour.

## PM8-05 — Attestation Versioning

**Status:** Planned

**Goal:** Preserve review attestation versions separately from current register text.

**Dependencies:** PM4 configuration versioning recommended.

**Deliverables:**

- attestation version model;
- review record version reference;
- display of historical attestation text;
- audit events for attestation changes.

**Acceptance criteria:**

- old review records continue to show the attestation accepted at the time;
- changing attestation text does not rewrite history;
- attestation changes are audited.

## PM8-06 — Review Outcome and Status

**Status:** Planned

**Goal:** Add optional structured review outcome/status.

**Dependencies:** MVP review flow.

**Deliverables:**

- configurable review outcome values;
- backend review validation;
- review history display;
- dashboard/report filters.

**Acceptance criteria:**

- review outcomes can be configured per register;
- review history records outcome at time of review;
- reports can filter by outcome where available.

## PM8-07 — Risk Response Action Reviews API

**Status:** Planned

**Goal:** Implement reviews for Risk Response Actions.

**Dependencies:** PM7-05; PM8-01 through PM8-06 as applicable.

**Deliverables:**

- action review history table;
- `GET` action reviews endpoint;
- `POST` action review endpoint;
- action next review date calculation;
- audit events.

**Acceptance criteria:**

- Risk Response Owners can review assigned actions when enabled;
- review history is immutable through the UI;
- completed/cancelled actions follow notification/review exclusion rules;
- review creates action audit evidence.

## PM8-08 — Risk Response Action Reviews Frontend

**Status:** Planned

**Goal:** Build action review UI and review history display.

**Dependencies:** PM8-07.

**Deliverables:**

- action review modal/form;
- action review history panel;
- due/overdue indicators on My Actions;
- review status filters.

**Acceptance criteria:**

- action owners can complete reviews with required confirmation;
- due/overdue action reviews are visible;
- action review history is read-only.
