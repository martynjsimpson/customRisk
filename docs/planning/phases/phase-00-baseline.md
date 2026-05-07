# Phase 0 — Post-MVP Baseline and Design Controls

**Status:** Done

Phase goal: establish a controlled baseline for post-MVP work so larger features do not destabilise the proven MVP implementation.

## Phase Dependencies

### Must have before starting

- Completed MVP (v0.1.2).

### Can run in parallel with

None — Phase 0 is a prerequisite for all subsequent phases.

### Unlocks

- All phases — provides governance documents (PM0-01 to PM0-05) that define schema extension rules, API conventions, audit/permission extension events, and the feature flag pattern every subsequent phase must follow.

> **Note:** All five tickets are complete. Their deliverables are the PM0-0x documents in `docs/planning/`. Later phases reference these documents rather than re-stating their rules.

---

## PM0-01 — Post-MVP Scope Baseline

**Status:** Done — see `docs/planning/PM0-01-scope-baseline.md`

**Goal:** Create a controlled post-MVP scope baseline from PRD deferrals and MVP out-of-scope items.

**Dependencies:** Completed MVP backlog; PRD v3.2; MVP Scope v1.2.

**Deliverables:**

- post-MVP scope inventory;
- mapping from PRD capability to backlog phase;
- explicit non-goals for the first post-MVP release;
- dependency map between phases;
- updated README or planning document link.

**Acceptance criteria:**

- every MVP out-of-scope feature is either mapped to a phase or deliberately parked;
- no post-MVP phase depends on an undocumented architectural assumption;
- release planning can identify which phases are independently shippable.

## PM0-02 — Post-MVP Data Model Extension Plan

**Status:** Done — see `docs/planning/PM0-02-data-model-extension.md`

**Goal:** Define safe schema-extension principles for post-MVP features.

**Dependencies:** PM0-01 (`docs/planning/PM0-01-scope-baseline.md`); MVP Data Model; current Prisma schema.

**Deliverables:**

- post-MVP data model extension notes;
- migration sequencing principles;
- downgrade/rollback considerations;
- data backfill approach for existing MVP records;
- test data strategy for migrated registers.

**Acceptance criteria:**

- schema additions preserve existing MVP data;
- destructive changes require explicit migration tickets;
- post-MVP migrations can be reviewed independently before feature implementation.

## PM0-03 — API Versioning and Compatibility Review

**Status:** Done — see `docs/planning/PM0-03-api-versioning-compatibility.md`

**Goal:** Confirm how post-MVP routes and breaking changes will be introduced.

**Dependencies:** PM0-01 (`docs/planning/PM0-01-scope-baseline.md`); API Route Map; Technical Architecture.

**Deliverables:**

- API compatibility decision record;
- route namespace conventions for deferred areas;
- frontend API client versioning approach;
- error-code extension rules.

**Acceptance criteria:**

- new route groups such as `/imports`, `/templates`, `/notifications`, `/risk-response-actions`, `/saved-views`, `/webhooks`, and `/attachments` have agreed naming conventions;
- existing MVP APIs remain backward compatible unless explicitly versioned;
- route naming remains resource-oriented.

## PM0-04 — Post-MVP Audit and Permission Extension Plan

**Status:** Done — see `docs/planning/PM0-04-audit-permission-extension.md`

**Goal:** Extend the audit and permission models to cover new object types.

**Dependencies:** PM0-01 (`docs/planning/PM0-01-scope-baseline.md`); Audit Model; Permission Model.

**Deliverables:**

- new audit object types and actions inventory;
- new permission helper inventory;
- field-visibility enforcement principles;
- deleted-object snapshot rules for new object types;
- audit event redaction rules for new sensitive areas.

**Acceptance criteria:**

- child Risk Response Actions, imports, notifications, templates, attachments, API keys, and webhooks have defined audit expectations;
- no new sensitive object type is introduced without a permission rule;
- audit records continue to avoid secrets.

## PM0-05 — Feature Flag and Migration Toggle Foundation

**Status:** Done — see `docs/planning/PM0-05-feature-flag-migration-toggles.md`

**Goal:** Add a simple mechanism to safely introduce larger post-MVP capabilities.

**Dependencies:** PM0-01 (`docs/planning/PM0-01-scope-baseline.md`).

**Deliverables:**

- environment-backed or database-backed feature flag approach;
- frontend route hiding based on flags;
- backend route/middleware gating where needed;
- documentation for enabling staged features.

**Acceptance criteria:**

- unfinished post-MVP features can be merged without exposing them accidentally;
- backend-protected features cannot be accessed merely by manually entering a URL;
- flags are documented and safe by default.
