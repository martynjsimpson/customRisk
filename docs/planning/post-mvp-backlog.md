# Custom Risk — Verified Post-MVP Work Index

**Version:** 2.0  
**Date:** 2026-06-08  
**Status:** Active  
**Applies to:** Verified remaining post-MVP work after code audit  
**Related documents:** PRD v3.2, planning phase docs, PM0 governance docs

---

## 1. Purpose

This document is the master index for what is still left to do after comparing the planning docs with the current codebase.

It is intentionally not a restatement of historic ticket statuses. A ticket marked `Done` in an older phase doc was re-checked against code before being treated as delivered here.

Use this file first. Use the grouped docs for execution planning. Use the original phase files when you need the older ticket wording and acceptance criteria.

---

## 2. Recommended Reading Order

1. [groups/group-01-finish-started-work.md](groups/group-01-finish-started-work.md)
2. [groups/group-02-auth-fields-and-scoring.md](groups/group-02-auth-fields-and-scoring.md)
3. [groups/group-03-actions-reviews-and-notifications.md](groups/group-03-actions-reviews-and-notifications.md)
4. [groups/group-04-portability-reporting-and-integrations.md](groups/group-04-portability-reporting-and-integrations.md)

---

## 3. Verified Phase Snapshot

| Phase | Theme | Verified status | What the code says now |
|---:|---|---|---|
| 0 | Post-MVP Baseline and Design Controls | Reference set | Governance docs remain useful reference material rather than active remaining work |
| 1 | User Experience, Profile, and Preferences | Mixed | Mostly shipped; remaining gaps in session preservation and bootstrap behavior. Preference merge depth gap closed in v1.8.0 (PM1-03). |
| 2 | Person Identity Expansion | Mixed | Person reference model shipped; email-only risk ownership routes through PersonReference end-to-end (PM2-01, PM2-02 closed in v1.8.0). Permission flow (role/policy side) remains open. |
| 3 | Enterprise Authentication and Account Recovery | Not started | Only a SAML feature-flag placeholder exists |
| 4 | Configuration Lifecycle and Templates | Mostly shipped | Drafts, publish, import/export, templates, compare/apply flows exist and are feature-complete enough to treat this as near-done |
| 5 | Advanced Field Model | Early foundation only | Custom-field lifecycle basics exist; major advanced field capabilities are absent |
| 6 | Advanced Scoring and Risk Methodologies | Early foundation only | Current scoring/risk ID/state features exist; formula engine, inherent/residual risk, and bulk edit do not |
| 7 | Child-Record Risk Response Actions | Not started | App still uses a simple response-action field rather than child records |
| 8 | Risk Response Reviews and Advanced Review Rules | MVP foundations only | Review frequency, dates, comments, and attestation snapshotting exist; advanced rule model does not |
| 9 | Notifications and SMTP | Not started | No notification model or delivery system beyond feature flags and due/overdue logic |
| 10 | Import, Export, and Data Portability | Partial | Config JSON import/export plus risk/audit CSV export exist; CSV import workflow does not |
| 11 | Reporting, Saved Views, and Dashboards | Partial | Dashboards and column persistence exist; saved views, charts, report builder, and schedules do not |
| 12 | Attachments and Evidence | Decision only | Storage direction is documented, but product implementation is not present |
| 13 | APIs, Webhooks, and Integration Admin | Scaffold only | API key table exists, but auth path, UI, and webhooks are absent |
| 14 | Operational Hardening, Accessibility, Scale, and Compliance | Mixed | Observability and tracing are shipped; most later hardening work remains open |

---

## 4. Best Next Work

If the goal is to make the roadmap easier to act on, this is the best execution order:

1. Finish already-started work: [Group 1](groups/group-01-finish-started-work.md)
2. Build the missing field/scoring foundations: [Group 2](groups/group-02-auth-fields-and-scoring.md)
3. Add child actions, then advanced reviews, then notifications: [Group 3](groups/group-03-actions-reviews-and-notifications.md)
4. Build portability, reporting, attachments, and integrations on top of those foundations: [Group 4](groups/group-04-portability-reporting-and-integrations.md)

---

## 5. Key Audit Findings

- The backlog was materially out of date in both directions: some "done" work is incomplete, and some "planned" work is already live.
- The strongest already-shipped post-MVP area is Phase 4.
- The strongest shipped hardening area is Phase 14 observability and tracing.
- The biggest still-missing workflow chain is Phase 7 → Phase 8 → Phase 9.
- The biggest structural dependency for later roadmap items is still Phase 5 → Phase 6.

---

## 6. Documents Kept vs Moved

- The existing `archive/` folder was left untouched.
- No additional planning documents were moved to `archive/` in this pass because every active implementation-phase document checked here still contains either remaining work, mixed status, or active reference value.
- The cleanup instead introduces grouped remaining-work docs so the planning directory answers "what next?" without discarding the original ticket detail.

---

## 7. Original Detail Still Lives Here

- Original phase docs: `docs/planning/phases/`
- Governance references: `docs/planning/PM0-*.md`
- Working notes: `docs/planning/config-write-api-deprecation-note.md`, `docs/planning/openapi-swagger-ui-future-consideration.md`
