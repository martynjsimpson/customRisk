# Custom Risk — AI Build Instructions

**Version:** 2.0  
**Date:** 2026-05-07  
**Status:** Active  
**Applies to:** Post-MVP implementation (MVP complete at v0.1.2)

---

## 1. Purpose

This document tells AI coding sessions how to use the Custom Risk documentation set without duplicating it.

It is not the source of truth for product scope, technical stack, API routes, schema, permissions, audit, or security. It is a routing and governance guide for implementation work.

Post-MVP implementation scope is defined by `docs/planning/post-mvp-backlog.md`. Ticket IDs use `PM{phase}-{number}` format. Do not implement PM-prefixed features unless they are the active ticket for the session.

---

## 2. Source-of-Truth Map

Use the following documents as authoritative:

| Topic | Authoritative document |
|---|---|
| Long-term product intent | `docs/product/prd.md` |
| MVP scope and exclusions (archived) | `docs/planning/archive/mvp-scope.md` |
| MVP user-facing behaviour, screens, acceptance criteria (archived) | `docs/planning/archive/mvp-functional-spec.md` |
| Data model: modelling principles, ER overview, calculation rules, transaction boundaries | `docs/architecture/data-model.md` |
| Post-MVP scope baseline and PRD-to-phase map | `docs/planning/PM0-01-scope-baseline.md` |
| Post-MVP data model extension plan | `docs/planning/PM0-02-data-model-extension.md` |
| Post-MVP API versioning and compatibility rules | `docs/planning/PM0-03-api-versioning-compatibility.md` |
| Post-MVP audit and permission extension plan | `docs/planning/PM0-04-audit-permission-extension.md` |
| Post-MVP feature flag and migration toggle plan | `docs/planning/PM0-05-feature-flag-migration-toggles.md` |
| Post-MVP backlog index, sequencing, and acceptance mapping | `docs/planning/post-mvp-backlog.md` |
| Post-MVP phase tickets (one file per phase) | `docs/planning/phases/phase-NN-*.md` |
| Runtime, frameworks, deployment, repo structure | `docs/architecture/technical-architecture.md` |
| API conventions: response shapes, error codes, pagination, sorting, route design | `docs/architecture/api-standards.md` |
| Current implemented REST routes and example requests | `docs/postman/` |
| Permission rules and effective access | `docs/architecture/permission-model.md` |
| Audit event model and audit access | `docs/architecture/audit-model.md` |
| Authentication, sessions, passwords, tokens, CORS, secrets | `docs/architecture/security-model.md` |
| Canonical Prisma schema | `backend/prisma/schema.prisma` |

If this document appears to conflict with an authoritative document, use the authoritative document and update this file only if the guidance itself is wrong.

---

## 3. Precedence Rules

When documents overlap, use this order:

1. Post-MVP backlog and PM-prefixed scope docs for what is in or out.
2. MVP Functional Specification for existing user-facing behaviour.
3. Architecture documents for implementation contracts.
4. Data Model (`docs/architecture/data-model.md`) and PM0-02 extension plan for data rules and transactions.
5. PRD for long-term intent only where other documents are silent.
6. Current codebase for implementation state.

Do not use the PRD to pull unapproved post-MVP capabilities into a session.

---

## 4. AI Operating Rules

Before starting an implementation task:

1. Identify the relevant PM-prefixed backlog ticket.
2. Read the source documents listed for that topic in section 2.
3. Confirm the task does not require features not yet phased or deliberately non-goal (see PM0-01).
4. Identify required permission checks from `permission-model.md`.
5. Identify required audit events from `audit-model.md` and check the Postman collection for current route behavior if the task changes an existing endpoint.
6. Identify relevant security rules from `security-model.md`.
7. Identify schema additions or backfill requirements from `PM0-02-data-model-extension.md`.
8. Identify tests required by the backlog ticket.

While implementing:

- prefer existing project patterns over new abstractions;
- keep changes scoped to the ticket;
- enforce permissions in the backend, not only the UI;
- when the work is identified as needing a feature flag (post-mvp-backlog step 6), apply the full PM0-05 pattern: (1) add the flag key to `backend/src/config/featureFlags.ts`; (2) add the matching boolean field to `EnabledFeatures` in `frontend/src/auth/session.tsx` and to the `allOff` constant in `frontend/src/hooks/useFeatureFlags.ts` — these are not derived automatically and must be kept in sync; (3) apply `requireFeature` middleware to every new backend route group in `backend/src/routes/index.ts`; (4) guard frontend nav links and routes with `useFeatureFlags()` from `frontend/src/hooks/useFeatureFlags.ts`; (5) add the `FEATURE_*=false` entry with a phase comment to `.env.local.example`;
- validate request bodies and query parameters server-side;
- write audit events where required;
- when creating or changing frontend UI that calls the backend, display API errors to the user using the app's shared error display pattern, including field-level validation messages where the API returns them;
- avoid committing secrets or logging sensitive values;
- do not introduce a new framework, major library, or architectural pattern without approval;
- before defining any new type, interface, constant, or enumeration in the frontend, search the existing codebase for an equivalent — if one exists, import it rather than redefining it;
- before using a Mantine component for the first time in a file, check `frontend/src/main.tsx` for theme `defaultProps` that already set the correct variant or size — do not repeat props that are already the default;
- for context-specific patterns not covered by theme defaults (for example, table row action buttons use `variant="subtle" size="xs"`), check how the same component is used in nearby tables or panels and match that pattern exactly;
- Mantine form input defaults in `frontend/src/main.tsx` include password-manager ignore attributes for app data-entry fields, so Bitwarden and similar clients do not mistake user pickers, owner filters, or admin-created password fields for the active login form;
- the login page is the exception: its username and password fields must explicitly use credential autocomplete tokens (`username` and `current-password`) and remove the password-manager ignore attributes so password managers only target the actual login fields;
- shared API types (generic response wrappers, pagination shapes, etc.) belong in `frontend/src/api/types.ts` and must be imported from there by all API modules;
- type unions that are defined in one API module must not be inlined or redeclared in another — import the existing type instead;
- lists of domain values used in more than one component (field enumerations, status options, ordered field lists, etc.) must be extracted to a single shared constant and imported wherever needed.

Before finishing:

- run `npx tsc --noEmit` in `frontend/` and confirm zero type errors;
- run `npm test --workspaces --if-present` from the repo root and confirm all tests pass;
- if either check fails, fix the code or tests before committing — do not commit a broken state;
- confirm the task did not add out-of-scope or unapproved features;
- update docs if implementation intentionally changes a documented decision;
- summarize changed files and verification.

---

## 5. Stop-and-Ask Triggers

Stop and ask for clarification before implementing when:

- the requested feature is not in the active PM ticket or is a non-goal per PM0-01;
- the request changes security, audit, permission, schema, or token behaviour in ways not covered by the PM ticket;
- the request requires a new major dependency or framework;
- the request would alter the Prisma schema in a way not covered by PM0-02;
- the permission model is ambiguous for the requested workflow;
- the audit requirement conflicts with secret-redaction or privacy rules;
- a route would reveal hidden resource existence;
- a feature requires background jobs, email delivery, SMTP credentials, or external integrations not covered by the active ticket.

---

## 6. Documentation Hygiene

Avoid copying long lists from authoritative docs into planning or prompt docs.

Use references instead:

- refer to `prd.md` for long-term product intent;
- refer to `docs/planning/archive/mvp-scope.md` for MVP exclusions instead of repeating the full exclusion list;
- refer to `technical-architecture.md` for stack details instead of repeating library versions;
- refer to `docs/postman/` for current routes instead of copying route inventories;
- refer to `api-standards.md` for API-wide conventions instead of repeating response and error-shape rules;
- refer to `permission-model.md`, `audit-model.md`, and `security-model.md` for policy details;
- refer to `docs/architecture/data-model.md` and `PM0-02-data-model-extension.md` for data rules.

Short summaries are acceptable when they help the reader understand a ticket, but the detailed rule should live in only one authoritative document.

---

## 7. Done Criteria for AI Build Tasks

A task is done when:

- implementation matches the relevant authoritative documents;
- server-side validation is present;
- backend permissions are enforced;
- audit events are created where required;
- required transactions protect related writes;
- tests cover the main happy path and important failure paths;
- frontend UI, if included, is role-aware and handles loading/error/empty states;
- no out-of-scope feature was introduced;
- docs are updated if implementation intentionally changed a documented decision.
