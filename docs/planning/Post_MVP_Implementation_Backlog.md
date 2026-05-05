# Custom Risk — Post-MVP Implementation Backlog

**Version:** 1.0  
**Date:** 2026-05-05  
**Status:** Draft  
**Applies to:** Post-MVP implementation after completion of MVP backlog  
**Related documents:** PRD v3.2, MVP Scope v1.2, MVP Functional Specification v1.2, MVP Data Model v1.2, Technical Architecture v1.0, API Route Map v1.0, Permission Model v1.0, Audit Model v1.0, Security Model v1.0, MVP Implementation Backlog v1.1

---

## 1. Purpose

This document turns the work deliberately deferred from the MVP into an implementation backlog.

It is intended to support:

- post-MVP release planning;
- AI-assisted implementation sessions;
- acceptance testing;
- dependency management between major feature groups;
- scope control after the MVP has proven the core product value.

The backlog assumes the MVP implementation backlog has been completed through its hardening and end-to-end acceptance phases. It does not repeat MVP tickets except where post-MVP work needs to extend, migrate, or refactor an MVP capability.

---

## 2. Ticket Format

Each ticket includes:

- **Goal:** the implementation outcome.
- **Dependencies:** earlier tickets or documents required first.
- **Deliverables:** concrete code, configuration, test, or documentation outputs.
- **Acceptance criteria:** observable completion checks.
- **Notes:** implementation constraints or high-risk details.

Ticket IDs use this format:

```text
PM{phase}-{number}
```

Example:

```text
PM3-02
```

---

## 3. Post-MVP Phase Overview

| Phase | Theme | Summary |
|---:|---|---|
| 0 | Post-MVP Baseline and Design Controls | Re-baseline documents, architecture decisions, migration rules, and release controls. |
| 1 | User Experience, Profile, and Preferences | User profile, password change, user preferences, and dark mode. |
| 2 | Person Identity Expansion | Email-only person values, later user linking, directory-style lookup foundations. |
| 3 | Enterprise Authentication and Account Recovery | SAML / Entra ID, password reset, MFA, and auth admin UI. |
| 4 | Configuration Lifecycle and Templates | Draft/publish config, impact analysis, config import/export, templates. |
| 5 | Advanced Field Model | Warn-on-save validation, calculated fields, multi-select, visibility, lifecycle migration. |
| 6 | Advanced Scoring and Risk Methodologies | Custom formulas, inherent/residual risk, advanced state workflow, Risk ID format builder. |
| 7 | Child-Record Risk Response Actions | Separate response action records, owners, status, linking, permissions, audit. |
| 8 | Risk Response Reviews and Advanced Review Rules | Review rules, response reviews, attestation versions, outcome/status. |
| 9 | Notifications and SMTP | In-app notifications, email notifications, SMTP settings, reminders, escalation. |
| 10 | Import, Export, and Data Portability | CSV import wizard, update/merge, templates, risk response import/export, audit export. |
| 11 | Reporting, Saved Views, and Dashboards | Saved views, charts, cross-register reporting, report exports, scheduled reports. |
| 12 | Attachments and Evidence | File attachments, evidence handling, permissions, storage, audit, malware-safe handling. |
| 13 | APIs, Webhooks, and Integration Admin | API key management UI, webhooks, integration events, external API hardening. |
| 14 | Operational Hardening, Accessibility, Scale, and Compliance | Observability, caching, scaling, accessibility, i18n readiness, compliance controls. |

---

## 4. Phase 0 — Post-MVP Baseline and Design Controls

Phase goal: establish a controlled baseline for post-MVP work so larger features do not destabilise the proven MVP implementation.

## PM0-01 — Post-MVP Scope Baseline

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

**Goal:** Define safe schema-extension principles for post-MVP features.

**Dependencies:** PM0-01; MVP Data Model; current Prisma schema.

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

**Goal:** Confirm how post-MVP routes and breaking changes will be introduced.

**Dependencies:** PM0-01; API Route Map; Technical Architecture.

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

**Goal:** Extend the audit and permission models to cover new object types.

**Dependencies:** PM0-01; Audit Model; Permission Model.

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

**Goal:** Add a simple mechanism to safely introduce larger post-MVP capabilities.

**Dependencies:** PM0-01.

**Deliverables:**

- environment-backed or database-backed feature flag approach;
- frontend route hiding based on flags;
- backend route/middleware gating where needed;
- documentation for enabling staged features.

**Acceptance criteria:**

- unfinished post-MVP features can be merged without exposing them accidentally;
- backend-protected features cannot be accessed merely by manually entering a URL;
- flags are documented and safe by default.

---

## 5. Phase 1 — User Experience, Profile, and Preferences

Phase goal: deliver low-risk user-facing improvements that are broadly useful before deeper enterprise and workflow features.

