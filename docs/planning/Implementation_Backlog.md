# Custom Risk — MVP Implementation Backlog

**Version:** 1.1
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** MVP implementation
**Related documents:** AI Build Instructions v1.1, MVP Scope v1.2, MVP Functional Specification v1.2, MVP Data Model v1.2, Technical Architecture v1.0, API Route Map v1.0, Permission Model v1.0, Audit Model v1.0, Security Model v1.0

---

## 1. Purpose

This document turns the MVP product and architecture documents into an implementation backlog.

It is intended to support:

- phase planning;
- AI-assisted implementation sessions;
- acceptance testing;
- implementation review;
- MVP scope control.

Tickets are grouped by implementation phase. Phase 0 is an implementation-only environment/bootstrap phase added before the six MVP product phases from MVP Scope. The backlog is intentionally implementation-oriented and should not introduce scope beyond the product and architecture documents.

---

## 2. Ticket Format

Each ticket includes:

- **Goal:** the implementation outcome.
- **Dependencies:** earlier tickets or documents required first.
- **Deliverables:** concrete code or documentation outputs.
- **Acceptance criteria:** observable completion checks.
- **Notes:** implementation constraints or high-risk details.

Ticket IDs use this format:

```text
P{phase}-{number}
```

Example:

```text
P1-01
```

---

## 3. Phase 0 — Environment and Bootstrap

Phase goal: create an empty but runnable development environment and project skeleton before product foundation work begins.

## P0-01 — Repository and Package Foundation

**Goal:** Create the monorepo package structure for backend and frontend.

**Dependencies:** Technical Architecture.

**Deliverables:**

- root project files;
- `backend/` TypeScript package;
- `frontend/` Vite React TypeScript package;
- shared lint/typecheck scripts where practical;
- `.env.example`;
- basic README update.

**Acceptance criteria:**

- backend TypeScript compiles;
- frontend TypeScript compiles;
- package scripts are documented;
- `.env.example` contains required non-secret variables.

## P0-02 — Local Environment Configuration

**Goal:** Define the local development environment contract.

**Dependencies:** P0-01.

**Deliverables:**

- `.env.example`;
- documented local environment variables;
- local setup notes in README;
- agreed local ports;
- seed password environment variable documented.

**Acceptance criteria:**

- a developer can identify required local variables without reading source code;
- no real secrets are committed;
- local setup instructions identify how to configure database and app services.

## P0-03 — Docker and Local Runtime

**Goal:** Provide local containerised runtime for app and PostgreSQL.

**Dependencies:** P0-01, P0-02.

**Deliverables:**

- `Dockerfile`;
- `docker-compose.yml`;
- PostgreSQL service using `postgres:16-alpine`;
- app service using Node 20;
- database health check;
- named PostgreSQL volume.

**Acceptance criteria:**

- Docker Compose starts app and database;
- app can reach database through `DATABASE_URL`;
- no real secrets are committed.

## P0-04 — Development Scripts and Quality Gates

**Goal:** Provide basic scripts future tickets can rely on.

**Dependencies:** P0-01.

**Deliverables:**

- backend typecheck script;
- frontend typecheck script;
- backend test script placeholder or initial test setup;
- frontend test script placeholder or initial test setup;
- format/lint scripts where practical.

**Acceptance criteria:**

- documented scripts run from the expected package directories;
- failing typecheck/test scripts fail with non-zero exit status;
- later phase tickets can reference these scripts for verification.

## P0-05 — GitHub Actions CI

**Goal:** Add a minimal GitHub Actions workflow for repository quality checks.

**Dependencies:** P0-04.

**Deliverables:**

- `.github/workflows/ci.yml`;
- Node 20 setup;
- dependency install step;
- backend typecheck step;
- frontend typecheck step;
- backend/frontend test steps when real test scripts exist;
- optional lint/format check steps if scripts are established in P0-04.

**Acceptance criteria:**

- CI runs on pull requests and pushes to the default branch;
- CI uses the same documented scripts as local development;
- CI does not require committed secrets;
- placeholder test scripts are not treated as meaningful coverage;
- workflow can be extended by later phases without changing the project structure.

---

## 4. Phase 1 — Foundation

Phase goal: establish the product foundation: database schema, backend shell, validation, authentication, users, registers, basic permissions, audit framework, and initial frontend shell.

## P1-01 — Prisma Schema and Initial Migration

