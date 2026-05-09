# Phase 13 — APIs, Webhooks, and Integration Admin

**Status:** Planned

Phase goal: expose controlled integration capabilities for external systems while preserving the same permission, audit, and security model.

## Phase Dependencies

### Must have before starting

- Phase 5 (Advanced Field Model) — field-level visibility rules must be mature before data is exposed to external API consumers.
- Phase 0 — PM0-03 (`docs/planning/PM0-03-api-versioning-compatibility.md`) defines API key bearer token conventions and route naming.

### Recommended before starting

- Phase 7 complete — child action data makes webhook event payloads richer.
- Phase 9 complete — outbound delivery infrastructure is related to webhook delivery.

### Can run in parallel with

Phases 8, 9, 10, 11, and 12 can run at the same time.

### Unlocks

- External integrations and operator automation workflows.

> **Note:** API key auth (PM13-01, PM13-02) changes the authentication model. Coordinate with PM0-03 conventions and the Security Model.

---

## PM13-01 — API Key Management Data Model Review

**Status:** Planned

**Goal:** Finalise API key persistence and scope model for external integrations.

**Dependencies:** Security Model; API Standards; Permission Model; Audit Model.

**Deliverables:**

- API key table review/migration;
- key prefix and hash rules;
- scope or user-inheritance decision;
- expiry/revocation model.

**Acceptance criteria:**

- API keys are stored only as hashes;
- API keys inherit or constrain permissions in a documented way;
- revoked keys stop working immediately.

## PM13-02 — API Key Management UI

**Status:** Planned

**Goal:** Allow System Admins to create, list, and revoke API keys.

**Dependencies:** PM13-01.

**Deliverables:**

- API key admin page;
- create key flow;
- one-time key reveal;
- revoke action;
- audit events.

**Acceptance criteria:**

- raw API key is shown once only;
- key list shows safe identifiers, owner, created date, last used date, and status;
- revocation is immediate and audited.

## PM13-03 — External API Hardening Pass

**Status:** Planned

**Goal:** Ensure API-key access works consistently across public integration routes.

**Dependencies:** PM13-01; Permission Model extension.

**Deliverables:**

- API key auth middleware tests;
- route permission tests;
- rate limits for API-key traffic;
- usage audit/logging policy.

**Acceptance criteria:**

- API keys cannot bypass browser-session permission checks;
- disabled users' API keys cannot be used;
- high-risk integration actions are auditable.

## PM13-04 — Webhook Subscription Data Model

**Status:** Planned

**Goal:** Model outbound webhook subscriptions.

**Dependencies:** PM0-02 (`docs/planning/PM0-02-data-model-extension.md`); Audit Model extension.

**Deliverables:**

- webhook subscription table;
- event type allow-list;
- secret storage/hash rules;
- delivery attempt table;
- status fields.

**Acceptance criteria:**

- subscriptions are scoped appropriately;
- webhook secrets are not returned after save;
- delivery attempts can be inspected by admins.

## PM13-05 — Webhook Delivery Service

**Status:** Planned

**Goal:** Deliver outbound webhook events reliably.

**Dependencies:** PM13-04.

**Deliverables:**

- event queue/outbox pattern;
- signing logic;
- retry policy;
- failure handling;
- delivery logs.

**Acceptance criteria:**

- events are signed with a configured secret;
- failed deliveries retry according to policy;
- delivery failures do not roll back already-committed business actions;
- payloads exclude fields the subscriber should not receive.

## PM13-06 — Webhook Admin UI

**Status:** Planned

**Goal:** Allow System Admins or authorised Register Admins to manage webhooks.

**Dependencies:** PM13-04, PM13-05.

**Deliverables:**

- webhook list/create/edit pages;
- event selector;
- test delivery action;
- delivery log view;
- enable/disable controls.

**Acceptance criteria:**

- admins can configure webhooks without database access;
- test deliveries show status and response details safely;
- subscription changes are audited.

## PM13-07 — Public Integration Documentation

**Status:** Planned

**Goal:** Document supported API and webhook integration patterns.

**Dependencies:** PM13-02 through PM13-06.

**Deliverables:**

- API authentication documentation;
- webhook signing documentation;
- example payloads;
- rate limit documentation;
- error response examples.

**Acceptance criteria:**

- an integration developer can authenticate, call supported APIs, and verify webhook signatures using the documentation;
- examples do not contain real secrets or internal-only IDs beyond sample values.
