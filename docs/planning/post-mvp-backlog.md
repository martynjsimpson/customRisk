# Custom Risk — Post-MVP Implementation Backlog

**Version:** 1.1  
**Date:** 2026-05-07  
**Status:** Active  
**Applies to:** Post-MVP implementation after completion of MVP backlog (v0.1.2)  
**Related documents:** PRD v3.2, MVP Scope v1.2, Technical Architecture v1.0, API Route Map v1.0, Permission Model v1.0, Audit Model v1.0, Security Model v1.0

---

## 1. Purpose

This document is the master index for the post-MVP implementation backlog. Each phase has its own file in `docs/planning/phases/` containing the full ticket list and a dependency preamble that tells you what must be done first and what can run in parallel.

Use this index for release planning and dependency reasoning. Use the phase files for implementation work.

---

## 2. Ticket Format

Each ticket includes:

- **Status:** Done or Planned.
- **Goal:** the implementation outcome.
- **Dependencies:** earlier tickets or documents required first.
- **Deliverables:** concrete code, configuration, test, or documentation outputs.
- **Acceptance criteria:** observable completion checks.
- **Notes:** implementation constraints or high-risk details.

Ticket IDs use the format `PM{phase}-{number}` (e.g. `PM3-02`).

---

## 3. Phase Index

| Phase | Theme | Status | Tickets | File |
|---:|---|---|---|---|
| 0 | Post-MVP Baseline and Design Controls | Done | PM0-01 to PM0-05 | [phase-00-baseline.md](phases/phase-00-baseline.md) |
| 1 | User Experience, Profile, and Preferences | Planned | PM1-01 to PM1-05 | [phase-01-profile-preferences.md](phases/phase-01-profile-preferences.md) |
| 2 | Person Identity Expansion | Planned | PM2-01 to PM2-05 | [phase-02-person-identity.md](phases/phase-02-person-identity.md) |
| 3 | Enterprise Authentication and Account Recovery | Planned | PM3-01 to PM3-08 | [phase-03-enterprise-auth.md](phases/phase-03-enterprise-auth.md) |
| 4 | Configuration Lifecycle and Templates | Planned | PM4-01 to PM4-11 | [phase-04-config-lifecycle.md](phases/phase-04-config-lifecycle.md) |
| 5 | Advanced Field Model | Planned | PM5-01 to PM5-10 | [phase-05-advanced-fields.md](phases/phase-05-advanced-fields.md) |
| 6 | Advanced Scoring and Risk Methodologies | Planned | PM6-01 to PM6-10 | [phase-06-scoring.md](phases/phase-06-scoring.md) |
| 7 | Child-Record Risk Response Actions | Planned | PM7-01 to PM7-12 | [phase-07-child-actions.md](phases/phase-07-child-actions.md) |
| 8 | Risk Response Reviews and Advanced Review Rules | Planned | PM8-01 to PM8-08 | [phase-08-response-reviews.md](phases/phase-08-response-reviews.md) |
| 9 | Notifications and SMTP | Planned | PM9-01 to PM9-09 | [phase-09-notifications.md](phases/phase-09-notifications.md) |
| 10 | Import, Export, and Data Portability | Planned | PM10-01 to PM10-10 | [phase-10-import-export.md](phases/phase-10-import-export.md) |
| 11 | Reporting, Saved Views, and Dashboards | Planned | PM11-01 to PM11-08 | [phase-11-reporting.md](phases/phase-11-reporting.md) |
| 12 | Attachments and Evidence | Planned | PM12-01 to PM12-06 | [phase-12-attachments.md](phases/phase-12-attachments.md) |
| 13 | APIs, Webhooks, and Integration Admin | Planned | PM13-01 to PM13-07 | [phase-13-api-webhooks.md](phases/phase-13-api-webhooks.md) |
| 14 | Operational Hardening, Accessibility, Scale, and Compliance | Planned | PM14-01 to PM14-09 | [phase-14-hardening.md](phases/phase-14-hardening.md) |

---

## 4. Sequencing and Parallelism Summary

The table below shows which phases can start independently once Phase 0 is complete, and which have hard prerequisites.

| Phase | Can start after | Hard blocks on |
|---:|---|---|
| 0 | MVP complete | — |
| 1 | Phase 0 (recommended) | Nothing |
| 2 | Phase 0 | Phase 3 (SAML JIT) works better with Phase 2 done first |
| 3 | Phase 0, Phase 2 recommended | PM3-06 needs outbound email (Phase 9) |
| 4 | Phase 0 | Phase 5, Phase 6, Phase 11 (recommended) |
| 5 | Phase 4 | Phase 6, Phase 11, Phase 13 |
| 6 | Phase 4, Phase 5 | — |
| 7 | Phase 0 | Phase 8, Phase 9 (action rules), Phase 10 (action import), Phase 12 (action attachments) |
| 8 | Phase 7 | Phase 9 (notification timing) |
| 9 | Phase 0 (basic in-app); Phase 7+8 for rules | Phase 14 (background jobs) |
| 10 | Phase 0 (risk-only); Phase 5–7 for full import | Phase 14 (background jobs) |
| 11 | Phase 5 | — |
| 12 | Phase 0 | — |
| 13 | Phase 5 | — |
| 14 | None (run in parallel) | — |