## PM1-01 — My Profile API

**Goal:** Allow authenticated users to update their own display name and change their own password.

**Dependencies:** Completed MVP authentication and user management; Security Model.

**Deliverables:**

- `PATCH /api/v1/users/me` for own display name;
- `POST /api/v1/users/me/change-password`;
- password policy validation;
- current-password verification;
- refresh-token revocation for other active sessions;
- redacted audit events.

**Acceptance criteria:**

- authenticated users can update their own name;
- password change requires correct current password;
- new passwords follow the configured password policy;
- password values are never returned, logged, or audited;
- other active refresh tokens are revoked while the current session remains usable.

## PM1-02 — My Profile Frontend

**Goal:** Build the authenticated user profile page.

**Dependencies:** PM1-01; MVP frontend app shell.

**Deliverables:**

- `/profile` route;
- profile navigation entry point;
- name edit form;
- change password form;
- loading, success, and error states.

**Acceptance criteria:**

- all authenticated users can access their profile;
- name and password forms call the correct APIs;
- client-side validation catches password confirmation mismatch;
- password fields are not logged or persisted.

## PM1-03 — User Preferences API

**Goal:** Add server-side user preference storage.

**Dependencies:** PM1-01.

**Deliverables:**

- `preferences` JSONB column or equivalent user preference table;
- `GET /api/v1/users/me/preferences`;
- `PATCH /api/v1/users/me/preferences`;
- preference key allow-list.

**Acceptance criteria:**

- users can read and update preferences;
- partial updates preserve unrelated keys;
- null or missing preferences are treated as an empty object;
- sensitive values cannot be stored as preferences.

## PM1-04 — Dark Mode

**Goal:** Allow users to switch between light and dark colour schemes.

**Dependencies:** PM1-03; Mantine provider in MVP frontend.

**Deliverables:**

- Mantine colour-scheme provider wiring;
- profile-page colour-scheme toggle;
- server-side persistence of `colorScheme` preference;
- OS preference fallback.

**Acceptance criteria:**

- selected colour scheme applies immediately;
- preference persists across sessions and devices;
- users without a preference follow OS/browser preference;
- toggle is accessible to all authenticated users.

## PM1-05 — User Preference Bootstrap Integration

**Goal:** Load profile and preference data during session bootstrap without delaying protected-route rendering unnecessarily.

**Dependencies:** PM1-03, PM1-04.

**Deliverables:**

- preference fetch on app bootstrap;
- graceful fallback for preference API failures;
- frontend query cache integration;
- tests for preference loading.

**Acceptance criteria:**

- protected routes remain usable if preference loading fails;
- theme flicker is minimised;
- preference mutations update the in-memory UI state immediately.

---

## 6. Phase 2 — Person Identity Expansion

Phase goal: move beyond MVP local-user-only person assignment and support unresolved email assignment, later linking, and richer person-picker behaviour.

## PM2-01 — Person Reference Data Model

**Goal:** Establish a person reference model that can represent local users, external-auth users, and unresolved email addresses.

**Dependencies:** PM0-02; MVP user and custom field models.

**Deliverables:**

- schema migration for person references where needed;
- normalised email storage rules;
- linking strategy between person references and users;
- backfill from existing Risk Owner and Person Picker values.

**Acceptance criteria:**

- existing MVP user-backed assignments remain valid;
- unresolved email values can be stored without creating user accounts;
- duplicate person records for the same normalised email are prevented or merged safely.

## PM2-02 — Email-Only Person Picker Backend Support

**Goal:** Allow configured person fields to accept valid email addresses that are not yet local users.

**Dependencies:** PM2-01.

**Deliverables:**

- validation for unresolved person email values;
- risk custom field support for email-only person values;
- owner-field design decision for whether Risk Owner can be email-only;
- display helpers for linked and unresolved people.

**Acceptance criteria:**

- valid unresolved email values can be saved where allowed;
- invalid email formats are rejected;
- local users continue to be selectable;
- existing inactive-user references still render correctly.

## PM2-03 — Automatic User Linking on Account Creation or Login

**Goal:** Link stored person email values to user accounts when those users are later created or authenticated.

**Dependencies:** PM2-01, PM2-02.

**Deliverables:**

- linking service;
- user-created linking hook;
- external-auth login linking hook for later SAML work;
- audit or metadata record of linking events where useful.

**Acceptance criteria:**

- unresolved person values automatically resolve when a matching user appears;
- matching is case-insensitive and normalised;
- linking does not overwrite historical display context incorrectly;
- linking failures are logged without blocking unrelated user creation.

## PM2-04 — Person Picker Frontend Autocomplete

**Goal:** Improve Person Picker fields with user search plus free-email entry where permitted.

**Dependencies:** PM2-02.

**Deliverables:**

