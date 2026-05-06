# Custom Risk - Phase 6 Acceptance Checklist

**Status:** P6-07 acceptance scenario checklist

This checklist maps the MVP acceptance scenarios to implemented routes, services, and frontend surfaces. It does not add product scope beyond `docs/product/MVP_Scope.md`.

| Scenario | Acceptance evidence |
|---|---|
| System Admin creates register | `POST /api/v1/registers` is System Admin-only, creates default configuration, and the Registers page exposes Create register only to System Admins. |
| Register Admin configures field | Custom field routes require register management, write audit events, and the register Configuration > Fields tab exposes add/edit/deactivate controls. |
| Register Admin configures matrix | Matrix routes require register management, audit matrix changes, optionally recalculate affected risks, and the Configuration > Scoring > Matrix tab exposes Save matrix. |
| Register Admin creates risk | Risk create route allows System Admin/Register Admin, resolves scoring from matrix, calculates next review date, and writes `RISK_CREATED`; the Risks tab exposes Add risk only to managers. |
| Risk Owner reviews risk | Review routes use risk edit access, create review history, update last/next review values, and write review audit events; owned rows expose Review/Edit actions. |
| Register Viewer views register read-only | Register Viewer can view assigned registers/risks, export only when allowed, and does not see management/configuration/create/delete actions. |
| Closed risks hidden by default | Risk list query defaults `includeClosed` to false and the service excludes `CLOSED` risks unless explicitly included. |

## Scope Confirmation

- No excluded MVP capabilities were added: imports, templates, unresolved owner emails, action child records, workflow engines, email delivery, integrations, MFA, or advanced reporting remain out of scope.
- P6-07 verification is covered by static acceptance tests in backend and frontend test suites, plus the standard TypeScript and workspace test gates.
