# Phase 9 — Notifications and SMTP

**Status:** Planned

Phase goal: notify users about due, overdue, and escalated review/action obligations through in-app and email channels.

## Phase Dependencies

### Must have before starting

- Phase 0 — PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`) defines notification audit events and SMTP credential redaction rules.

### Recommended before starting

- Phase 7 before action reminder rules (PM9-06) — child actions must exist.
- Phase 8 before escalation rules (PM9-09) — review outcome logic should be finalised first.
- SMTP (PM9-02, PM9-03) before Phase 3 Password Reset (PM3-06) if Phase 9 ships after Phase 3.

### Can run in parallel with

Basic in-app notification centre (PM9-04) can ship independently. Email delivery (PM9-07) requires SMTP config (PM9-02, PM9-03) to be in place first.

### Unlocks

- Phase 14 — observability becomes critical once Phase 9 adds background notification jobs.
- Phase 3 PM3-06 (password reset) if a standalone mail path was not implemented earlier.

> **Note:** Can be split: ship PM9-01 to PM9-04 (data model + in-app centre) as a sub-release, then PM9-05 to PM9-09 (rules and email) once Phases 7 and 8 are stable.

---

## PM9-01 — Notification Data Model

**Status:** Planned

**Goal:** Model notifications, rules, delivery attempts, and read state.

**Dependencies:** PM0-02 (`docs/planning/PM0-02-data-model-extension.md`); MVP review status logic.

**Deliverables:**

- notification table;
- notification rule table;
- recipient resolution model;
- delivery attempt/log table;
- read/dismiss state.

**Acceptance criteria:**

- notifications can be targeted to users and/or email recipients;
- delivery attempts are recorded without storing secrets;
- notifications are scoped to registers and objects where applicable.

## PM9-02 — SMTP Configuration and Secret Handling

**Status:** Planned

**Goal:** Allow System Admins to configure outbound email securely.

**Dependencies:** Security Model extension.

**Deliverables:**

- SMTP settings model;
- encrypted credential storage approach;
- SMTP admin API;
- test email endpoint;
- audit events.

**Acceptance criteria:**

- SMTP credentials are encrypted at rest or stored through an approved secret mechanism;
- credentials are masked in APIs and UI;
- test email confirms configuration without exposing secrets;
- configuration changes are audited.

## PM9-03 — SMTP Admin Frontend

**Status:** Planned

**Goal:** Build UI for SMTP configuration and test email.

**Dependencies:** PM9-02.

**Deliverables:**

- SMTP admin page;
- host/port/TLS/auth/from-address controls;
- credential update flow;
- test email action;
- error feedback.

**Acceptance criteria:**

- System Admins can configure SMTP without database access;
- saved secrets are not displayed back;
- failed tests show actionable errors without leaking credentials.

## PM9-04 — In-App Notification Centre

**Status:** Planned

**Goal:** Provide an in-app notification centre for users.

**Dependencies:** PM9-01.

**Deliverables:**

- notification list endpoint;
- unread count endpoint;
- mark read/unread actions;
- frontend notification centre;
- header badge.

**Acceptance criteria:**

- users can view and dismiss notifications assigned to them;
- unread counts update correctly;
- notification links route to permitted objects only.

## PM9-05 — Risk Review Reminder Rules

**Status:** Planned

**Goal:** Create notifications for risk reviews based on due/overdue rules.

**Dependencies:** PM9-01, PM9-04; MVP risk reviews.

**Deliverables:**

- rule configuration for due within X days and repeat every Y days;
- default recipient resolution for Risk Owner;
- fallback recipient support for Register Admins;
- scheduled reminder job.

**Acceptance criteria:**

- open risks due within the configured window generate notifications;
- closed risks are excluded by default;
- repeated reminders respect interval settings;
- no duplicate notifications are created for the same due event beyond configured repeats.

## PM9-06 — Risk Response Action Reminder Rules

**Status:** Planned

**Goal:** Create notifications for action due dates and action reviews.

**Dependencies:** PM7; PM8-07; PM9-01.

**Deliverables:**

- action reminder rule configuration;
- default recipient resolution for Risk Response Owner;
- completed/cancelled exclusion logic;
- scheduled reminder job.

**Acceptance criteria:**

- action owners receive due/overdue reminders where configured;
- completed or cancelled actions are excluded;
- fallback recipients are used when no owner exists.

## PM9-07 — Email Notification Delivery

**Status:** Planned

**Goal:** Send configured notifications by email when SMTP is configured.

**Dependencies:** PM9-02, PM9-05.

**Deliverables:**

- email delivery service;
- notification templates;
- retry policy;
- delivery status logging;
- failure handling.

**Acceptance criteria:**

- emails are sent only for rules with email channel enabled;
- failures are logged and retried according to policy;
- email content respects field visibility and permissions;
- email bodies do not expose hidden fields or secrets.

## PM9-08 — Notification Rule Configuration UI

**Status:** Planned

**Goal:** Allow Register Admins to configure notification rules.

**Dependencies:** PM9-05 through PM9-07.

**Deliverables:**

- notification rule list;
- create/edit rule form;
- recipient selector;
- channel selector;
- escalation settings entry point.

**Acceptance criteria:**

- Register Admins can configure risk and action reminder rules;
- invalid recipient or timing settings are blocked;
- notification rules are audited.

## PM9-09 — Escalation Recipients

**Status:** Planned

**Goal:** Add escalation recipients after X days overdue.

**Dependencies:** PM9-08.

**Deliverables:**

- escalation rule model;
- recipient resolver for Register Admins, specific users, specific email addresses, and custom Person Picker fields;
- escalation delivery logic;
- audit/logging.

**Acceptance criteria:**

- overdue items escalate after configured delay;
- escalation notifications do not repeat more often than configured;
- recipient resolution failures are visible to administrators.