- reusable Person Picker component;
- active local user search;
- unresolved email entry state;
- inactive/unknown display badges;
- validation feedback.

**Acceptance criteria:**

- users can search existing users;
- users can enter email-only values where the field allows it;
- resolved, unresolved, and inactive values are visually distinguishable;
- component works in risk forms and future action forms.

## PM2-05 — Person Assignment Permission and Audit Review

**Goal:** Ensure person assignment rules do not create unintended access.

**Dependencies:** PM2-02 through PM2-04; Permission Model extension.

**Deliverables:**

- permission tests for unresolved person values;
- audit event coverage for assignment changes;
- policy for when unresolved Risk Owner values grant access, if supported;
- admin data-quality views for unresolved assignments.

**Acceptance criteria:**

- unresolved person values do not accidentally grant access to arbitrary users;
- when a user becomes linked, derived permissions update predictably;
- assignment changes are audited with safe display values.

---

## 7. Phase 3 — Enterprise Authentication and Account Recovery

Phase goal: add enterprise authentication and stronger account recovery/security features without weakening MVP local-auth controls.

## PM3-01 — Authentication Provider Data Model

**Goal:** Model multiple authentication methods for users.

**Dependencies:** PM0-02; PM2-01 recommended.

**Deliverables:**

- identity provider tables or configuration model;
- user external identity link table;
- migration preserving local-auth users;
- provider status flags.

**Acceptance criteria:**

- local authentication continues to work;
- users can have one or more external identity links;
- provider configuration can be enabled/disabled safely.

## PM3-02 — SAML Service Provider Foundation

**Goal:** Add backend SAML service provider support.

**Dependencies:** PM3-01; Security Model extension.

**Deliverables:**

- SAML library integration;
- metadata endpoint;
- assertion consumer service endpoint;
- signing/encryption certificate handling;
- configuration validation.

**Acceptance criteria:**

- the app can generate service-provider metadata;
- SAML responses are validated server-side;
- invalid signatures, audiences, issuers, and replayed assertions are rejected;
- SAML secrets/certificates are never logged.

## PM3-03 — Microsoft Entra ID SAML Configuration Preset

**Goal:** Provide a tested configuration path for Microsoft Entra ID.

**Dependencies:** PM3-02.

**Deliverables:**

- Entra ID setup notes;
- expected claims mapping;
- email/name mapping configuration;
- test checklist.

**Acceptance criteria:**

- an admin can configure Entra ID without reading source code;
- SAML login creates or links users according to configured policy;
- disabled providers cannot be used for login.

## PM3-04 — SAML Login and User Linking Flow

**Goal:** Allow users to authenticate through configured SAML providers.

**Dependencies:** PM3-02, PM3-03, PM2-03.

**Deliverables:**

- SAML login route;
- callback route;
- account linking by verified email;
- optional just-in-time user provisioning setting;
- audit events for SAML login/linking.

**Acceptance criteria:**

- known users can log in through SAML;
- JIT provisioning behaviour follows system configuration;
- inactive local accounts cannot be bypassed through SAML;
- authentication method is recorded where useful in audit metadata.

## PM3-05 — Authentication Admin UI

**Goal:** Provide System Admin UI for authentication provider configuration.

**Dependencies:** PM3-01 through PM3-04.

**Deliverables:**

- Authentication admin page;
- provider list;
- add/edit SAML provider form;
- metadata import/upload support where practical;
- provider enable/disable controls.

**Acceptance criteria:**

- System Admins can configure SAML without database access;
- secrets/certificates are masked after save;
- invalid provider configuration is clearly reported;
- provider changes are audited.

## PM3-06 — Password Reset Email Flow

**Goal:** Add secure password reset for local-auth users.

**Dependencies:** PM9-02 or minimal outbound email capability; Security Model extension.

**Deliverables:**

- password reset token table;
- request-reset endpoint;
- complete-reset endpoint;
- reset email template;
- frontend reset screens;
- rate limiting and audit events.

**Acceptance criteria:**

- users can request a reset without account enumeration;
- reset tokens are single-use, hashed, and expire;
- successful reset revokes active refresh tokens;
- reset tokens and passwords are never logged.

## PM3-07 — Multi-Factor Authentication Foundation

**Goal:** Add optional MFA for local-auth users and future provider policies.

**Dependencies:** PM3-01; Security Model extension.

**Deliverables:**

- MFA enrolment data model;
- TOTP support;
- recovery code support;
- MFA challenge routes;
- audit events.

**Acceptance criteria:**

- users can enrol and verify TOTP;
- recovery codes are shown once and stored hashed;
- MFA challenge is required when enabled;
- failed MFA attempts are rate-limited and audited.

## PM3-08 — MFA Frontend and Admin Controls

**Goal:** Provide user and admin UI for MFA.

**Dependencies:** PM3-07.

**Deliverables:**

