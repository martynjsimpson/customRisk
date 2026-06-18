# Active Release

Status: released
Version: v1.9.0
Release type: product release
Released: 2026-06-17

## What shipped

- **PM11-01** — Personal saved views (SavedView schema, backend routes under `/api/v1/registers/:id/saved-views`, `SavedViewsPanel.tsx`, frontend API client, backend + frontend tests). Feature-flagged: `FEATURE_SAVED_VIEWS`.
- **PM13-01** — API key management baseline (ApiKey schema, admin routes at `/api/v1/admin/api-keys`, user self-service at `/api/v1/users/me/api-keys`, `ApiKeysPage.tsx`, backend + frontend tests). Feature-flagged: `FEATURE_API_KEYS`.
- **PM10-10** — Audit log CSV export (audit controller with `Content-Disposition` CSV response, `AUDIT_EXPORT_GENERATED` event). Part of PM10-CORE scope; broader portability work remains.
- **PM2-05** — Email-only owner access permission fix (risks.service.ts permission logic). Part of PM2-05A scope; admin UI and audit gap work remains.
- **PM1-01 / PM1-05** — Password change preserves active session; preference updates propagate immediately. Covered by PM1-CLOSEOUT (already done).
- **Infra** — CI pipeline now runs on `release/*` branches. Node 22 aligned across `.nvmrc`, Dockerfile, and CI.
- **Docs** — ADR-0009 (API key scope and saved-view data model decisions).

## Decisions resolved

- Feature flags (`FEATURE_SAVED_VIEWS`, `FEATURE_API_KEYS`) default to `false` in `.env.local.example` — operators opt in per deployment.
- `engines.node` constraint remains `>=20.19`; Node 22 is the active toolchain but the package constraint is not tightened.
- PM13-03 (API key authentication hardening) remains deferred post-v1.9.0.

## Sign-off

- Scope approval: done
- Implementation complete: done
- Regression test pass: done
- Documentation pass: done
- Release sign-off: done — PR #96 merged, tag v1.9.0 created

## Recommended follow-on candidates

### Candidate A — Close adjacent security and audit gaps
- PM13-03 — Harden API key authentication and deactivated-user enforcement
- PM2-05A — Close remaining person-assignment admin UI and audit gaps

### Candidate B — Finish the advanced field foundation
- PM5-CORE — Finish the advanced custom-field model

### Candidate C — Start the workflow expansion chain
- PM7-CORE — Introduce child-record response actions
- PM8-CORE — Extend MVP reviews into rule-driven review workflows

---
*PM: when you open this file at the start of a planning session, update backlog.yml and requests.md with the completion metadata above, then reset this file to status: none.*