**Goal:** Implement the drafted MVP Prisma schema.

**Dependencies:** P0-01, P0-03, `backend/prisma/schema.prisma`.

**Deliverables:**

- Prisma client setup;
- initial migration;
- `pgcrypto` extension setup where required for UUID generation;
- generated Prisma client.

**Acceptance criteria:**

- migration applies cleanly to an empty PostgreSQL database;
- Prisma client generation succeeds;
- schema matches the drafted `backend/prisma/schema.prisma`;
- no schema changes are made outside Prisma migrations.

## P1-02 — Backend App Shell

**Goal:** Create the Express backend application shell.

**Dependencies:** P0-01.

**Deliverables:**

- Express app setup;
- `/api/v1` route mounting;
- `GET /api/v1/health`;
- Pino logger;
- JSON body parsing;
- central error handler;
- standard API response helpers.

**Acceptance criteria:**

- `GET /api/v1/health` returns `{ "data": { "status": "ok" } }`;
- unhandled errors return standard error shape without stack traces;
- server logs errors server-side.

## P1-03 — Validation and Error Utilities

**Goal:** Establish reusable Zod validation and API error handling.

**Dependencies:** P1-02.

**Deliverables:**

- request validation middleware;
- standard error codes;
- validation error formatting;
- typed request helpers where practical.

**Acceptance criteria:**

- invalid body/query/path values return `VALIDATION_ERROR`;
- validation errors can include field-level messages;
- tests cover success and failure validation paths.

## P1-04 — Password and Token Utilities

**Goal:** Implement secure password hashing and token helpers.

**Dependencies:** P1-02.

**Deliverables:**

- bcrypt password hashing and verification;
- password policy validator;
- access JWT signing/verification;
- refresh token generation/hash/verification helpers;
- API key generation/hash helpers if needed for schema completeness.

**Acceptance criteria:**

- password policy matches Security Model;
- plain passwords and tokens are never logged;
- unit tests cover password validation and hash verification.

## P1-05 — Local Authentication Routes

**Goal:** Implement login, refresh, logout, and current-user session bootstrap.

**Dependencies:** P1-01, P1-04.

**Deliverables:**

- `POST /api/v1/auth/login`;
- `POST /api/v1/auth/refresh`;
- `POST /api/v1/auth/logout`;
- `GET /api/v1/auth/me`;
- refresh token rotation;
- refresh token reuse detection;
- HttpOnly refresh cookie handling;
- auth rate limiting.

**Acceptance criteria:**

- active user can log in;
- inactive user cannot log in;
- invalid credentials return generic error;
- refresh rotates token;
- reused refresh token invalidates token family;
- logout revokes current refresh token;
- access tokens are not stored in persistent frontend storage;
- audit events are created where required.

## P1-06 — Audit Framework

**Goal:** Create reusable audit write/read foundation.

**Dependencies:** P1-01, P1-02.

**Deliverables:**

- audit service;
- audit event creation helper;
- field-change helper;
- transaction-client support;
- basic audit query helpers.

**Acceptance criteria:**

- audit events can be written inside Prisma transactions;
- field changes can be attached to events;
- audit writes do not record secrets;
- audit service is used by auth/user/register foundation tickets.

## P1-07 — Permission Service

**Goal:** Centralise effective permission checks.

**Dependencies:** P1-01, P1-05.

**Deliverables:**

- authenticated actor context;
- permission helper functions from Permission Model;
- middleware for System Admin, register access, configuration access, risk access, export access;
- hidden-resource error behaviour.

**Acceptance criteria:**

- permission checks read current database state;
- System Admin, Register Admin, Register Viewer, and Risk Owner paths are covered by tests;
- `404` is used where revealing existence would be inappropriate.

## P1-08 — User Management API

**Goal:** Implement System Admin user management.

**Dependencies:** P1-05, P1-06, P1-07.

**Deliverables:**

- `GET /api/v1/users`;
- `POST /api/v1/users`;
- `GET /api/v1/users/:userId`;
- `PATCH /api/v1/users/:userId`;
- activate/deactivate endpoints;
- optional unlock endpoint if included from API Route Map.

**Acceptance criteria:**

- System Admin can list, create, update, activate, and deactivate users;
- non-System Admin users are denied;
- user deactivation revokes refresh tokens;
- System Admin role changes are audited;
- password values are redacted from audit and logs.

## P1-09 — Register Foundation API