- MFA enrolment screen;
- MFA challenge screen;
- recovery code management;
- System Admin reset MFA action;
- optional system-wide MFA requirement setting.

**Acceptance criteria:**

- users can enrol, verify, disable, and regenerate recovery codes where permitted;
- System Admins can reset MFA for a user;
- system-wide MFA enforcement is clear and auditable.

---

## 8. Phase 4 — Configuration Lifecycle and Templates

Phase goal: protect register configuration changes through drafts, impact analysis, publishing, import/export, and reusable templates.

## PM4-01 — Configuration Version Data Model

**Goal:** Introduce versioned register configuration storage.

**Dependencies:** PM0-02; completed MVP configuration model.

**Deliverables:**

- configuration version tables;
- published/current version pointer;
- draft version representation;
- migration from live MVP configuration into version 1;
- version metadata and actor fields.

**Acceptance criteria:**

- existing register configuration is represented as an initial published version;
- each register has exactly one active published configuration;
- draft versions can exist without affecting live risk forms.

## PM4-02 — Draft Configuration Editing API

**Goal:** Allow configuration changes to be staged in draft before publishing.

**Dependencies:** PM4-01.

**Deliverables:**

- draft create/update routes;
- draft custom field changes;
- draft scoring/matrix changes;
- draft review/notification settings where applicable;
- draft validation endpoint.

**Acceptance criteria:**

- Register Admins can edit a draft without changing live risk behaviour;
- validation detects incomplete draft configuration;
- concurrent draft editing rules are enforced.

## PM4-03 — Configuration Impact Analysis Service

**Goal:** Analyse the effect of publishing configuration changes.

**Dependencies:** PM4-01, PM4-02.

**Deliverables:**

- affected-record counts;
- validation impact report;
- formula recalculation impact;
- field deactivation/type-change impact;
- response action mode impact;
- publish blockers and warnings.

**Acceptance criteria:**

- impact analysis identifies records that would become invalid;
- warnings and blockers are separated;
- publish cannot proceed when hard blockers exist;
- analysis results are auditable.

## PM4-04 — Configuration Publish API

**Goal:** Publish a draft configuration version safely.

**Dependencies:** PM4-03.

**Deliverables:**

- publish endpoint;
- acknowledgement of warnings;
- transactional publish flow;
- recalculation/backfill hooks;
- audit events for published changes.

**Acceptance criteria:**

- draft changes affect live forms only after publish;
- publish creates a new immutable published version;
- audit shows who published, when, and what changed;
- failed publish leaves the previous configuration active.

## PM4-05 — Configuration Draft and Publish Frontend

**Goal:** Build UI for draft configuration, impact analysis, and publishing.

**Dependencies:** PM4-02 through PM4-04.

**Deliverables:**

- draft status indicator;
- draft editing screens;
- impact analysis view;
- publish confirmation flow;
- discard draft action.

**Acceptance criteria:**

- Register Admins can see whether they are editing draft or published configuration;
- impact analysis is shown before publish;
- publish requires confirmation when warnings exist;
- live risk forms remain stable until publish.

## PM4-06 — Register Configuration JSON Export

**Goal:** Export register configuration as portable JSON.

**Dependencies:** PM4-01.

**Deliverables:**

- configuration export route;
- JSON schema definition;
- inclusion/exclusion decision for permissions;
- exported version metadata;
- audit event.

**Acceptance criteria:**

- Register Admins can export configuration for registers they administer;
- System Admins can export any register configuration;
- exported JSON validates against the documented schema;
- export excludes secrets and sensitive unrelated data.

## PM4-07 — Register Configuration JSON Import

**Goal:** Import register configuration JSON into a draft.

**Dependencies:** PM4-06, PM4-03.

**Deliverables:**

- upload/import endpoint;
- JSON schema validation;
- mapping rules for IDs and references;
- import-to-draft behaviour;
- impact analysis after import.

**Acceptance criteria:**

- imported configuration does not immediately change live registers;
- invalid JSON is rejected with field-level errors;
- imported configuration can be reviewed and published like any other draft;
- import is audited.

## PM4-08 — Global Template Data Model

**Goal:** Model reusable versioned register templates.

**Dependencies:** PM4-01, PM4-06.

**Deliverables:**

- template and template version tables;
- template metadata;
- published template version state;
- System Admin ownership/management rules.

**Acceptance criteria:**

- templates can have multiple immutable versions;
- only published template versions can be used to create registers;
- template versions preserve configuration context.

## PM4-09 — Template Management API

**Goal:** Allow System Admins to create and manage global templates.

**Dependencies:** PM4-08.

**Deliverables:**

- template list/detail/create/update routes;
- template version publish route;
- create-template-from-register route;
- deactivate template route;
- audit events.

**Acceptance criteria:**

- System Admins can create templates from existing register configuration;
- inactive templates cannot be selected for new registers;
- template changes are audited.

