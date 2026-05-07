# Post-MVP API Versioning and Compatibility Review

**Ticket:** PM0-03  
**Version:** 1.0  
**Date:** 2026-05-07  
**Status:** Approved  
**Related documents:** API Route Map v1.0, Technical Architecture v1.0, PM0-01 Scope Baseline, Post-MVP Implementation Backlog v1.0

---

## 1. Purpose

This document records how post-MVP API routes and breaking changes will be introduced. It does not repeat the MVP route inventory (see `docs/architecture/api-route-map.md`); it defines the conventions and rules that govern post-MVP route additions.

---

## 2. Decision: Stay on `/api/v1`

**Decision:** Post-MVP routes continue under `/api/v1`. No new version prefix is introduced during Phases 1–14.

**Rationale:**

- The product is a self-hosted, single-tenant application. Consumers of the API are the bundled React frontend and, in Phase 13, operator-created API keys. There are no third-party integrations requiring long-running parallel version support.
- Introducing `/api/v2` would require maintaining two parallel route surfaces and create migration complexity that provides no real benefit to the current consumer profile.
- When a breaking change is genuinely required, it will be introduced in a minor release with a documented migration note, not by creating a parallel version namespace.

**Constraint:** This decision is reviewed if Phase 13 (External APIs and Webhooks) surfaces contractual stability requirements that require a versioned public API surface. An ADR will be created at that point.

---

## 3. Route Namespace Conventions for Post-MVP Areas

The following top-level namespaces are reserved for post-MVP phases. They must not be added to the implementation until the relevant phase ticket is active.

| Namespace | Phase | Ticket(s) | Notes |
|---|---|---|---|
| `/api/v1/users/me/preferences` | Phase 1 | PM1-03 | Preference read/write for authenticated user |
| `/api/v1/users/me` | Phase 1 | PM1-01 | Own name and password change (patch on existing user resource) |
| `/api/v1/persons` | Phase 2 | PM2-01 | Person reference lookup and management |
| `/api/v1/auth/saml/*` | Phase 3 | PM3-01–03 | SAML SP endpoints |
| `/api/v1/auth/password-reset` | Phase 3 | PM3-06 | Password reset flow |
| `/api/v1/admin/auth-providers` | Phase 3 | PM3-05 | SAML provider admin |
| `/api/v1/admin/smtp` | Phase 9 | PM9-02–03 | SMTP admin |
| `/api/v1/registers/:id/configuration-versions` | Phase 4 | PM4-01–05 | Draft/publish config versioning |
| `/api/v1/templates` | Phase 4 | PM4-08–11 | Global register templates |
| `/api/v1/risk-response-actions` | Phase 7 | PM7-01–12 | Child-record response actions |
| `/api/v1/registers/:id/risks/:id/actions` | Phase 7 | PM7-01 | Risk-scoped action routes |
| `/api/v1/notifications` | Phase 9 | PM9-04 | In-app notification centre |
| `/api/v1/imports` | Phase 10 | PM10-01 | CSV import wizard |
| `/api/v1/reports/*` | Phase 11 | PM11-01–08 | Saved views, advanced reporting |
| `/api/v1/attachments` | Phase 12 | PM12-01 | File attachment resources |
| `/api/v1/admin/api-keys` | Phase 13 | PM13-02 | API key management |
| `/api/v1/webhooks` | Phase 13 | PM13-06 | Webhook admin and delivery |

Route names follow existing resource-oriented conventions:
- plural nouns for collections (`/risks`, `/actions`, `/attachments`);
- kebab-case for multi-word segments (`/risk-response-actions`, `/api-keys`, `/password-reset`);
- `:id` for UUID path parameters;
- sub-resources nested under their parent only when the sub-resource is not queryable independently.

---

## 4. Existing MVP Routes — Backward Compatibility Rules

**Rule 1 — No silent removals.** Existing MVP routes (`/auth`, `/users`, `/registers`, `/risks`, `/audit`) must not be removed or have required fields removed from responses in post-MVP phases. If a field must be removed, add a deprecation note to the API route map for one release before removing it.

