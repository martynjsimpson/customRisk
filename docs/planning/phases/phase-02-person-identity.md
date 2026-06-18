# Phase 2 — Person Identity Expansion

**Status:** Mostly done (PM2-01 through PM2-05 confirmed implemented and tested in v1.9.0; PM2-05 admin/audit-view deliverables remain open)

Phase goal: move beyond MVP local-user-only person assignment and support unresolved email assignment, later linking, and richer person-picker behaviour.

## Phase Dependencies

### Must have before starting

- Phase 0 — PM0-02 (`docs/planning/PM0-02-data-model-extension.md`) defines how to safely extend the user/person model.

### Recommended before starting

- Complete Phase 2 before Phase 3 — SAML JIT provisioning (PM3-04) links incoming SAML users to person references. Without Phase 2, JIT-provisioned users cannot be matched to existing unresolved email assignments.

### Can run in parallel with

Phases 1, 4, 7, 9, 10, and 12 can run at the same time.

### Unlocks

- Phase 3 (PM3-04 SAML user linking works correctly when person references already exist).
- Email-only risk owner and custom field person-picker assignments throughout the product.

---

## PM2-01 — Person Reference Data Model

**Status:** Done

**Goal:** Establish a person reference model that can represent local users, external-auth users, and unresolved email addresses.

**Dependencies:** PM0-02 (`docs/planning/PM0-02-data-model-extension.md`); MVP user and custom field models.

**Deliverables:**

- schema migration for person references where needed;
- normalised email storage rules;
- linking strategy between person references and users;
- backfill from existing Risk Owner and Person Picker values.

**Acceptance criteria:**

- existing MVP user-backed assignments remain valid;
- unresolved email values can be stored without creating user accounts;
- duplicate person records for the same normalised email are prevented or merged safely.

**Notes:**

The person reference storage design is resolved — use the normalised `person_reference` table approach. See `docs/decisions/ADR-0005-person-reference-model.md`. The PM0-02 Phase 2 section contains the schema additions and backfill requirements.

Summary of the decision:

- A new `PersonReference` table is the canonical representation of any person (resolved user, unresolved email, future SAML/external user). It has a unique `email` field, a nullable `userId` FK that is populated once a matching account exists, and a nullable `displayName` for unresolved entries.
- `risk` gains `ownerPersonId` (nullable FK → `PersonReference`). The existing `ownerUserId` is **not removed** — MVP records keep it as their authoritative field. New Phase 2+ assignments use `ownerPersonId`.
- `risk_custom_field_value` gains `personId` (nullable FK → `PersonReference`). Existing `personUserId` and `personEmail` columns are retained and deprecated in place.
- **Service layer rule:** prefer `ownerPersonId` / `personId` when set; fall back to `ownerUserId` / `personUserId` for unbackfilled MVP records.
- **Backfill:** for every user currently referenced in `owner_user_id` or `person_user_id`, create a `PersonReference` row and populate the new FK columns. Single-pass, low volume.
- Phase 3 SAML linking (PM3-04) and Phase 7 Risk Response Owner (PM7-04) reuse the same `PersonReference` FK pattern.

## PM2-02 — Email-Only Person Picker Backend Support

**Status:** Done (confirmed implemented in v1.8.0 — risks.service.ts resolves ownerEmail via resolvePersonInput; Risk Owner design decision: email-only is supported)

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

**Status:** Done

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

**Status:** Done

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

**Status:** Partially done (edit guard confirmed implemented and tested in v1.9.0 — canEditRisk checks ownerPerson.userId; admin data-quality views and full audit event coverage remain open)

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
