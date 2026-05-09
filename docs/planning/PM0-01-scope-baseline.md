# Post-MVP Scope Baseline

**Ticket:** PM0-01  
**Version:** 1.0  
**Date:** 2026-05-07  
**Status:** Approved  
**Related documents:** PRD v3.2, MVP Scope v1.2, Post-MVP Implementation Backlog v1.0

---

## 1. Purpose

This document establishes the controlled post-MVP scope baseline. It maps every PRD capability and MVP deferral to a post-MVP phase, records what is explicitly not planned, and provides a stable reference for release planning and dependency tracking.

The post-MVP implementation backlog (`post-mvp-backlog.md`) defines the individual tickets within each phase. This document explains how PRD capabilities landed in the backlog.

---

## 2. PRD Capability and MVP Deferral Map

The table below maps each significant PRD capability to its MVP delivery status and, where deferred, to the post-MVP phase and primary tickets that implement it.

| PRD section | Capability | MVP status | Post-MVP phase | Primary tickets |
|---|---|---|---|---|
| §3.1 Register | Core register model, name, description, permissions | Done | — | — |
| §3.3 | Standard scoring (Likelihood × Impact, Risk Score, Risk Level) | Done | — | — |
| §3.3 | Inherent and residual risk scoring | Deferred | Phase 6 | PM6-05 to PM6-07 |
| §3.4 | Risk Response Strategy (seeded defaults) | Done | — | — |
| §3.4 | Configurable strategy values, Accept-no-action-required rule | Deferred | Phase 6 | PM6-09 |
| §3.5 | Risk Response Action — simple field mode | Done | — | — |
| §3.5 | Risk Response Action — child record mode | Deferred | Phase 7 | PM7-01 to PM7-12 |
| §4.1 | Risk ID: auto-generate, configurable prefix, zero-padding, internal UUID | Done | — | — |
| §4.1 | Risk ID: import ID preservation | Deferred | Phase 10 | PM10-05 |
| §4.1 | Risk ID: complex format builder | Deferred | Phase 6 | PM6-08 |
| §4.2 | Created Date: System Admin and Register Admin override | Done | — | — |
| §4.2 | Created Date: Risk Owner override (register setting) | Deferred | Phase 10 | PM10-05 |
| §4.3 | Risk states: Draft, Open, Closed; Closed excluded by default | Done | — | — |
| §4.3 | Advanced state workflow, configurable states, transition rules | Deferred | Phase 6 | PM6-09 |
| §5 | Custom field types: text, multi-line text, boolean, number, date, dropdown, person picker | Done | — | — |
| §5 | Custom field type: multi-select | Deferred | Phase 5 | PM5-03 |
| §5 | Custom field type: calculated | Deferred | Phase 5 | PM5-04, PM5-05 |
| §5.1 Person Picker | Local user search and selection | Done | — | — |
| §5.1 Person Picker | Unresolved email entry for future users | Deferred | Phase 2 | PM2-01, PM2-02, PM2-04 |
| §5.1 Person Picker | Automatic user linking on account creation or login | Deferred | Phase 2 | PM2-03 |
| §5.1 Person Picker | External-auth users via SAML | Deferred | Phase 3 | PM3-04 |
| §5.2 Validation | Required/optional validation | Done | — | — |
| §5.2 Validation | Warn-on-save validation mode | Deferred | Phase 5 | PM5-01 |
| §5.2 Validation | Register-level validation summary | Deferred | Phase 5 | PM5-02 |
| §5.3 Field Visibility | Visible to Risk Response Owners setting | Deferred | Phase 5 | PM5-07 |
| §5.3 Field Visibility | Full field-level visibility by role | Deferred | Phase 5 | PM5-06 |
| §6 Config Lifecycle | Field active/inactive, soft deactivation | Done (basic) | — | — |
| §6 Config Lifecycle | Field type migration and remapping | Deferred | Phase 5 | PM5-08 |
| §6 Config Lifecycle | Advanced field lifecycle controls, destructive deletion rules | Deferred | Phase 5 | PM5-09 |
| §6 Config Lifecycle | Dropdown value deactivation and historical value retention | Done (basic) | — | — |
| §6 Config Lifecycle | Draft/publish configuration versioning | Deferred | Phase 4 | PM4-01 to PM4-05 |
| §6 Config Lifecycle | Configuration impact analysis | Deferred | Phase 4 | PM4-03 |
| §7.1 | Configurable Likelihood and Impact values with numeric values | Done | — | — |
| §7.2 | Default Risk Score formula (Likelihood × Impact) | Done | — | — |
| §7.2 | Custom formula builder, safe formula parser and evaluator | Deferred | Phase 6 | PM6-01 to PM6-04 |
| §7.3 | Configurable risk matrix mapping Likelihood/Impact to Risk Level | Done | — | — |
| §8 | Inherent and residual risk: data model, scoring, forms, tables, exports | Deferred | Phase 6 | PM6-05 to PM6-07 |
| §9.1 | Simple field mode for Risk Response Action | Done | — | — |
| §9.1 | Child record mode for Risk Response Action | Deferred | Phase 7 | PM7-01 to PM7-12 |
| §9.2 | Configurable action status values and classifications | Deferred | Phase 7 | PM7-02 |
| §9.2 | Configurable action fields (owner, due date, priority, etc.) | Deferred | Phase 7 | PM7-03 |
| §9.3 | Many-to-many risk-to-action linking | Deferred | Phase 7 | PM7-06 |
| §9.4 | Orphan handling on risk hard delete | Deferred | Phase 7 | PM7-11 |
| §9.5 | Simple-to-child mode migration | Deferred | Phase 7 | PM7-09 |
| §9.5 | Child-to-simple restriction and downgrade guidance | Deferred | Phase 7 | PM7-10 |
| §10.1 Risk Reviews | Enable/disable, register frequency, attestation, comment, reviewer, timestamp, history, audit | Done | — | — |
| §10.1 | Review comment mode: disabled/optional/mandatory configuration | Deferred | Phase 8 | PM8-04 |
| §10.2 | Risk Response Action reviews | Deferred | Phase 8 | PM8-07, PM8-08 |
| §10.3 | Field-based review frequency rules | Deferred | Phase 8 | PM8-01 to PM8-03 |
| §10.4 | Review history: basic reviewer, timestamp, comment | Done | — | — |
| §10.4 | Attestation versioning | Deferred | Phase 8 | PM8-05 |
| §10.4 | Review outcome/status | Deferred | Phase 8 | PM8-06 |
| §11 Notifications | Due/overdue review indicators in the UI | Done | — | — |
| §11 | In-app notification centre | Deferred | Phase 9 | PM9-04 |
| §11 | Risk review reminder rules (notify X days before, repeat every Y days) | Deferred | Phase 9 | PM9-05 |
| §11 | Risk Response Action reminder rules | Deferred | Phase 9 | PM9-06 |
| §11 | Escalation recipients after X days overdue | Deferred | Phase 9 | PM9-09 |
| §11 | Email notifications | Deferred | Phase 9 | PM9-07 |
| §11 | SMTP configuration and credential handling | Deferred | Phase 9 | PM9-02, PM9-03 |
| §12 Permissions | System Admin, Register Admin, Risk Owner, Register Viewer | Done | — | — |
| §12.5 | Risk Response Owner permissions and parent-risk limited context | Deferred | Phase 7 | PM7-04 |
| §12 | Explicit deny rules | Non-goal | — | — |
| §13 Auth | Local authentication, login/logout, JWT, refresh tokens | Done | — | — |
| §13 | User profile: display name update, password change | Deferred | Phase 1 | PM1-01, PM1-02 |
| §13 | User preferences and dark mode | Deferred | Phase 1 | PM1-03 to PM1-05 |
| §13 | Password reset by email | Deferred | Phase 3 | PM3-06 |
| §13 | MFA (TOTP, recovery codes) | Deferred | Phase 3 | PM3-07, PM3-08 |
| §13 | SAML authentication | Deferred | Phase 3 | PM3-01 to PM3-05 |
| §13 | Microsoft Entra ID preset | Deferred | Phase 3 | PM3-03 |
| §13 | Unresolved person email-to-user automatic linking | Deferred | Phase 2 | PM2-03 |
| §14 Audit | System, register, and risk audit logs | Done | — | — |
| §14 | Risk Response audit log | Deferred | Phase 7 | PM7-12 |
| §14 | Exportable audit logs (CSV) | Deferred | Phase 10 | PM10-10 |
| §14 | Full audit search/filter across all dimensions | Deferred | Phase 14 | PM14 (hardening) |
| §14 | Immutable audit storage guarantees beyond application append-only | Non-goal (first pass) | — | — |
| §15.1 Home | Role-aware dashboard (basic risk owner and register admin views) | Done | — | — |
| §15.1 Home | Advanced dashboard widgets and charts | Deferred | Phase 11 | PM11-03, PM11-04 |
| §15.3 | Risk Responses / My Actions page | Deferred | Phase 7 | PM7-08 |
| §15.4 Config | Register configuration UI (fields, scoring, matrix, reviews, permissions) | Done | — | — |
| §15.4 Config | Draft/publish UI, impact analysis view | Deferred | Phase 4 | PM4-05 |
| §15.5 Admin | Users management | Done | — | — |
| §15.5 Admin | SMTP admin UI | Deferred | Phase 9 | PM9-03 |
| §15.5 Admin | SAML / authentication provider admin UI | Deferred | Phase 3 | PM3-05 |
| §15.5 Admin | Global template library admin UI | Deferred | Phase 4 | PM4-09 |
| §15.5 Admin | API key management UI | Deferred | Phase 13 | PM13-02 |
| §15.5 Admin | Webhook admin UI | Deferred | Phase 13 | PM13-06 |
| §16.1 Import | CSV risk import (upload, mapping, validation preview, commit) | Deferred | Phase 10 | PM10-01 to PM10-07 |
| §16.1 Import | Update/merge mode for duplicate Risk IDs | Deferred | Phase 10 | PM10-06 |
| §16.2 Export | CSV risk export respecting filters and permissions | Done | — | — |
| §16.2 Export | Advanced export field selection respecting field visibility | Deferred | Phase 10 | PM10-09 |
| §16.3 | Risk Response Action import/export | Deferred | Phase 10 | PM10-08 |
| §16.4 | CSV template generation from register configuration | Deferred | Phase 10 | PM10-07 |
| §16.5 | Register configuration JSON export | Deferred | Phase 4 | PM4-06 |
| §16.5 | Register configuration JSON import (to draft) | Deferred | Phase 4 | PM4-07 |
| §17 Templates | Versioned global templates: data model, management, create-register-from-template | Deferred | Phase 4 | PM4-08 to PM4-11 |
| §17 | Register-local templates | Non-goal | — | — |
| §18 Reporting | Basic risk table with filters (state, level, owner, due, search) | Done | — | — |
| §18 | Saved views | Deferred | Phase 11 | PM11-01, PM11-02 |
| §18 | Advanced reporting data service and aggregate queries | Deferred | Phase 11 | PM11-03 |
| §18 | Dashboard charts | Deferred | Phase 11 | PM11-04 |
| §18 | Cross-register reporting | Deferred | Phase 11 | PM11-05 |
| §18 | Custom report builder | Deferred | Phase 11 | PM11-06 |
| §18 | Report export | Deferred | Phase 11 | PM11-07 |
| §18 | Scheduled reports | Deferred | Phase 11 | PM11-08 |
| §19 NFRs | Basic usability, validation, permissions, audit, responsiveness | Done | — | — |
| §19 | Observability: metrics, health, job monitoring | Deferred | Phase 14 | PM14-01, PM14-02 |
| §19 | Caching strategy | Deferred | Phase 14 | PM14-03 |
| §19 | Horizontal scaling readiness | Deferred | Phase 14 | PM14-04 |
| §19 | Accessibility audit and remediation | Deferred | Phase 14 | PM14-05 |
| §19 | Internationalisation readiness | Deferred | Phase 14 | PM14-06 |
| §19 | Data retention and compliance controls | Deferred | Phase 14 | PM14-07, PM14-08 |
| §20 PRD future items | Attachment and evidence handling | Deferred | Phase 12 | PM12-01 to PM12-06 |
| §20 PRD future items | External API and webhook integrations | Deferred | Phase 13 | PM13-01 to PM13-07 |
| (implied) | Bulk edit | Deferred | Phase 6 | PM6-10 |