**Rule 2 — Additive changes are safe.** Adding optional request fields, adding new response fields, adding new filter parameters, and adding new endpoints are all backward compatible. The frontend and any future API clients must be written to ignore unknown response fields.

**Rule 3 — Enum extensions are forward-declared in PM0-02.** New enum values (e.g. for `AuditObjectType`, `CustomFieldType`) require a coordinated Prisma migration. They are catalogued in `docs/planning/PM0-02-data-model-extension.md` before the phase that needs them.

**Rule 4 — No breaking query parameter renames.** If a query parameter name must change (e.g. sorting or pagination), support both old and new names for at least one release.

**Rule 5 — Content negotiation is not used.** The API does not use `Accept` headers to version responses. All clients receive the current response shape.

---

## 5. Frontend API Client Versioning Approach

The frontend uses per-feature API modules in `frontend/src/api/`. Each module wraps a specific resource area.

**Rules for post-MVP API modules:**

- New resource areas (actions, preferences, notifications, etc.) each get a dedicated API module file.
- Shared types (generic response wrappers, pagination shapes, error shapes) remain in `frontend/src/api/types.ts` and are imported from there — not redeclared.
- Type unions defined in one API module must not be inlined or redeclared in another; import the existing type instead.
- No runtime version negotiation is needed while the single `/api/v1` surface is stable.
- When a route shape changes between releases, update the API module in the same PR as the backend change. Do not leave the frontend module pointing at a stale shape.

---

## 6. Error Code Extension Rules

The MVP defines these standard error codes in the API Route Map (section 2.6):

| Code | HTTP status |
|---|---|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHENTICATED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `UNPROCESSABLE` | 422 |
| `RATE_LIMITED` | 429 |
| `INTERNAL_ERROR` | 500 |

**Rules for new error codes:**

- Prefer the existing generic codes where they are sufficient. Introduce a new code only when the frontend needs to branch on the specific failure reason.
- New codes use `SCREAMING_SNAKE_CASE` and are documented in the API route map at the same time they are implemented.
- New codes must map to one of the existing HTTP status codes above; do not introduce new HTTP status codes.
- Phase-specific codes are listed in the relevant phase ticket. Examples of anticipated additions:
  - `SAML_CONFIGURATION_INVALID` (Phase 3)
  - `IMPORT_VALIDATION_FAILED` (Phase 10)
  - `FORMULA_PARSE_ERROR` (Phase 6)
  - `ATTACHMENT_TOO_LARGE` / `ATTACHMENT_TYPE_REJECTED` (Phase 12)
  - `WEBHOOK_DELIVERY_FAILED` (Phase 13)

---

## 7. Authentication Header Extension — API Keys

MVP routes accept browser-session JWT access tokens only (`Authorization: Bearer <access_token>`).

Phase 13 (PM13-01) adds API key authentication. The bearer token will remain the default shape; API keys will be distinguished by prefix (e.g. `cr_` prefix) rather than by a separate header or authentication scheme. The `GET /auth/me` endpoint will return the authenticated entity type (`session` or `api_key`) in Phase 13.

Until Phase 13 is active, the following still applies from the API Route Map:

> API keys and external integration authentication are deferred to post-MVP. MVP protected routes accept browser-session access tokens only.

---

## 8. Response Pagination and Sorting — Post-MVP Invariants

MVP uses offset pagination (`?page=1&pageSize=25`) and `?sortBy=fieldName&sortDir=asc` sorting. Post-MVP phases must continue using these conventions on all new list endpoints unless:

- the resource is genuinely unbounded and requires cursor-based pagination for correctness (document the exception in the relevant ticket);
- cursor pagination is introduced as an opt-in addition, not a replacement.

---

## 9. Document References

| Document | Location |
|---|---|
| API Route Map v1.0 | `docs/architecture/api-route-map.md` |
| Technical Architecture v1.0 | `docs/architecture/technical-architecture.md` |
| Post-MVP Scope Baseline v1.0 | `docs/planning/PM0-01-scope-baseline.md` |
| Post-MVP Data Model Extension Plan v1.0 | `docs/planning/PM0-02-data-model-extension.md` |
| Post-MVP Implementation Backlog v1.0 | `docs/planning/post-mvp-backlog.md` |
