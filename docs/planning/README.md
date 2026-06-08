# Planning Docs — Structure Guide

This directory now has two layers:

1. verified planning docs that answer "what is actually left?";
2. original phase docs that preserve the ticket-level intent and dependency detail.

Start with [post-mvp-backlog.md](post-mvp-backlog.md). It is the verified master index based on the current codebase, not just the historic document statuses.

---

## Verified remaining-work docs

These are the best entry points when deciding what to work on next:

- [post-mvp-backlog.md](post-mvp-backlog.md) — verified master index and recommended execution order
- [groups/group-01-finish-started-work.md](groups/group-01-finish-started-work.md) — gaps in already-shipped phases
- [groups/group-02-auth-fields-and-scoring.md](groups/group-02-auth-fields-and-scoring.md) — enterprise auth, advanced fields, scoring
- [groups/group-03-actions-reviews-and-notifications.md](groups/group-03-actions-reviews-and-notifications.md) — child actions, advanced reviews, notifications
- [groups/group-04-portability-reporting-and-integrations.md](groups/group-04-portability-reporting-and-integrations.md) — import/export, reporting, attachments, integrations

---

## `PM0-*.md` — Governance references

These remain the governing design references for post-MVP work:

| File | Purpose |
|---|---|
| `PM0-01-scope-baseline.md` | Maps PRD capabilities and non-goals to post-MVP phases |
| `PM0-02-data-model-extension.md` | Safe schema-extension and migration sequencing rules |
| `PM0-03-api-versioning-compatibility.md` | API versioning and route-extension rules |
| `PM0-04-audit-permission-extension.md` | Audit and permission extension rules |
| `PM0-05-feature-flag-migration-toggles.md` | Feature flag and staged rollout pattern |

They are not "what next?" docs, but they are still active references when implementing remaining work.

---

## `phases/phase-NN-*.md` — Original ticket detail

These files still hold the detailed phase-by-phase ticket definitions. Some status markers in them have now been corrected where verification was conclusive, but the new grouped docs are the primary source for prioritisation.

Use the phase files when you need the original acceptance criteria for a specific ticket.

---

## Non-planning notes

- `ai-build-instructions.md` — AI build-agent instructions
- `config-write-api-deprecation-note.md` — working note
- `openapi-swagger-ui-future-consideration.md` — working note