## PM4-10 — Create Register From Template

**Goal:** Allow registers to be created from a selected template version.

**Dependencies:** PM4-08, PM4-09; MVP register creation.

**Deliverables:**

- create-register-from-template backend flow;
- frontend create-register template selection;
- configuration copy service;
- template version reference on register where useful.

**Acceptance criteria:**

- a new register can be created with a full copied configuration from a template;
- later template changes do not automatically alter the register;
- created register remains independently configurable.

## PM4-11 — Template Update and Migration Planning

**Goal:** Allow administrators to compare a register with a newer template version and plan migration.

**Dependencies:** PM4-03, PM4-08 through PM4-10.

**Deliverables:**

- template comparison service;
- migration impact report;
- apply-template-update-to-draft flow;
- audit event coverage.

**Acceptance criteria:**

- Register Admins can see differences between current register config and newer template version;
- applying a template update creates a draft, not an immediate live change;
- impact analysis runs before publish.

---

## 9. Phase 5 — Advanced Field Model

Phase goal: extend the MVP custom field system with advanced validation, calculated fields, lifecycle controls, and visibility rules.

## PM5-01 — Warn-on-Save Validation Model

**Goal:** Add configurable validation behaviours: allow, warn, or block.

**Dependencies:** PM4-01 recommended; MVP custom field validation.

**Deliverables:**

- validation mode property for custom fields and relevant core fields;
- backend warning generation;
- frontend warning display and acknowledgement;
- audit metadata for warning acknowledgement where useful.

**Acceptance criteria:**

- fields can be configured to allow, warn, or block when empty/invalid;
- warning validation does not block save after acknowledgement;
- blocking validation still prevents save;
- warnings are visible at field and form level.

## PM5-02 — Register-Level Validation Summary

**Goal:** Show validation warnings and errors across a register.

**Dependencies:** PM5-01.

**Deliverables:**

- validation summary endpoint;
- register table indicators;
- dashboard counts for invalid/incomplete risks;
- filtered view of risks with validation issues.

**Acceptance criteria:**

- Register Admins can identify incomplete or warning-state risks;
- Risk Owners can see validation issues on their assigned risks;
- closed-risk inclusion follows report/filter settings.

## PM5-03 — Multi-Select Custom Field Type

**Goal:** Add a multi-select custom field type.

**Dependencies:** MVP dropdown option foundation; PM0-02.

**Deliverables:**

- junction table or equivalent value storage;
- `MULTI_SELECT` field type;
- backend validation and read/write support;
- frontend Mantine MultiSelect input;
- detail/table/export display;
- audit serialisation.

**Acceptance criteria:**

- Register Admins can create a Multi-select field with options;
- risks can save zero, one, or multiple selected values;
- required Multi-select fields block save when empty;
- existing Dropdown fields are unaffected.

## PM5-04 — Calculated Custom Field Data Model

**Goal:** Add calculated custom field definitions and persisted calculated values.

**Dependencies:** PM6-01 formula engine or limited calculation expression design.

**Deliverables:**

- calculated field type;
- expression storage;
- dependency metadata;
- calculated value storage/backfill strategy;
- immutability rules for direct editing.

**Acceptance criteria:**

- calculated fields cannot be edited directly by normal users;
- dependencies can be inspected;
- invalid formulas are rejected before activation/publish.

## PM5-05 — Calculated Custom Field Evaluation

**Goal:** Evaluate calculated custom fields on risk create/edit and configuration publish.

**Dependencies:** PM5-04; PM6-01.

**Deliverables:**

- evaluation service;
- recalculation trigger on input changes;
- bulk recalculation job or synchronous backfill strategy;
- audit events for calculated value changes where required.

**Acceptance criteria:**

- calculated values update when source fields change;
- failed calculations produce safe validation errors;
- recalculation cannot corrupt manually entered fields;
- table/detail/export surfaces calculated values correctly.

## PM5-06 — Field-Level Visibility Model

**Goal:** Add field visibility rules by role and context.

**Dependencies:** PM0-04; MVP permission service.

**Deliverables:**

- visibility configuration schema;
- backend field-filtering service;
- table/detail/export/notification visibility enforcement;
- frontend configuration controls.

**Acceptance criteria:**

- hidden fields are removed server-side, not only hidden in the UI;
- visibility applies consistently to forms, details, tables, exports, notifications, and APIs;
- System Admin and Register Admin behaviour is clearly defined.

## PM5-07 — Visible to Risk Response Owners

**Goal:** Implement the specific parent-risk visibility rule needed by Risk Response Owners.

**Dependencies:** PM5-06; PM7 child action permission model.

**Deliverables:**

- `visibleToRiskResponseOwners` setting for core and custom fields;
- backend parent-risk context filtering;
- frontend previews and linked-risk display;
- tests for limited risk context.