**Phases that can run in parallel from the start (after Phase 0):** 1, 2, 4, 7, 10 (risk-only), 12, 14.

**Critical path for the richest feature set:** 0 → 4 → 5 → 6 and 0 → 7 → 8 → 9 (these two chains can run in parallel with each other).

---

## 5. Cross-Phase Dependencies

- **Phase 0** should precede all major schema, permission, audit, and route expansion.
- **Phase 2** should precede Phase 3 — SAML JIT provisioning relies on the person reference model.
- **Phase 4** is a strong prerequisite for Phases 5, 6, advanced review rules, response-action mode migration, and templates.
- **Phase 5** underpins calculated fields, field-level visibility, multi-select fields, advanced imports, reports, and Risk Response Owner limited context.
- **Phase 6** depends on the Phase 5 formula engine; design the expression parser once to serve both.
- **Phase 7** is prerequisite for Phase 8 (action reviews), Phase 9 (action reminders/escalation), Phase 10 (action import/export), and Phase 12 (action attachments).
- **Phase 8** should be finalised before building Phase 9 notification timing rules.
- **Phase 9 SMTP** should be available before Phase 3 password reset if Phase 3 ships first.
- **Phase 10 (full import)** is more stable after Phases 5–7 are done to avoid column-mapping churn.
- **Phase 11** requires Phase 5 field visibility to prevent reports from becoming an access-control bypass.
- **Phase 13** should come after Phase 5 visibility and permission rules are mature for external consumers.
- **Phase 14** observability work should begin before Phase 9, 10, and 13 background jobs reach production.

---

## 6. Post-MVP Acceptance Mapping

| Product capability | Primary tickets |
|---|---|
| Users can manage own profile and preferences | PM1-01 to PM1-05 |
| Person Picker supports unresolved email values and later user linking | PM2-01 to PM2-05 |
| SAML / Entra ID authentication works | PM3-01 to PM3-05 |
| Password reset and MFA are supported | PM3-06 to PM3-08 |
| Register configuration can be drafted, analysed, and published | PM4-01 to PM4-05 |
| Register configuration can be imported/exported and templated | PM4-06 to PM4-11 |
| Custom fields support warnings, multi-select, calculated values, visibility, and lifecycle controls | PM5-01 to PM5-10 |
| Registers support custom scoring formulas and inherent/residual risk | PM6-01 to PM6-07 |
| Registers support advanced Risk IDs, states, and bulk edit | PM6-08 to PM6-10 |
| Risk Response Actions are managed as child records | PM7-01 to PM7-12 |
| Risk and action reviews support rules, outcomes, and attestation versions | PM8-01 to PM8-08 |
| Users receive in-app/email reminders and escalations | PM9-01 to PM9-09 |
| Risk and action data can be imported, exported, and templated | PM10-01 to PM10-10 |
| Saved views, dashboards, charts, reports, and scheduled reports exist | PM11-01 to PM11-08 |
| Evidence attachments are supported | PM12-01 to PM12-06 |
| API keys, webhooks, and integration docs are available | PM13-01 to PM13-07 |
| The platform is observable, scalable, accessible, and compliance-ready | PM14-01 to PM14-09 |

---

## 7. Backlog Governance

Before starting a post-MVP implementation ticket:

1. Read the phase file (`docs/planning/phases/phase-NN-*.md`) for the phase you are working on.
2. Read the PM0 governance docs referenced in that phase's dependency preamble.
3. Confirm whether the work changes the data model, permission model, audit model, or security model.
4. Update or create an ADR where the implementation changes the architecture beyond the MVP baseline.
5. Identify migration and backfill requirements for existing MVP data.
6. Identify whether the feature should be behind a feature flag (see PM0-05).
7. Identify which user roles can access, configure, edit, export, or delete the new object/data.
8. Identify required audit events and field-level changes (see PM0-04).
9. Identify whether field-level visibility applies.
10. Identify tests to add or update.

Before marking a post-MVP ticket complete:

1. Run relevant backend and frontend tests.
2. Confirm server-side permissions are enforced.
3. Confirm validation exists and produces standard error shapes.
4. Confirm audit events are created where required.
5. Confirm secrets and restricted fields do not appear in logs, audit, notifications, exports, webhooks, or API responses.
6. Confirm migrations preserve existing MVP data.
