# Phase 1 — User Experience, Profile, and Preferences

**Status:** Done (closed v1.9.0)

Phase goal: deliver low-risk user-facing improvements that are broadly useful before deeper enterprise and workflow features.

## Phase Dependencies

### Must have before starting

- Completed MVP (v0.1.2) — auth system (`POST /auth/login`, JWT, `/auth/me` bootstrap) must exist.

### Recommended before starting

- Phase 0 — PM0-05 (`docs/planning/PM0-05-feature-flag-migration-toggles.md`) defines the feature flag pattern; PM0-02 (`docs/planning/PM0-02-data-model-extension.md`) defines how to add the `preferences` column safely.

### Can run in parallel with

Phases 2, 4, 7, 9, 10, and 12 can all start independently once Phase 0 is done.

### Unlocks

- Phase 9 (notifications) may build on the preference system for notification delivery preferences.

---

## PM1-01 — My Profile API

**Status:** Done (confirmed implemented and tested in v1.9.0)

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

**Status:** Done

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

**Status:** Done (deep merge confirmed implemented in v1.8.0)

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

**Status:** Done

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

**Status:** Done (React Query cache confirmed implemented; behavioral tests added in v1.9.0)

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