**Acceptance criteria:**

- Risk Response Owners see only permitted parent-risk fields;
- restricted parent-risk fields do not appear in exports or notifications;
- Register Admins can configure visibility clearly.

## PM5-08 — Field Type Migration Framework

**Goal:** Allow controlled field type changes with migration or remapping where safe.

**Dependencies:** PM4-03; PM5-04 optional.

**Deliverables:**

- allowed type-change matrix;
- preview of affected values;
- migration/remapping flow;
- rollback/failure handling;
- audit events.

**Acceptance criteria:**

- unsafe type changes are blocked;
- safe conversions require impact analysis and confirmation;
- old values are preserved or snapshotted before transformation.

## PM5-09 — Advanced Field Lifecycle Controls

**Goal:** Add stronger lifecycle management for custom fields and options.

**Dependencies:** PM4-01; PM5-08.

**Deliverables:**

- soft delete/deactivation improvements;
- destructive deletion rules;
- confirmation flow;
- field usage report;
- deleted/deactivated field audit.

**Acceptance criteria:**

- fields with data cannot be destructively deleted without explicit System Admin-level confirmation;
- deactivated fields retain historical values;
- field usage is visible before lifecycle changes.

## PM5-10 — Advanced Field Configuration Frontend

**Goal:** Update configuration UI for validation modes, visibility, multi-select, calculated fields, and lifecycle controls.

**Dependencies:** PM5-01 through PM5-09.

**Deliverables:**

- enhanced field list;
- validation mode controls;
- visibility controls;
- calculated field editor entry point;
- lifecycle action flow.

**Acceptance criteria:**

- Register Admins can manage advanced field behaviours without editing JSON;
- high-risk changes route through impact analysis where required;
- field forms remain understandable for non-technical administrators.

---

## 10. Phase 6 — Advanced Scoring and Risk Methodologies

Phase goal: support configurable formulas, inherent/residual scoring, and richer risk methodology options.

## PM6-01 — Safe Formula Parser and Evaluator

**Goal:** Implement a restricted arithmetic formula engine for risk scoring and calculated fields.

**Dependencies:** PM0-03; PM0-04.

**Deliverables:**

- parser for numeric fields, numeric lookup values, constants, `+`, `-`, `*`, `/`, and parentheses;
- AST validation;
- safe evaluator with divide-by-zero handling;
- formula test suite;
- expression error messages.

**Acceptance criteria:**

- formulas cannot execute arbitrary code;
- unsupported field types are rejected;
- invalid expressions produce actionable validation errors;
- evaluator is deterministic and covered by unit tests.

## PM6-02 — Risk Score Formula Configuration API

**Goal:** Allow Register Admins to configure risk score formulas.

**Dependencies:** PM6-01; PM4 draft/publish recommended.

**Deliverables:**

- formula configuration routes;
- formula validation endpoint;
- preview evaluation endpoint;
- audit events.

**Acceptance criteria:**

- Register Admins can save valid formulas;
- invalid formulas cannot be published;
- formula changes are audited and run through impact analysis.

## PM6-03 — Formula Builder Frontend

**Goal:** Provide a usable frontend for building and validating formulas.

**Dependencies:** PM6-02.

**Deliverables:**

- formula editor;
- insertable field list;
- validation feedback;
- sample calculation preview;
- help text.

**Acceptance criteria:**

- admins can build formulas without knowing internal field IDs;
- validation runs before save/publish;
- preview shows expected output for sample inputs.

## PM6-04 — Formula-Based Scoring Recalculation

**Goal:** Use configured formulas to calculate risk score.

**Dependencies:** PM6-02.

**Deliverables:**

- score recalculation service update;
- risk create/edit integration;
- matrix compatibility checks;
- bulk recalculation strategy;
- audit events for score changes.

**Acceptance criteria:**

- risks use the current published formula;
- recalculation runs when formula inputs change;
- risk saves are blocked when formula cannot be evaluated;
- previous MVP likelihood × impact formula remains the default.

## PM6-05 — Inherent and Residual Risk Data Model

**Goal:** Add optional inherent/residual risk fields per register.

**Dependencies:** PM6-01; PM4 recommended.

**Deliverables:**

- register setting for inherent/residual mode;
- schema additions for inherent/residual likelihood, impact, score, and level;
- migration for existing standard-risk registers;
- API DTO updates.

**Acceptance criteria:**

- existing registers remain in standard scoring mode;
- enabling inherent/residual mode is gated by impact analysis;
- required scoring fields are clearly defined per mode.

## PM6-06 — Inherent and Residual Scoring Behaviour

**Goal:** Calculate inherent and residual score/level values.

**Dependencies:** PM6-05.

**Deliverables:**