**Goal:** Implement register creation, listing, detail, settings update, and default configuration seeding.

**Dependencies:** P1-06, P1-07.

**Deliverables:**

- `GET /api/v1/registers`;
- `POST /api/v1/registers`;
- `GET /api/v1/registers/:registerId`;
- `PATCH /api/v1/registers/:registerId`;
- `GET /api/v1/registers/:registerId/summary`;
- default likelihood, impact, risk level, matrix, and response strategy seeding.

**Acceptance criteria:**

- System Admin can create a register;
- Register Admin can update assigned register settings;
- register creation is transactional;
- initial Register Admin permissions are created;
- default configuration is seeded;
- register creation/settings changes are audited.

## P1-10 — Register Permission API

**Goal:** Implement register-level permission management.

**Dependencies:** P1-07, P1-09.

**Deliverables:**

- `GET /api/v1/registers/:registerId/permissions`;
- `POST /api/v1/registers/:registerId/permissions`;
- `DELETE /api/v1/registers/:registerId/permissions/:permissionId`.

**Acceptance criteria:**

- System Admin and Register Admin can manage register permissions;
- Register Admin cannot grant or remove System Admin rights;
- duplicate assignments are rejected;
- final Register Admin removal is blocked unless actor is System Admin;
- permission changes are audited.

## P1-11 — Frontend App Shell and Auth UI

**Goal:** Create the frontend shell, routing, session bootstrap, and login/logout experience.

**Dependencies:** P0-01, P1-05.

**Deliverables:**

- Vite React app shell;
- Mantine provider and layout;
- Axios API client;
- TanStack Query provider;
- auth state handling;
- login screen;
- protected route wrapper;
- logout action.

**Acceptance criteria:**

- user can log in and out from browser;
- protected routes require session;
- page refresh uses refresh endpoint before rendering protected routes;
- access token is kept in memory only.

## P1-12 — Users and Registers Frontend Foundation

**Goal:** Build MVP UI for users and register administration foundation.

**Dependencies:** P1-08, P1-09, P1-10, P1-11.

**Deliverables:**

- role-aware navigation;
- users list/add/edit screens;
- registers list;
- create register screen;
- edit register settings screen;
- register permissions screen.

**Acceptance criteria:**

- System Admin can manage users from UI;
- System Admin can create registers from UI;
- Register Admin can edit assigned register settings;
- Register Admin can manage register permissions;
- navigation hides unavailable areas.

---

## 5. Phase 2 — Risk Register Core

Phase goal: implement risk records, core risk table/detail/create/edit/delete behaviour, displayed Risk ID generation, ownership, state, and CSV export.

## P2-01 — Risk Service Foundation

**Goal:** Implement core risk service methods and derived values.

**Dependencies:** P1-07, P1-09.

**Deliverables:**

- transactional Risk ID generation;
- risk score calculation;
- risk level lookup from matrix;
- next review date calculation;
- custom field value validation foundation.

**Acceptance criteria:**

- Risk IDs are unique within register;
- prefix and zero-padding behaviour matches MVP decisions;
- risk score is calculated as likelihood × impact;
- missing matrix cell blocks risk save.

## P2-02 — Risk List API

**Goal:** Implement register risk table data endpoint.

**Dependencies:** P2-01.

**Deliverables:**

- `GET /api/v1/registers/:registerId/risks`;
- pagination;
- sorting;
- filtering;
- search;
- closed-risk default exclusion;
- permission-aware result set.

**Acceptance criteria:**

- authorised users see only permitted risks;
- closed risks are excluded by default;
- include-closed filter works for authorised users;
- Risk Owners see assigned risks only unless they have another role.

## P2-03 — Risk Create API

**Goal:** Implement risk creation.

**Dependencies:** P2-01.

**Deliverables:**

- `POST /api/v1/registers/:registerId/risks`;
- core field validation;
- owner validation;
- required custom field validation;
- transactional create and audit.

**Acceptance criteria:**

- System Admin and Register Admin can create risks;
- Risk Owners cannot create risks;
- new risk defaults to Draft unless explicitly set;
- Created Date defaults to current date when not overridden by authorised admin flow;
- Risk ID, score, level, and next review date are calculated;
- risk creation is audited.

## P2-04 — Risk Detail API

**Goal:** Implement risk detail endpoint.

**Dependencies:** P2-02.

**Deliverables:**

- `GET /api/v1/registers/:registerId/risks/:riskId`;
- core fields;
- custom field values;
- derived review status;
- system metadata display values.