---

## 3. Explicitly Non-Goal Items

The following are not assigned to any post-MVP phase and will not be implemented under this backlog without a new scope decision:

| Item | Reason |
|---|---|
| Self-service user registration | Users must be created by System Admin or provisioned via SAML JIT. Open registration is not required for the target use case. |
| Explicit deny permission rules | The permission model is additive. Deny rules add complexity that is not justified by the current use case (PRD §12.1 explicitly defers this). |
| Real-time LDAP or directory sync | SAML covers SSO authentication. Live directory search requires ongoing connectivity and sync infrastructure not planned for this product. |
| Register-local templates | The PRD mentions Register Admins may create register-local templates "if permitted." This is not phased; only System Admin–owned global templates are planned. |
| Multi-tenancy or SaaS tenant isolation | The product runs as a single-tenant deployment. SaaS-level tenant isolation is not planned. |
| Billing, licensing, or subscription management | Out of scope for the product; this is an operator concern. |
| Full offline or PWA functionality | PM14-09 reviews PWA feasibility but does not commit to offline data access. Offline access to permission-sensitive data is an explicit risk. |
| Formal compliance certifications | PM14-08 produces a compliance control pack and mapping but does not scope third-party certification (SOC 2, ISO 27001, etc.). |

---

## 4. Independently Shippable Phases