- same-formula vs separate-formula support;
- recalculation service;
- matrix lookup behaviour;
- risk table/detail output updates;
- audit events.

**Acceptance criteria:**

- inherent and residual scores calculate correctly;
- users cannot directly edit calculated scores/levels;
- changes to relevant inputs update the correct calculated values;
- reports and dashboards clearly identify which score/level is used.

## PM6-07 — Inherent and Residual Frontend

**Goal:** Update forms, tables, details, filters, and exports for inherent/residual mode.

**Dependencies:** PM6-06.

**Deliverables:**

- risk create/edit form changes;
- risk detail layout changes;
- table columns and filters;
- CSV export updates;
- configuration UI controls.

**Acceptance criteria:**

- standard-mode registers are unaffected;
- inherent/residual registers show the correct fields;
- table/export columns match register mode.

## PM6-08 — Complex Risk ID Format Builder

**Goal:** Support configurable Risk ID formats beyond prefix and numeric sequence.

**Dependencies:** MVP Risk ID generation; PM4 impact analysis recommended.

**Deliverables:**

- format token model;
- safe format validation;
- preview generation;
- uniqueness enforcement;
- frontend format builder.

**Acceptance criteria:**

- admins can preview future generated IDs;
- changing format does not retroactively alter existing Risk IDs;
- invalid or collision-prone formats are blocked.

## PM6-09 — Advanced State Workflow

**Goal:** Allow configurable risk states and state-transition rules.

**Dependencies:** PM4; MVP state model.

**Deliverables:**

- state configuration table;
- transition rules;
- default state setting;
- closed/operational classification;
- frontend workflow controls.

**Acceptance criteria:**

- existing Draft/Open/Closed states migrate safely;
- default views still exclude states classified as closed/inactive;
- invalid state transitions are blocked server-side;
- state changes are audited.

## PM6-10 — Bulk Edit Framework

**Goal:** Support controlled bulk updates for selected risks.

**Dependencies:** PM5 validation; PM6 state/scoring rules as applicable.

**Deliverables:**

- bulk edit selection model;
- allowed bulk-edit fields;
- preview/impact step;
- transactional or chunked update service;
- audit strategy.

**Acceptance criteria:**

- users can bulk edit only fields they are permitted to edit;
- validation runs before commit;
- audit evidence identifies bulk operation actor, filters/selection, and changed fields;
- partial failure handling is explicit.

---

## 11. Phase 7 — Child-Record Risk Response Actions

Phase goal: replace the simple response-action field with a full child-record action model where configured.

## PM7-01 — Risk Response Action Data Model

**Goal:** Add separate Risk Response Action records and risk-to-action links.

**Dependencies:** PM0-02; PM0-04; MVP risk model.

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

---

## 12. Phase 8 — Risk Response Reviews and Advanced Review Rules

Phase goal: expand review behaviour from a single register-wide risk frequency to configurable risk and action review rules.

## PM8-01 — Review Rule Data Model

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

---

## 13. Phase 9 — Notifications and SMTP

Phase goal: notify users about due, overdue, and escalated review/action obligations through in-app and email channels.

## PM9-01 — Notification Data Model

**Goal:** Model notifications, rules, delivery attempts, and read state.

**Dependencies:** PM0-02; MVP review status logic.

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

---

## 14. Phase 10 — Import, Export, and Data Portability

Phase goal: support reliable import/export workflows for risks, actions, links, templates, and audit evidence.

## PM10-01 — Import Job Data Model

**Goal:** Model import jobs, files, mappings, validation results, and commit status.

**Dependencies:** PM0-02.

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

**Goal:** Export audit logs for authorised users.

**Dependencies:** MVP audit routes; PM0-04.

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

---

## 15. Phase 11 — Reporting, Saved Views, and Dashboards

Phase goal: evolve operational MVP dashboards into configurable reporting, saved views, charts, and scheduled reporting.

## PM11-01 — Saved View Data Model

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

---

## 16. Phase 12 — Attachments and Evidence

Phase goal: allow users to attach evidence to risks, actions, reviews, and audit-relevant records safely.

## PM12-01 — Attachment Storage Architecture

**Goal:** Decide and implement attachment storage abstraction.

**Dependencies:** PM0-02; Security Model extension.

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

---

## 17. Phase 13 — APIs, Webhooks, and Integration Admin

Phase goal: expose controlled integration capabilities for external systems while preserving the same permission, audit, and security model.

## PM13-01 — API Key Management Data Model Review

**Goal:** Finalise API key persistence and scope model for external integrations.

**Dependencies:** Security Model; API Route Map; Permission Model; Audit Model.

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

**Goal:** Model outbound webhook subscriptions.

**Dependencies:** PM0-02; Audit Model extension.

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

---

## 18. Phase 14 — Operational Hardening, Accessibility, Scale, and Compliance

Phase goal: mature the application for larger, more regulated, and more diverse deployments.

