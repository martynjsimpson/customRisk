# Domain rules

Invariant, cross-cutting rules that implementers must not violate. These are architectural
constraints, not implementation details — any change to them is a decision to be recorded
(via an ADR), not a routine edit.

Extracted 2026-07-27 from `.claude/agents/backend-developer.md` and
`.claude/agents/principal-architect.md` during `/work-init` adoption, consolidated and
deduplicated. Content is preserved close to the original wording.

## Data model

- The Prisma schema (`backend/prisma/schema.prisma`) is the canonical data model. Get
  Principal Architect sign-off before changing it.
- Prisma migrations are the only permitted schema change mechanism — no manual SQL.
- All primary keys are UUIDs (`gen_random_uuid()`).
- All timestamps stored in UTC.
- Soft deactivation preferred over hard deletion for config entities (fields, likelihood
  values, etc.).
- Consult `docs/architecture/data-model.md` for data model and schema extension guidance.

## API conventions

- API base path: `/api/v1/`. Breaking changes require a new path version (`/api/v2/`).
- Success response envelope: `{ data: {}, meta: {} }` — include `meta` for paginated
  responses.
- Error response envelope: `{ error: { code, message, fields } }` — use standard error
  codes from `docs/architecture/api-standards.md`.
- Routes are named after resources, not actions. Use HTTP verbs consistently.
- Non-CRUD actions use sub-resource patterns (e.g. `POST /risks/:riskId/reviews`).
- Never return stack traces in API error responses.
- Use `404` for both genuine not-found and permission-denied-existence cases where
  revealing resource existence would be inappropriate.

## Permissions

- Permissions are enforced in the backend. Never rely on the UI to gate access.
- Consult `docs/architecture/permission-model.md` before implementing any route that
  involves access control.
- Permissions are additive — a user receives the highest effective permission through
  system-level, register-level, or ownership-derived rules.

## Audit

- Every significant state change must create an audit event. This is a first-class product
  capability.
- Consult `docs/architecture/audit-model.md` for event structure: who, when, what, where.
- Audit logs must be immutable. Do not implement audit as a retrofit.
- Capture before/after values for field changes. Preserve full snapshots for hard
  deletions.

## Security

- Consult `docs/architecture/security-model.md` before touching authentication, tokens, or
  passwords.
- Never store or log plain-text passwords.
- Never commit secrets or connection strings. Never hardcode secrets in workflow files —
  use GitHub Actions secrets (`${{ secrets.* }}`).
- CORS origins must be explicitly configured — no wildcards in production.
- Apply rate limiting to login and refresh endpoints.