**Acceptance criteria:**

- users with risk view access can open risk detail;
- hidden risks return `404` where appropriate;
- response includes enough data for view/edit forms.

## P2-05 — Risk Update API

**Goal:** Implement risk edit behaviour.

**Dependencies:** P2-03, P2-04.

**Deliverables:**

- `PATCH /api/v1/registers/:registerId/risks/:riskId`;
- role-aware editable field enforcement;
- owner reassignment;
- recalculation on likelihood/impact change;
- next review date recalculation where applicable;
- field-change audit rows.

**Acceptance criteria:**

- authorised users can edit permitted fields;
- Risk Owners cannot edit Created Date or system-controlled fields;
- calculated fields cannot be directly edited;
- owner changes take effect immediately;
- field changes are audited with previous/new values.

## P2-06 — Risk Hard Delete API

**Goal:** Implement System Admin hard delete with audit snapshot.

**Dependencies:** P2-04, P1-06.

**Deliverables:**

- `DELETE /api/v1/registers/:registerId/risks/:riskId`;
- confirmation validation;
- optional deletion reason;
- full audit snapshot creation.

**Acceptance criteria:**

- only System Admin can hard delete;
- deletion requires confirmation;
- snapshot is written before risk row is deleted;
- deleted risk disappears from normal views;
- delete transaction rolls back if snapshot write fails.

## P2-07 — CSV Export API

**Goal:** Implement filtered risk CSV export.

**Dependencies:** P2-02.

**Deliverables:**

- `GET /api/v1/registers/:registerId/risks/export`;
- filter reuse from risk list;
- CSV response headers;
- export audit event;
- optional `export_job` record if useful.

**Acceptance criteria:**

- System Admin and Register Admin can export;
- Register Viewer can export only when `allowViewerExport = true`;
- Risk Owner does not get export through ownership alone;
- export respects filters;
- export excludes unauthorised data;
- export action is audited.

## P2-08 — Risk Register Frontend

**Goal:** Build risk table, create, detail, edit, delete, and export UI.

**Dependencies:** P2-02 through P2-07.

**Deliverables:**

- register risk table;
- risk filters/search/sort;
- add risk form;
- risk detail view;
- edit risk form;
- delete confirmation for System Admin;
- CSV export action.

**Acceptance criteria:**

- users can complete core risk workflows according to permissions;
- closed risks are hidden by default;
- calculated fields are read-only;
- UI handles loading, error, validation, and empty states.

---

## 6. Phase 3 — Configuration

Phase goal: implement custom field configuration, dropdown options, required fields, field ordering, and register configuration UI.

## P3-01 — Register Configuration Bundle API

**Goal:** Provide configuration data for register configuration screens and risk forms.

**Dependencies:** P1-09, P2-04.

**Deliverables:**

- `GET /api/v1/registers/:registerId/config`;
- `GET /api/v1/registers/:registerId/risk-form-config`.

**Acceptance criteria:**

- configuration endpoints include active values;
- inactive referenced values are included where needed to render existing risks;
- permissions follow configuration/register access rules.

## P3-02 — Custom Field Definition API

**Goal:** Implement custom field create/list/detail/update/activate/deactivate.

**Dependencies:** P3-01.

**Deliverables:**

- custom field routes from API Route Map;
- supported field types;
- field type immutability;
- required flag;
- display order;
- help text;
- active/inactive handling;
- audit events.

**Acceptance criteria:**

- Register Admin can add supported custom fields;
- field type cannot be changed after creation;
- deactivation preserves existing values;
- required field changes affect future saves;
- changes are audited.

## P3-03 — Dropdown Option API

**Goal:** Implement dropdown option management.

**Dependencies:** P3-02.

**Deliverables:**

- option list/create/update/deactivate routes;
- option display order;
- active/inactive handling;
- audit events.

**Acceptance criteria:**

- dropdown fields require active options where applicable;
- existing risks can retain inactive option values;
- option changes are audited.

## P3-04 — Custom Field Value Validation

**Goal:** Complete runtime validation of custom field values on risk create/edit.

**Dependencies:** P2-03, P2-05, P3-02, P3-03.

**Deliverables:**

- type-specific custom field validation;
- required-field enforcement;
- Person Picker active local user enforcement;
- dropdown option validation;
- inactive referenced value handling.

**Acceptance criteria:**