For release planning, the following phases can be shipped independently once their dependencies are met:

| Phase | Independently shippable? | Key prerequisite |
|---|---|---|
| 0 — Baseline and Design Controls | Yes — this is setup/documentation | Completed MVP |
| 1 — User Experience, Profile, Preferences | Yes — low-risk improvements | Completed MVP auth |
| 2 — Person Identity Expansion | Yes, but recommended before Phase 3 | Phase 0 data model baseline |
| 3 — Enterprise Auth and Account Recovery | Yes, but Phase 2 strongly recommended first | Phase 0, Phase 2 |
| 4 — Configuration Lifecycle and Templates | Yes — contained to config area | Phase 0 |
| 5 — Advanced Field Model | Depends on Phase 4 for full config versioning | Phase 4 recommended |
| 6 — Advanced Scoring and Methodologies | Depends on Phase 5 formula engine | Phase 4, Phase 5 |
| 7 — Child-Record Risk Response Actions | Large and self-contained once Phase 0 is done | Phase 0 |
| 8 — Risk Response Reviews and Rules | Depends on Phase 7 actions being present | Phase 7 |
| 9 — Notifications and SMTP | Can ship basic in-app notifications before email | Phase 0 |
| 10 — Import, Export, Data Portability | Risk-only import can ship before Phase 5–7; full import after | Phase 0 |
| 11 — Reporting, Saved Views, Dashboards | Depends on stable permissions and visibility | Phase 5 recommended |
| 12 — Attachments and Evidence | Self-contained; integrates with Phase 7 and 8 | Phase 0 |
| 13 — APIs, Webhooks, Integration Admin | Should come after Phase 5 visibility is mature | Phase 5 recommended |
| 14 — Operational Hardening | Can run in parallel with other phases | Monitoring becomes critical once Phase 9/10/13 add background jobs |

---

## 5. Dependency Map

The cross-phase dependency map is maintained in the Post-MVP Implementation Backlog v1.0, Section 19 — Cross-Phase Dependencies. That section is the authoritative dependency record. Do not duplicate it here; update it there.

---

## 6. Document References

| Document | Location |
|---|---|
| Post-MVP Implementation Backlog v1.0 | `docs/planning/post-mvp-backlog.md` |
| PRD v3.2 | `docs/product/prd.md` |
| MVP Scope v1.2 (archived) | `docs/planning/archive/mvp-scope.md` |
| MVP Functional Specification v1.2 (archived) | `docs/planning/archive/mvp-functional-spec.md` |
| Data Model v1.3 | `docs/architecture/data-model.md` |
| Technical Architecture v1.0 | `docs/architecture/technical-architecture.md` |
| API Standards v1.0 | `docs/architecture/api-standards.md` |
| Postman Collection | `docs/postman/` |
| Permission Model v1.0 | `docs/architecture/permission-model.md` |
| Audit Model v1.0 | `docs/architecture/audit-model.md` |
| Security Model v1.0 | `docs/architecture/security-model.md` |
