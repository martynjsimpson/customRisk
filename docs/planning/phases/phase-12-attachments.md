# Phase 12 — Attachments and Evidence

**Status:** Planned

Phase goal: allow users to attach evidence to risks, actions, reviews, and audit-relevant records safely.

## Phase Dependencies

### Must have before starting

- Phase 0 — PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`) defines attachment audit events and file content redaction rules.

### Recommended before starting

- Phase 7 before action attachments (PM12-04) — child actions must exist.
- Phase 8 before review evidence attachments (PM12-05) — review outcomes should be stable.

### Can run in parallel with

Phases 1, 2, 3, 4, 5, 6, 9, 10, and 11 can run at the same time. Risk attachments (PM12-02, PM12-03) can ship before Phase 7.

### Unlocks

- Nothing hard-blocks on Phase 12.

> **Note:** Decide on attachment storage backend (local filesystem vs object storage) in PM12-01 before any upload/download implementation. This affects the deployment model.

---

## PM12-01 — Attachment Storage Architecture

**Status:** Planned

**Goal:** Decide and implement attachment storage abstraction.

**Dependencies:** PM0-02 (`docs/planning/PM0-02-data-model-extension.md`); Security Model extension.

**Deliverables:**

- storage decision record: database, local filesystem, object storage, or abstraction;
- attachment metadata model;
- size/type limits;
- retention and deletion rules;
- local development storage setup.

**Acceptance criteria:**

- storage implementation works in Docker/local runtime;
- attachment metadata is stored separately from business objects;
- size/type limits are enforced server-side.

## PM12-02 — Attachment Upload and Download API

**Status:** Planned

**Goal:** Add secure upload and download behaviour.

**Dependencies:** PM12-01; Permission Model extension.

**Deliverables:**

- upload endpoint;
- download endpoint;
- metadata endpoint;
- virus/malware scanning integration point or documented placeholder;
- audit events.

**Acceptance criteria:**

- users can upload only to objects they can edit or attach to;
- users can download only attachments they are permitted to see;
- invalid file types/sizes are rejected;
- attachment access is audited where required.

## PM12-03 — Risk Attachments UI

**Status:** Planned

**Goal:** Allow attachments on risk records.

**Dependencies:** PM12-02.

**Deliverables:**

- risk attachment panel;
- upload/delete/download controls;
- metadata display;
- loading/error states.

**Acceptance criteria:**

- permitted users can add and remove risk attachments;
- read-only users can download visible attachments where permitted;
- attachment changes appear in risk audit history.

## PM12-04 — Risk Response Action Attachments UI

**Status:** Planned

**Goal:** Allow attachments on Risk Response Actions.

**Dependencies:** PM7; PM12-02.

**Deliverables:**

- action attachment panel;
- owner/admin permission handling;
- linked-risk visibility behaviour;
- audit events.

**Acceptance criteria:**

- action owners can attach evidence to their actions where permitted;
- parent risk users see attachments only according to visibility rules;
- attachment changes appear in action audit history.

## PM12-05 — Review Evidence Attachments

**Status:** Planned

**Goal:** Allow evidence to be attached during risk or action reviews.

**Dependencies:** PM8; PM12-02.

**Deliverables:**

- review attachment model/link;
- review form attachment control;
- immutable review evidence handling;
- audit linkage.

**Acceptance criteria:**

- review evidence remains associated with the review entry;
- normal users cannot rewrite historical review evidence;
- evidence visibility follows parent object permissions.

## PM12-06 — Attachment Lifecycle and Retention Controls

**Status:** Planned

**Goal:** Manage deletion, retention, and orphan handling for attachments.

**Dependencies:** PM12-01 through PM12-05.

**Deliverables:**

- soft-delete or tombstone model;
- orphan cleanup job;
- retention policy placeholders;
- admin diagnostics.

**Acceptance criteria:**

- deleting a business object does not leave inaccessible orphaned files indefinitely;
- audit snapshots preserve necessary attachment metadata;
- retention changes are documented before destructive deletion.