- required custom fields block save when empty;
- Person Picker values require existing active local users when assigning;
- raw email-only person values are not populated by MVP logic;
- dropdown values must belong to the field/register.

## P3-05 — Configuration Frontend

**Goal:** Build field configuration UI.

**Dependencies:** P3-01 through P3-04.

**Deliverables:**

- register configuration navigation;
- field list;
- add/edit custom field form;
- dropdown option management;
- active/inactive controls;
- field ordering controls.

**Acceptance criteria:**

- Register Admin can manage custom fields and dropdowns;
- required custom field appears on risk forms;
- risks cannot save without required custom field values;
- configuration changes are audited.

## P3-06 — Core Field Order Anchors

**Goal:** Allow custom fields to be positioned between MVP core risk fields without making core fields fully configurable.

**Dependencies:** P3-05.

**Deliverables:**

- show read-only MVP core risk field anchors in Field Configuration;
- render custom fields among core fields according to `displayOrder`;
- keep core field names, types, validation, and order non-editable for MVP;
- avoid schema changes, draft/publish configuration, or full core-field layout configuration.

**Acceptance criteria:**

- Register Admins can see where custom fields will appear relative to core risk fields;
- custom fields with lower, intermediate, or higher display orders appear before, between, or after core fields on risk forms;
- core/default field configuration remains read-only;
- existing custom field create/edit validation and required-field behaviour continue to work.

---

## 7. Phase 4 — Scoring

Phase goal: implement likelihood, impact, risk level, matrix configuration, score calculation, and risk level display.

## P4-01 — Likelihood Configuration API

**Goal:** Implement likelihood value management.

**Dependencies:** P1-09.

**Deliverables:**

- likelihood list/create/update/deactivate routes;
- uniqueness validation;
- active/inactive handling;
- audit events.

**Acceptance criteria:**

- Register Admin can configure likelihood values;
- inactive likelihood values cannot be selected for new updates;
- existing risks can render inactive referenced values;
- changes are audited.

## P4-02 — Impact Configuration API

**Goal:** Implement impact value management.

**Dependencies:** P1-09.

**Deliverables:**

- impact list/create/update/deactivate routes;
- uniqueness validation;
- active/inactive handling;
- audit events.

**Acceptance criteria:**

- Register Admin can configure impact values;
- inactive impact values cannot be selected for new updates;
- existing risks can render inactive referenced values;
- changes are audited.

## P4-03 — Risk Level Configuration API

**Goal:** Implement risk level management.

**Dependencies:** P1-09.

**Deliverables:**

- risk level list/create/update/deactivate routes;
- display order;
- active/inactive handling;
- audit events.

**Acceptance criteria:**

- Register Admin can configure risk levels;
- at least one active risk level exists before valid matrix use;
- changes are audited.

## P4-04 — Risk Matrix API

**Goal:** Implement matrix viewing and update.

**Dependencies:** P4-01, P4-02, P4-03.

**Deliverables:**

- `GET /api/v1/registers/:registerId/matrix`;
- `PUT /api/v1/registers/:registerId/matrix`;
- optional per-cell update route;
- matrix completeness validation;
- audit events.

**Acceptance criteria:**

- every active likelihood/impact combination can map to a risk level;
- risk save is blocked if required matrix cell is missing;
- matrix changes are audited;
- risk level recalculation uses latest matrix.

## P4-05 — Scoring Recalculation Behaviour

**Goal:** Ensure score and level recalculation works across risk edits and configuration changes.

**Dependencies:** P2-05, P4-04.

**Deliverables:**

- recalculation on likelihood/impact change;
- recalculation helpers for matrix changes where needed;
- audit events for changed calculated values.

**Acceptance criteria:**

- risk score updates when likelihood or impact changes;
- risk level updates when likelihood, impact, or matrix mapping changes;
- users cannot directly edit score or level.

## P4-06 — Scoring Frontend

**Goal:** Build scoring configuration UI and risk level display.

**Dependencies:** P4-01 through P4-05.

**Deliverables:**

- likelihood configuration screen;
- impact configuration screen;
- risk level configuration screen;
- matrix configuration screen;
- risk level display in tables/detail.

**Acceptance criteria:**

- Register Admin can configure scoring model;
- risks display calculated score and level;
- matrix update acceptance scenario passes.

---

## 8. Phase 5 — Reviews and Dashboard

Phase goal: implement review flow, review history, last/next review dates, overdue indicators, My Work dashboard, and register admin summaries.

