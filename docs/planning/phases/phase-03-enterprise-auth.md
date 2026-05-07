# Phase 3 — Enterprise Authentication and Account Recovery

**Status:** Planned

Phase goal: add enterprise authentication and stronger account recovery/security features without weakening MVP local-auth controls.

## Phase Dependencies

### Must have before starting

- Phase 0 — PM0-04 (`docs/planning/PM0-04-audit-permission-extension.md`) defines SAML audit events and password reset audit events.
- Phase 2 strongly recommended — SAML JIT provisioning (PM3-04) relies on the person reference model introduced in Phase 2.

### Recommended before starting

- Phase 9 (SMTP) before PM3-06 Password Reset — password reset requires outbound email. If Phase 9 ships after Phase 3, PM3-06 must either defer or implement a minimal standalone mail path.

### Can run in parallel with

Phases 4, 7, 10, and 12 can run at the same time. Phase 9 is a soft dependency for PM3-06 specifically.

### Unlocks

- Enterprise SSO, MFA-protected accounts, and email-based account recovery.

> **Note:** PM3-06 (password reset) requires outbound email. Coordinate timing with Phase 9.

---

## PM3-01 — Authentication Provider Data Model

**Status:** Planned

**Goal:** Model multiple authentication methods for users.

**Dependencies:** PM0-02 (`docs/planning/PM0-02-data-model-extension.md`); PM2-01 recommended.

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

**Status:** Planned

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

**Status:** Planned

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

**Status:** Planned

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

**Status:** Planned

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

**Status:** Planned

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

**Status:** Planned

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

**Status:** Planned

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
