# Requests

This file is the human-facing intake and refinement view for planning V3.

Request status describes the state of the human-facing ask, not the exact implementation status of every derived work item.

- Use `inbox` for newly captured requests that have not been reviewed yet.
- Use `needs-refinement` when a request has been reviewed but still needs PM clarification, scoping, splitting, or human input.
- Use `refined` when one or more backlog work items exist but none are currently selected in `active-release.md`.
- Use `in-active-release` when one or more derived work items are currently selected for delivery.
- Use `partially-done` when some of the requested outcome has shipped or is complete but meaningful scope remains.
- Use `done` when the human-facing ask is satisfied.
- Use `deferred`, `rejected`, or `duplicate` when that best describes what happened to the ask.

Detailed delivery state belongs in `backlog.yml` and `active-release.md`, not in request status alone.

## Inbox / needs refinement

_(no items currently in inbox)_

## Refined requests

### REQ-013
Request ID: REQ-013
Title: Fix SavedViewsPanel crash on /registers — views.map is not a function
Type: bug
Status: refined
Priority: critical
Summary: Navigating to /registers throws an unhandled application error in SavedViewsPanel.tsx at line 85. The component calls `.map()` on `views`, but `views` is not an array at that point (likely null, undefined, or a non-array API response shape). The register page is completely unusable when this crash occurs.
Notes: Stack trace points to SavedViewsPanel@SavedViewsPanel.tsx:85. Root cause is almost certainly a missing array guard or an API response that does not return the expected array for saved views.
Derived work items: BUG-002
Source: human report (direct)

### REQ-014
Request ID: REQ-014
Title: Polish the /profile page — fix card styling and API keys table overflow
Type: improvement
Status: refined
Priority: medium
Summary: The /profile page uses Card components with a grey background that does not match the rest of the app. The API keys table also overflows its card and produces a horizontal scrollbar at normal desktop widths. Both fixed together as a single TLC pass.
Notes: ProfilePage.tsx is the only file in the frontend that uses Mantine Card. Table overflow root cause is the combination of outer Stack maw=520, Card padding="lg", and Table.ScrollContainer minWidth=480 against six columns.
Derived work items: UI-001
Source: human report (direct)

### REQ-015
Request ID: REQ-015
Title: Add a password strength meter to the change password form on /profile
Type: improvement
Status: refined
Priority: low
Summary: The change password form on /profile gives no feedback on password strength. A live strength meter below the new password field would help users choose stronger passwords without requiring server-side enforcement.
Notes: Mantine docs include a password strength example using Progress and Popover — no new dependency needed. Advisory only by default.
Derived work items: QOL-001
Source: human request (direct)

### REQ-011
Request ID: REQ-011
Title: Upgrade or align the project Node.js runtime
Type: maintenance
Status: refined
Priority: low
Summary: Tighten the package.json engines.node constraint from >=20.19 to >=22 to match the active toolchain already used in .nvmrc, GitHub Actions CI, and Docker. The original request referenced Node 25 and a version number that does not match the live repo state; Node 22 LTS is the correct and intended target.
Notes: The active toolchain is already Node 22. This is a one-line engines field update, not a runtime migration. Node 25 is not an LTS release and is not targeted. Derived work item MAINT-001 captures the scoped change.
Derived work items: MAINT-001
Source: human request

### REQ-005
Request ID: REQ-005  
Title: Add child actions and stronger review workflows so treatment work can be tracked properly  
Type: feature  
Status: refined  
Priority: high  
Summary: Users need first-class response actions, richer review rules, and better ownership tracking instead of relying on a simple risk field.  
Notes: This is the main workflow expansion chain and is a prerequisite for several later roadmap items.  
Derived work items: PM7-CORE, PM8-CORE  
Source: migrated from old planning

### REQ-008
Request ID: REQ-008  
Title: Add attachments and evidence support so users can keep supporting files with risks, actions, and reviews  
Type: feature  
Status: refined  
Priority: medium  
Summary: Users need to upload, view, and manage supporting files with clear storage, permission, and audit controls.  
Notes: Storage architecture is decided in ADR-0006, but the product implementation is still open.  
Derived work items: PM12-CORE  
Source: migrated from old planning

## Partially done

### REQ-001
Request ID: REQ-001  
Title: Finish saved views and reporting foundations so users can keep and reuse their working views  
Type: feature  
Status: partially-done  
Done in: v1.9.0  
Priority: high  
Summary: Users need reusable personal views, safer report/export behaviour, and a clearer reporting foundation instead of relying only on ad hoc table state.  
Notes: Personal saved views (filters, sort, column state) shipped in v1.9.0. Report builder, charts, shared views, scheduled reports, CSV import, and export polish remain open.  
Derived work items: PM11-01, PM10-CORE  
Source: migrated from old planning
Evidence: `backend/src/services/savedViews.service.ts`, `frontend/src/features/risks/SavedViewsPanel.tsx`, `backend/test/savedViews.test.mjs`, `frontend/test/savedViews.behavior.test.tsx`