## P5-01 — Risk Review API

**Goal:** Implement risk review completion and review history.

**Dependencies:** P2-04, P2-05.

**Deliverables:**

- `GET /api/v1/registers/:registerId/risks/:riskId/reviews`;
- `POST /api/v1/registers/:registerId/risks/:riskId/reviews`;
- attestation copy;
- optional comment;
- latest review field updates;
- next review date recalculation;
- audit events.

**Acceptance criteria:**

- users with risk edit access can review;
- reviews are blocked when disabled for register;
- user must confirm review;
- review history is immutable through UI;
- review creates audit evidence.

## P5-02 — Review Status and Overdue Logic

**Goal:** Implement review status and overdue filter/count logic.

**Dependencies:** P5-01.

**Deliverables:**

- review status helper;
- overdue helper;
- due-soon window;
- table/dashboard filter integration.

**Acceptance criteria:**

- never-reviewed risk displays `NOT_REVIEWED`;
- never-reviewed risk with past next review date appears in overdue filters/counts;
- due-soon window is 30 days;
- closed risks are excluded from operational overdue counts by default.

## P5-03 — Dashboard APIs

**Goal:** Implement role-aware dashboard endpoints.

**Dependencies:** P2-02, P5-02.

**Deliverables:**

- `GET /api/v1/dashboard/my-work`;
- `GET /api/v1/dashboard/my-risks`;
- `GET /api/v1/dashboard/admin-summary`.

**Acceptance criteria:**

- Risk Owners see assigned open/due/overdue risks;
- Register Admins see summaries for administered registers;
- System Admins see system-wide totals and recent audit activity;
- users receive only data they are permitted to access.

## P5-04 — Audit Read APIs

**Goal:** Implement audit log routes.

**Dependencies:** P1-06, P1-07, P2/P3/P4/P5 audit-producing routes.

**Deliverables:**

- `GET /api/v1/audit/system`;
- `GET /api/v1/registers/:registerId/audit`;
- `GET /api/v1/registers/:registerId/risks/:riskId/audit`;
- `GET /api/v1/audit/events/:auditEventId`;
- `GET /api/v1/audit/events/:auditEventId/snapshot`.

**Acceptance criteria:**

- System Admin can view system audit;
- Register Admin can view assigned register audit;
- risk audit follows risk view access;
- deleted-risk snapshots are restricted to System Admin and Register Admin for register;
- filters work for date, actor, action, object type, register, risk/display ID, and client IP where captured.

## P5-05 — Dashboard and Review Frontend

**Goal:** Build review and dashboard UI.

**Dependencies:** P5-01 through P5-04.

**Deliverables:**

- Home / My Work dashboard;
- My Risks view;
- Register Admin summary;
- review action/modal;
- review history display;
- overdue and due-soon indicators;
- audit log views.

**Acceptance criteria:**

- Risk Owner can find and review assigned risks;
- Register Admin can identify overdue risks;
- System Admin can see system summary and audit activity;
- risk detail shows review/audit history.

---

## 9. Phase 6 — Hardening

Phase goal: close testing gaps, improve usability, seed realistic demo data, verify permissions/audit/security, and prepare MVP for use.

## P6-01 — Seed and Demo Data

**Goal:** Provide realistic seed data for development and testing.

**Dependencies:** P1-P5 implementation.

**Deliverables:**

- `backend/prisma/seed.ts`;
- seed users;
- seed registers;
- default configuration;
- representative risks.

**Acceptance criteria:**

- seed script creates a System Admin from `SEED_ADMIN_PASSWORD`;
- seed passwords are not hardcoded;
- demo registers include varied states, levels, owners, and review dates;
- seeded data supports dashboard/filter testing.

## P6-02 — Permission Test Suite

**Goal:** Add comprehensive permission coverage.

**Dependencies:** P1-P5 implementation.

**Deliverables:**

- backend integration tests for permission paths;
- frontend route/action visibility tests where practical.

**Acceptance criteria:**

- System Admin, Register Admin, Register Viewer, and Risk Owner access rules are covered;
- hidden-resource behaviour is covered;
- last Register Admin protection is covered;
- Register Viewer export permission is covered.

## P6-03 — Audit Completeness Review

**Goal:** Verify required audit coverage across MVP workflows.

**Dependencies:** P1-P5 implementation.

**Deliverables:**

