# Phase 14 — Operational Hardening, Accessibility, Scale, and Compliance

**Status:** Planned

Phase goal: mature the application for larger, more regulated, and more diverse deployments.

## Phase Dependencies

### Must have before starting

- No hard prerequisites — individual tickets can start at any time.

### Recommended before starting

- Start observability (PM14-01, PM14-02) before Phase 9, 10, and 13 background jobs reach production.
- Horizontal scaling readiness (PM14-04) and job locking should be reviewed before background jobs go live.
- Accessibility audit (PM14-05) is most efficient when the UI is feature-complete.

### Can run in parallel with

Can run in parallel with all other phases. Observability work in particular should start early.

### Unlocks

- Production-readiness and compliance certification groundwork.

> **Note:** PM14-09 (PWA/mobile review) is a feasibility study, not a committed feature.

---

## PM14-01 — Observability Foundation

**Status:** Done

**Goal:** Add structured operational metrics and health visibility.

**Dependencies:** MVP logging and health endpoint.

**Deliverables:**

- metrics endpoint or exporter;
- request duration/error counters;
- job metrics for notifications/imports/webhooks;
- health dashboard notes;
- alerting recommendations.

**Acceptance criteria:**

- operators can monitor app health and background jobs;
- metrics do not expose secrets or business-sensitive field values;
- failures are diagnosable without reading raw database records.

**Implementation notes:**

- Implemented via `GET /api/v1/metrics` plus expanded `GET /api/v1/health` uptime data.
- HTTP request totals, error totals, and duration histograms are emitted using route templates rather than raw URLs.
- Background job instrumentation scaffolding now exists through `runObservedJob(...)` for future notifications/import/webhook runners.
- Dashboard and alerting guidance is documented in `docs/operations/observability.md`.

## PM14-02 — Distributed Tracing Readiness

**Status:** Done

**Goal:** Prepare the app for tracing across API requests and background jobs.

**Dependencies:** PM14-01.

**Deliverables:**

- correlation/request ID middleware;
- log correlation IDs;
- trace propagation through jobs where practical;
- documentation.

**Acceptance criteria:**

- a request can be traced through logs and relevant audit metadata where useful;
- correlation IDs do not become security tokens;
- user-facing errors can be correlated with server logs.

**Implementation notes:**

- Request context middleware now issues `X-Request-Id`, preserves a safe `X-Correlation-Id`, and accepts W3C `traceparent` trace IDs where available.
- Structured logs automatically include request/correlation/trace metadata via the shared logger mixin.
- Standard API error responses now include `error.requestId` for support correlation without exposing stack traces.
- Background job tracing can inherit correlation and trace context when using `runObservedJob(...)`.

## PM14-03 — Caching Strategy

**Status:** Planned

**Goal:** Define and implement caching for high-read configuration and lookup data where needed.

**Dependencies:** MVP performance profile; PM4 configuration versioning.

**Deliverables:**

- caching decision record;
- in-process or Redis-backed cache implementation;
- invalidation rules for configuration changes;
- tests for stale-permission avoidance.

**Acceptance criteria:**

- cached configuration invalidates after publish/change;
- permissions are not cached in a way that delays revocation unexpectedly;
- cache failures degrade safely.

## PM14-04 — Horizontal Scaling Readiness

**Status:** Planned

**Goal:** Make runtime behaviour safe for multiple app instances.

**Dependencies:** PM14-01; job frameworks from PM9/PM13.

**Deliverables:**

- background job locking strategy;
- connection pool sizing guidance;
- session/token assumptions review;
- Docker/deployment notes.

**Acceptance criteria:**

- scheduled jobs do not run duplicate work across app instances;
- token rotation remains safe across instances;
- database connection limits are documented.

## PM14-05 — Accessibility Audit and Remediation

**Status:** Planned

**Goal:** Perform a formal accessibility review and fix key issues.

**Dependencies:** MVP UI; major post-MVP UI phases where practical.

**Deliverables:**

- accessibility audit checklist;
- keyboard navigation fixes;
- form label/error improvements;
- contrast and focus fixes;
- screen-reader checks.

**Acceptance criteria:**

- core workflows are keyboard accessible;
- validation errors are programmatically associated with fields;
- focus management works for modals and route transitions.

## PM14-06 — Internationalisation Readiness

**Status:** Planned

**Goal:** Prepare the frontend and backend for future multi-language support.

**Dependencies:** MVP UI.

**Deliverables:**

- i18n library decision;
- string extraction approach;
- date/number formatting strategy;
- backend error/message key strategy.

**Acceptance criteria:**

- new UI strings can be localised;
- date/number display can follow locale;
- translation readiness does not change business logic.

## PM14-07 — Data Retention and Audit Retention Policy

**Status:** Planned

**Goal:** Add configurable retention controls where legally and operationally appropriate.

**Dependencies:** Audit Model extension; attachments/imports/notifications if implemented.

**Deliverables:**

- retention policy model;
- audit retention decision record;
- safe purge/archive jobs where allowed;
- admin documentation.

**Acceptance criteria:**

- retention behaviour is explicit and documented;
- immutable/audit requirements are not weakened accidentally;
- destructive retention jobs are permissioned and audited.

## PM14-08 — Compliance Control Pack

**Status:** Planned

**Goal:** Prepare documentation and controls for common governance expectations.

**Dependencies:** PM14-01 through PM14-07.

**Deliverables:**

- security control mapping;
- admin activity reporting;
- access review export;
- deployment hardening checklist;
- backup/restore test checklist.

**Acceptance criteria:**

- administrators can produce evidence of users, roles, audit activity, and key settings;
- deployment guidance covers TLS, secrets, backups, and database access;
- compliance documentation is clearly separated from product claims.

## PM14-09 — Mobile and PWA Review

**Status:** Planned

**Goal:** Decide whether to support deeper mobile/PWA behaviour.

**Dependencies:** PM14-05; MVP responsive baseline.

**Deliverables:**

- mobile workflow review;
- PWA decision record;
- responsive UI improvements for high-value workflows;
- install/offline scope decision.

**Acceptance criteria:**

- key owner workflows are usable on mobile viewports;
- PWA/offline capabilities are either explicitly implemented or explicitly deferred;
- no offline behaviour risks stale permission-sensitive data.