## PM14-01 — Observability Foundation

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

## PM14-02 — Distributed Tracing Readiness

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

## PM14-03 — Caching Strategy

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

---

## 19. Cross-Phase Dependencies

Some work spans phases and should be tracked carefully:

- **Post-MVP baseline work in Phase 0** should precede all major schema, permission, audit, and route expansion.
- **User preferences in Phase 1** are a low-risk independent improvement, but password reset email in Phase 3 depends on outbound email capability from Phase 9 unless a minimal mail path is implemented earlier.
- **Person Identity Expansion in Phase 2** should precede SAML/JIT provisioning and email-only assignment behaviours.
- **Configuration Lifecycle in Phase 4** is a strong prerequisite for advanced fields, formulas, inherent/residual scoring, templates, review rules, and response-action mode migration.
- **Advanced Field Model in Phase 5** underpins calculated fields, field-level visibility, multi-select fields, advanced imports, reports, and Risk Response Owner limited context.
- **Advanced Scoring in Phase 6** depends on the formula engine and should be designed before calculated custom fields rely on the same expression machinery.
- **Child-Record Risk Response Actions in Phase 7** are prerequisite for Risk Response Owners, My Actions, Risk Response Reviews, action notifications, action import/export, and action attachments.
- **Advanced Review Rules in Phase 8** should be implemented before complex notification rules so notification timing follows the final review-date calculation model.
- **Notifications in Phase 9** depend on reliable due/overdue logic and should be extended after action reviews if action reminders are in scope.
- **Import/Export in Phase 10** becomes more complex if advanced fields, inherent/residual scoring, and child actions are already implemented; decide whether to ship a risk-only import earlier or wait for the richer model.
- **Reporting in Phase 11** should use stable permission and visibility services so reports do not become an access-control bypass.
- **Attachments in Phase 12** should integrate with both risk and action permissions before being exposed broadly.
- **APIs/Webhooks in Phase 13** should come after permission, audit, and visibility rules are mature enough for external consumers.
- **Operational hardening in Phase 14** can run in parallel, but horizontal scaling, job locking, observability, and compliance work become more important once notifications, imports, and webhooks add background processing.

---

## 20. Post-MVP Acceptance Mapping

| Product capability | Primary tickets |
|---|---|
| Users can manage own profile and preferences | PM1-01 to PM1-05 |
| Person Picker can store unresolved email values and later link users | PM2-01 to PM2-05 |
| SAML / Entra ID authentication works | PM3-01 to PM3-05 |
| Password reset and MFA are supported | PM3-06 to PM3-08 |
| Register configuration can be drafted, analysed, and published | PM4-01 to PM4-05 |
| Register configuration can be imported/exported and templated | PM4-06 to PM4-11 |
| Custom fields support warnings, multi-select, calculated values, visibility, and lifecycle controls | PM5-01 to PM5-10 |
| Registers support custom scoring formulas and inherent/residual risk | PM6-01 to PM6-07 |
| Registers support advanced Risk IDs, states, and bulk edit | PM6-08 to PM6-10 |
| Risk Response Actions are managed as child records | PM7-01 to PM7-12 |
| Risk and action reviews support rules, outcomes, and attestation versions | PM8-01 to PM8-08 |
| Users receive in-app/email reminders and escalations | PM9-01 to PM9-09 |
| Risk and action data can be imported, exported, and templated | PM10-01 to PM10-10 |
| Saved views, dashboards, charts, reports, and scheduled reports exist | PM11-01 to PM11-08 |
| Evidence attachments are supported | PM12-01 to PM12-06 |
| API keys, webhooks, and integration docs are available | PM13-01 to PM13-07 |
| The platform is more observable, scalable, accessible, and compliance-ready | PM14-01 to PM14-09 |

---

## 21. Backlog Governance

Before starting a post-MVP implementation ticket:

1. Confirm whether the work changes the data model, permission model, audit model, or security model.
2. Update or create an ADR where the implementation changes the architecture beyond the MVP baseline.
3. Identify migration and backfill requirements for existing MVP data.
4. Identify whether the feature should be behind a feature flag.
5. Identify which user roles can access, configure, edit, export, or delete the new object/data.
6. Identify required audit events and field-level changes.
7. Identify whether field-level visibility applies.
8. Identify tests to add or update.

Before marking a post-MVP ticket complete:

1. Run relevant backend and frontend tests.
2. Confirm server-side permissions are enforced.
3. Confirm validation exists and produces standard error shapes.
4. Confirm audit events are created where required.
5. Confirm secrets and restricted fields do not appear in logs, audit, notifications, exports, webhooks, or API responses.
6. Confirm migrations preserve existing MVP data.
7. Update product, architecture, route, permission, audit, security, and data-model documents where implementation intentionally changes a documented decision.