### REQ-002
Request ID: REQ-002  
Title: Let users and administrators manage API keys safely for integrations and offboarding  
Type: security  
Status: partially-done  
Done in: v1.9.0  
Priority: high  
Summary: The product needs safe API key creation, listing, revocation, and audit coverage without exposing secrets.  
Notes: User self-service and admin API key management shipped in v1.9.0 (PM13-01). Keys are inherit-user-permissions scoped. API key request authentication and deactivated-user enforcement remain deferred as PM13-03.  
Derived work items: PM13-01, PM13-03  
Source: migrated from old planning
Evidence: `backend/src/services/apiKeys.service.ts`, `backend/src/routes/apiKeys.routes.ts`, `backend/src/routes/users.routes.ts`, `frontend/src/pages/ApiKeysPage.tsx`, `frontend/src/pages/ProfilePage.tsx`, `backend/test/apiKeys.test.mjs`

### REQ-003
Request ID: REQ-003  
Title: Support advanced custom field behaviour and safer validation rules  
Type: feature  
Status: partially-done  
Priority: high  
Summary: Register admins need stronger custom field behaviour, including validation modes, calculated behaviour, visibility rules, and safe lifecycle controls.  
Notes: Validation modes, multi-select fields, calculated fields, and field visibility controls are present in code, but full close-out evidence is still incomplete.  
Derived work items: PM5-CORE  
Source: migrated from old planning
Evidence: `backend/src/services/customFields.service.ts`, `backend/src/services/formulaEvaluator.service.ts`, `frontend/src/features/configuration/CustomFieldModal.tsx`, `backend/test/formulaEvaluator.test.mjs`

### REQ-004
Request ID: REQ-004  
Title: Improve scoring and residual risk support for more advanced methodologies  
Type: feature  
Status: partially-done  
Priority: high  
Summary: The platform needs configurable formulas, inherent and residual risk support, and related workflow behaviour to support more mature risk methods.  
Notes: Basic scoring, matrix behaviour, and calculated-field formula support exist, but the full inherent/residual methodology outcome is still not delivered. Residual suggestions driven by child actions are not implemented and now need their own explicit follow-up item instead of living only in a product-extension doc.  
Derived work items: PM6-CORE, PM6-RESIDUAL-SUGGESTIONS  
Source: migrated from old planning
Evidence: `backend/src/services/scoring.service.ts`, `backend/src/services/matrix.service.ts`, `backend/src/services/formulaEvaluator.service.ts`, `backend/test/riskScoring.test.mjs`

### REQ-007
Request ID: REQ-007  
Title: Add safer import, export, and data portability workflows  
Type: improvement  
Status: partially-done  
Done in: v1.9.0  
Priority: medium  
Summary: Operators need more complete data movement support, especially CSV import and more polished exports, without breaking permissions or auditability.  
Notes: Risk CSV export, audit CSV export, and config bundle import/export exist, but CSV import and the broader portability workflow still remain.  
Derived work items: PM10-CORE  
Source: migrated from old planning
Evidence: `backend/src/services/export.service.ts`, `backend/src/services/audit.service.ts`, `backend/src/services/configExport.service.ts`, `backend/src/services/configImport.service.ts`

### REQ-010
Request ID: REQ-010  
Title: Improve person-assignment administration so unresolved owners and audit gaps are visible  
Type: improvement  
Status: partially-done  
Done in: v1.9.0  
Priority: medium  
Summary: Admins need a clean way to find unresolved person references and understand assignment changes without reopening already shipped person-reference work.  
Notes: Core person-reference support and a system-admin unresolved-person route exist, but there is still no clear evidence of a completed admin UI or fully closed assignment-audit coverage.  
Derived work items: PM2-05A  
Source: migrated from old planning
Evidence: `backend/src/routes/persons.routes.ts`, `backend/src/services/personReference.service.ts`, `backend/test/personReferences.test.mjs`

## Done

No current `done` requests are tracked here. Completed request outcomes can be added here when it is useful to show that the human-facing ask has been satisfied.

## Deferred requests

### REQ-009
Request ID: REQ-009  
Title: Add enterprise authentication options for organisations that need SSO and recovery flows  
Type: feature  
Status: deferred  
Priority: medium  
Summary: Enterprise auth remains important, but it is not the best first release candidate compared with already-started product work.  
Notes: Bring this back forward when there is explicit commercial or deployment pressure.  
Derived work items: PM3-CORE  
Source: migrated from old planning

### REQ-012
Request ID: REQ-012  
Title: Extend the template library beyond the shipped baseline with richer lifecycle, preview, and starter-content flows  
Type: feature  
Status: deferred  
Priority: medium  
Summary: The current template baseline is implemented, but broader template-library ideas such as richer lifecycle states, preview metadata, optional starter risks, and future local-template patterns are not yet planned for delivery.  
Notes: This request exists so those post-baseline template ideas do not live only in `docs/product/feature-register-template-library.md` before that file is removed.  
Derived work items: PM4-TEMPLATE-EXTENSIONS  
Source: distilled from product extension doc

### REQ-006
Request ID: REQ-006  
Title: Add notifications and reminders so review and action follow-up does not rely on manual chasing  
Type: feature  
Status: deferred  
Priority: medium  
Summary: Notifications matter, but the action and review model should settle first to avoid rework.  
Notes: Keep this refined, but do not pull it into the first release candidate yet.  
Derived work items: PM9-CORE  
Source: migrated from old planning


## Rejected or duplicate requests

None currently. The planning-model simplification intentionally replaces slices, batches, and active phase documents rather than preserving them as live operating objects.