- audit coverage checklist;
- missing audit event fixes;
- hard-delete snapshot tests;
- audit route permission tests.

**Acceptance criteria:**

- key changes create audit events;
- field-level before/after rows exist where required;
- hard delete snapshot contains required content;
- audit records do not contain secrets.

## P6-04 — Validation and Error Handling Hardening

**Goal:** Ensure validation and error responses are consistent.

**Dependencies:** P1-P5 implementation.

**Deliverables:**

- validation test coverage;
- standard error response review;
- frontend error display polish.

**Acceptance criteria:**

- invalid requests return standard error shape;
- validation errors identify fields where useful;
- no stack traces or secrets are returned;
- frontend displays actionable validation errors.

## P6-05 — Security Hardening

**Goal:** Verify auth/session/security controls.

**Dependencies:** P1-P5 implementation.

**Deliverables:**

- auth rate-limit verification;
- lockout tests;
- refresh rotation/reuse tests;
- cookie setting review;
- secret/log redaction review;
- CORS configuration review.

**Acceptance criteria:**

- inactive users cannot log in or refresh;
- refresh token reuse invalidates token family;
- access tokens are memory-only in frontend;
- secrets do not appear in logs/audit/API responses.

## P6-06 — Usability and Responsive Pass

**Goal:** Improve MVP usability for non-risk-specialist users.

**Dependencies:** P1-P5 frontend implementation.

**Deliverables:**

- empty states;
- loading states;
- form copy review;
- table readability pass;
- responsive layout checks for tablet/mobile viewing.

**Acceptance criteria:**

- common workflows are understandable without product expertise;
- pages do not expose unavailable actions;
- text fits in common viewport sizes;
- basic responsive layout works.

## P6-07 — End-to-End Acceptance Scenarios

**Goal:** Verify MVP acceptance scenarios.

**Dependencies:** P6-01 through P6-06.

**Deliverables:**

- acceptance test checklist or automated tests for MVP scenarios;
- bug fixes discovered during scenario testing.

**Acceptance criteria:**

- System Admin creates register;
- Register Admin configures field;
- Register Admin configures matrix;
- Register Admin creates risk;
- Risk Owner reviews risk;
- Register Viewer views register read-only;
- closed risks hidden by default;
- CSV export respects filters.

---

## 10. Cross-Phase Dependencies

Some work spans phases and should be tracked carefully:

- environment/bootstrap work is completed in Phase 0 and is prerequisite to every product phase;
- audit service starts in Phase 1 but coverage is completed in Phase 6;
- permission service starts in Phase 1 but must be used by every later feature;
- custom field validation begins in Phase 2 and is completed in Phase 3;
- scoring defaults are seeded in Phase 1 but full scoring configuration lands in Phase 4;
- review date defaults begin with risk creation and are completed with review workflows in Phase 5;
- frontend navigation starts in Phase 1 and becomes complete by Phase 5.

---

## 11. MVP Acceptance Mapping

| MVP success criterion | Primary tickets |
|---|---|
| System Admin can create users and registers | P1-08, P1-09, P1-12 |
| System Admin assigns Register Admins | P1-10, P1-12 |
| Register Admin configures usable assigned register | P3-01 to P3-05, P4-01 to P4-06 |
| Register Admin defines fields, scoring values, and matrix | P3-02, P3-03, P4-01 to P4-04 |
| Authorised users create/update permitted risk fields | P2-03, P2-05, P2-08 |
| Risk scores and levels calculate automatically | P2-01, P4-05 |
| Risk Owners find owned risks | P2-02, P5-03, P5-05 |
| Risk Owners complete reviews | P5-01, P5-05 |
| Register Admins see overdue risks | P5-02, P5-03, P5-05 |
| Key changes visible in audit history | P1-06, P5-04, P6-03 |
| Risk data exports to CSV | P2-07, P2-08 |

---

## 12. Backlog Governance

Before starting an implementation ticket:

1. Read the linked product and architecture docs.
2. Confirm the ticket does not pull in out-of-scope features.
3. Identify required permission checks.
4. Identify required audit events.
5. Identify transaction boundaries.
6. Identify tests to add or update.

Before marking a ticket complete:

1. Run relevant tests.
2. Confirm no secret values are logged or returned.
3. Confirm server-side validation exists.
4. Confirm backend permissions are enforced.
5. Confirm audit events are created where required.
6. Update docs if implementation intentionally changes a documented decision.
