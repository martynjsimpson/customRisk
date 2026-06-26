# Requests

This file is the human-facing intake and refinement view for planning V3.

Request status describes the state of the human-facing ask, not the exact implementation status of every derived work item.

- Use `inbox` for newly captured requests that have not been reviewed yet.
- Use `needs-refinement` when a request has been reviewed but still needs PM clarification, scoping, splitting, or human input.
- Use `refined` when one or more backlog work items exist but none are currently selected in `active-release.md`.
- Use `in-active-release` when one or more derived work items are currently selected for delivery.
- Use `partially-done` when some of the requested outcome has shipped or is complete but meaningful scope remains.
- Use `done` when the human-facing ask is satisfied.
- Use `blocked` when the request cannot proceed until a named dependency resolves. Always include a `Blocked on:` field naming the dependency. Blocked requests are reviewed at every planning session to see if the blocker has resolved.
- Use `deferred` when the request is deliberately parked with no specific dependency — "not now, maybe someday". Deferred requests are not surfaced automatically.
- Use `rejected` or `duplicate` when that best describes what happened to the ask.

Detailed delivery state belongs in `backlog.yml` and `active-release.md`, not in request status alone.

## Inbox / needs refinement






### REQ-086
Request ID: REQ-086
Title: Bump actions/checkout from v6 to v7
Type: maintenance
Status: done
Done in: v1.26.0
Priority: low
Summary: The GitHub Actions workflow is using actions/checkout@v6. This should be bumped to v7 to stay current with the latest stable release.
Derived work items: MAINT-027
Source: human request (direct)

### REQ-087
Request ID: REQ-087
Title: Fix Playwright show-report localhost binding on macOS
Type: maintenance
Status: done
Done in: v1.26.0
Priority: low
Summary: npx playwright show-report binds to 127.0.0.1:9323 but Firefox on macOS resolves localhost to IPv6, causing "Unable to connect". Workaround is to navigate to 127.0.0.1:9323 directly. Fix is to add --host 127.0.0.1 to the show-report invocation in root package.json.
Derived work items: MAINT-026
Source: deferred from v1.25.0

### REQ-076
Request ID: REQ-076
Title: Implement production editions model for feature flag management
Type: feature
Status: deferred
Priority: low
Summary: Replace per-deployment arbitrary flag combinations with named, fixed editions. PM direction: three editions — "free", "professional", and "enterprise". Implementation is low-risk once editions are defined — adds editions.ts, updates featureFlags.ts, and logs the resolved edition at startup. Blocked on PM decision: which of the 10 current flags each edition enables.
Notes: Deferred — not a near-term priority. Revisit if editions become commercially relevant.
Derived work items: MAINT-015
Source: deferred from SPIKE-004

## Refined requests

### REQ-093
Request ID: REQ-093
Title: Decide linkedTemplateVersionId policy for manual draft publishes
Type: feature
Status: in-active-release
Priority: low
Summary: When a linked register publishes a manual draft (not a template-origin draft), linkedTemplateVersionId is not updated — the register remains linked at the same template version. Whether this is the correct policy (stay linked, drift silently) or whether the register should auto-unlink when the admin diverges via a manual draft has never been explicitly decided.
Notes: PM decision made — option 1: stay linked at the current template version. Publishing a manual draft does NOT auto-unlink the register. Current backend behaviour is already correct; no code change needed. Help content must explain this behaviour: publishing a manual draft does not change the register's template link, and the drift banner will alert the admin if the template advances further. This help content note is captured in UI-024's acceptance criteria.
Derived work items: UI-024 (help content note only)
Source: extracted from abandoned v1.27.0 (SPIKE-008 deferred items)

### REQ-088
Request ID: REQ-088
Title: Fix broken create-register-from-template function
Type: bug
Status: in-active-release
Priority: critical
Summary: The "create register from template" feature throws a PrismaClientValidationError at runtime. The error occurs in `registers.service.ts` line 700 inside a `$transaction` block where `tx.register.create()` is called with `createdByUserId` and `updatedByUserId` scalar fields but without the required `createdBy` relation. Prisma 7.8.0 is rejecting the invocation because the `createdBy` relation argument is missing.
Notes: Error: "Argument `createdBy` is missing." in `tx.register.create()`. The fix is likely to replace or supplement the scalar `createdByUserId`/`updatedByUserId` fields with a `createdBy: { connect: { id: <userId> } }` relation connect, matching how other register creates in the codebase are structured. Stack trace correlationId: 7f39d6ba-ef11-48b0-96f0-17f2c3973135.
Derived work items: BUG-058
Source: human request (direct)
### REQ-090
Request ID: REQ-090
Title: Fix broken Prisma seed file
Type: bug
Status: in-active-release
Priority: high
Summary: The `backend/prisma/seed.ts` file is broken, likely due to incomplete or conflicting changes left over from the abandoned v1.27.0 release. This will affect local development setup and any CI steps that run the seed.
Notes: Suspected cause is partial v1.27.0 work that was not cleaned up when that release was abandoned. Investigate what schema or data changes were introduced and whether seed.ts needs to be reverted or updated to match the current schema.
Derived work items: BUG-059
Source: human request (direct)
### REQ-091
Request ID: REQ-091
Title: Fix createRegisterFromTemplate — does not copy reviewCommentMode, scoringFormula, responseActionMode
Type: bug
Status: in-active-release
Priority: high
Summary: The createRegisterFromTemplate function omits reviewCommentMode, scoringFormula, and responseActionMode from the tx.register.create call. Registers created from templates that encode non-default values for these three fields silently start with wrong values (defaults). This is a pre-existing bug unrelated to the draft unification work.
Notes: Root cause identified in SPIKE-008 deferred items. Note: this is distinct from REQ-088 (which is a Prisma crash in the same function due to a missing createdBy relation). Both bugs exist independently. Fix for this item is to include the three fields in the tx.register.create call.
Derived work items: BUG-060
Source: extracted from abandoned v1.27.0 (SPIKE-008 deferred items)
### REQ-092
Request ID: REQ-092
Title: Fix Template Compare modal — shows empty diff when only reviewCommentMode, scoringFormula, or responseActionMode differ
Type: bug
Status: in-active-release
Priority: high
Summary: The compareRegisterToTemplate function omits reviewCommentMode, scoringFormula, and responseActionMode from its registerSettingsKeys array. A template update that changes only these fields shows "no differences" in the Compare modal even though the register is genuinely out of sync. Actively misleading.
Notes: Root cause identified in SPIKE-008 deferred items. Fix is to add the three fields to registerSettingsKeys in compareRegisterToTemplate.
Derived work items: BUG-061
Source: extracted from abandoned v1.27.0 (SPIKE-008 deferred items)

### REQ-005
Request ID: REQ-005
Title: Add child actions and stronger review workflows so treatment work can be tracked properly
Type: feature
Status: refined
Done in: v1.19.0 (PM7-CORE — child-record response actions)
Priority: high
Summary: Users need first-class response actions, richer review rules, and better ownership tracking instead of relying on a simple risk field.
Notes: PM7-CORE (child-record response actions) shipped in v1.19.0. PM8-CORE (risk review completeness — comment mode, attestation text UI, review history panel) is blocked pending the unified draft system prerequisite (DRAFT-UNIFIED).
Derived work items: PM7-CORE, PM8-CORE
Source: migrated from old planning

### REQ-084
Request ID: REQ-084
Title: Migrate frontend static tests from .test.mjs to .test.ts
Type: maintenance
Status: done
Done in: v1.26.0
Priority: low
Summary: All 16 frontend static tests use .test.mjs extension; the coding standard says .test.ts. This is an architectural decision — requires Principal Architect review before any rename proceeds, as it may affect module resolution, toolchain config, or other tooling.
Derived work items: MAINT-022
Source: deferred from v1.23.0 (MAINT-013)

### REQ-083
Request ID: REQ-083
Title: Fix brittle querySelector usage in three frontend test files
Type: maintenance
Status: done
Done in: v1.24.0
Priority: medium
Summary: passwordStrength.behavior.test.tsx, apiKeys.behavior.test.tsx, and riskDetailModal.behavior.test.tsx use brittle DOM selectors (querySelector). Fixing requires adding aria-label or data-testid attributes to the relevant source components, so this involves both the frontend developer and the test code.
Derived work items: MAINT-021
Source: deferred from v1.23.0 (MAINT-013)

### REQ-082
Request ID: REQ-082
Title: Restructure myRisks.test.mjs to use describe blocks
Type: maintenance
Status: done
Done in: v1.24.0
Priority: low
Summary: 17 tests in myRisks.test.mjs are currently separated by inline comments rather than describe blocks, contrary to the coding standard. Restructuring requires intentional coordination as test name changes affect test run output and any CI reporting that references test names.
Derived work items: MAINT-020
Source: deferred from v1.23.0 (MAINT-013)

### REQ-081
Request ID: REQ-081
Title: Add opening block comments to test files missing them
Type: maintenance
Status: done
Done in: v1.24.0
Priority: low
Summary: Approximately 38 test files (24 backend, 14 frontend static) are missing required opening block comments per the coding standard. Low risk, high volume — recommend adding them incrementally during upcoming releases rather than in a single dedicated pass.
Derived work items: MAINT-019
Source: deferred from v1.23.0 (MAINT-013)

### REQ-080
Request ID: REQ-080
Title: Break up oversized backend service files
Type: maintenance
Status: done
Done in: v1.26.0
Priority: medium
Summary: risks.service.ts (1,248 lines) and configVersion.service.ts (1,186 lines) each carry multiple distinct responsibilities and warrant extraction into sub-services. Requires Principal Architect review before implementation to agree the correct split boundaries.
Derived work items: MAINT-018
Source: deferred from v1.23.0 (MAINT-012)

### REQ-079
Request ID: REQ-079
Title: Extract duplicated utility functions to backend/src/utils/
Type: maintenance
Status: done
Done in: v1.24.0
Priority: medium
Summary: toDateOnlyString and decimalToNumber are duplicated across four service files (risks.service.ts, reviews.service.ts, dashboard.service.ts, customFieldValues.service.ts). Both should be extracted to a shared backend/src/utils/ module. Multi-file change across high-traffic services — warrants dedicated coverage and care.
Derived work items: MAINT-017
Source: deferred from v1.23.0 (MAINT-012)

### REQ-078
Request ID: REQ-078
Title: Extract large page components into feature components
Type: maintenance
Status: done
Done in: v1.24.0
Priority: medium
Summary: RegisterDetailPage.tsx, UsersPage.tsx, and MyRisksPage.tsx each contain substantial logic and JSX (~80–300 lines each) that should be extracted into dedicated feature components. Each requires its own feature directory and careful extraction to avoid regressions.
Derived work items: MAINT-016
Source: deferred from v1.23.0 (MAINT-011)

### REQ-075
Request ID: REQ-075
Title: Implement Playwright E2E permission test suite
Type: feature
Status: done
Done in: v1.24.0 (E2E-001 — infrastructure), v1.25.0 (E2E-002 — core permission test suite)
Priority: medium
Summary: Adopt Playwright as a third test layer (E2E) to cover real browser sessions, live backend authorisation, and cross-role permission isolation — gaps that Layers 1 and 2 cannot exercise. Implementation follows the 6-step plan in docs/spikes/SPIKE-003.md. Two work items: E2E-001 (infrastructure) and E2E-002 (core permission test suite).
Derived work items: E2E-001, E2E-002
Source: deferred from SPIKE-003

### REQ-043
Request ID: REQ-043
Title: Spike: encryption of client data at rest
Type: feature
Status: refined
Priority: medium
Summary: Investigate and scope encryption of data at rest, with a focus on PII and other sensitive fields — though full encryption of all client data should be considered. This is likely to be closely related to or absorbed into REQ-042 (SaaS multi-tenant spike) as a key security requirement for any hosted offering.
Notes: Scoping should cover which fields/tables warrant encryption, key management strategy, and the performance and complexity trade-offs of field-level vs. full database encryption. The spike should also cover Bring Your Own Key (BYOK) — allowing clients to supply and manage their own encryption keys — so that tenants retain full control over their data and the platform operator cannot access it without the client's key.
Derived work items: SPIKE-002
Source: human request (direct)

### REQ-042
Request ID: REQ-042
Title: Spike: SaaS multi-tenant architecture for COTS hosting
Type: feature
Status: refined
Priority: low
Summary: Explore what it would take to offer customRisk as a commercially hosted SaaS product. This is a large scoping exercise covering architecture decisions, required code changes, and data isolation strategy. Key areas to address include: self-serve sign-up and onboarding, an organisation/tenant model with full data isolation between tenants, authentication and authorisation changes, and any infrastructure or deployment changes needed to support multiple isolated customers on shared infrastructure.
Notes: User flagged this as requiring a dedicated scoping exercise before any implementation work is planned. Treat as a spike/discovery item rather than a deliverable work item for now. The scoping should also cover "super admin" / platform manager controls — the tools the platform operator would need to manage tenants, investigate issues, and fix problems, while preserving customer data safety and privacy (e.g. impersonation with audit trail, tenant suspension, data access controls that prevent casual browsing of customer data).
Derived work items: SPIKE-001
Source: human request (direct)

### REQ-021
Request ID: REQ-021
Title: Overhaul the homepage — it has not been updated since MVP
Type: improvement
Status: refined
Priority: medium
Summary: The homepage has not received meaningful attention since the initial MVP and needs a significant rework. The PM should assess what a post-MVP homepage should offer, potentially overlapping with or superseding any existing planned work in this area.
Notes: User flagged this may conflict with already-planned work — check backlog for related items before scoping.
Derived work items: UI-013
Source: human request (direct)

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

## Blocked requests

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
Done in: v1.17.0 (PM6-SCORING)
Priority: high
Summary: The platform needs configurable formulas, inherent and residual risk support, and related workflow behaviour to support more mature risk methods.
Notes: Basic scoring, matrix behaviour, and calculated-field formula support exist. Configurable score formula engine (PM6-SCORING) shipped in v1.17.0. Inherent/residual mode (PM6-CORE) is deferred until after PM7-CORE (child actions). Residual suggestions (PM6-RESIDUAL-SUGGESTIONS) follow after both.
Derived work items: PM6-SCORING, PM6-CORE, PM6-RESIDUAL-SUGGESTIONS
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

### REQ-085
Request ID: REQ-085
Title: Fix 10 CI lint warnings in frontend and backend
Type: maintenance
Status: done
Done in: v1.25.0
Priority: medium
Summary: CI quality gates were reporting 10 warnings across several files — unused variable/import declarations in test files and source files, plus one forbidden import() type annotation and one missing import type usage in the backend.
Notes: Affected files: frontend/test/modalErrorClear.behavior.test.tsx (unused: isOpen L127, makeAction L73, act L11); frontend/test/formulaEvaluator.behavior.test.tsx (forbidden import() type annotation L147, unused: beforeEach L11, QueryClientProvider L8, QueryClient L8); frontend/src/features/risks/RiskFormModal.tsx (unused: FormulaEvaluationError L22); frontend/src/features/registers/RegisterPermissionsPanel.tsx (unused: useQueryClient L13); backend/src/services/dashboard.service.ts (use import type L1). Note: originally logged as REQ-077 (ID collision with i18n request); renumbered to REQ-085.
Derived work items: MAINT-023
Source: human request (direct)

### REQ-074
Request ID: REQ-074
Title: Admin summary widget shows deleted registers
Type: bug
Status: done
Done in: v1.23.0
Priority: high
Summary: On the home page, the Admin summary widget (which shows all registers) is incorrectly including registers that have been marked as deleted. Deleted registers should be excluded from this view. This likely means the widget query is missing a filter on the deleted/soft-delete flag.
Derived work items: BUG-057
Source: human request (direct)

### REQ-073
Request ID: REQ-073
Title: Refresh seed scripts
Type: maintenance
Status: done
Done in: v1.23.0
Priority: medium
Summary: Seed data was last meaningfully updated 2026-05-18 (pre-v1.7.0). Gaps confirmed: no custom fields, no response action child records, no custom scoring formula, no completed reviews. Scoped refresh covers all four gaps.
Derived work items: MAINT-014
Source: human request (direct)

### REQ-072
Request ID: REQ-072
Title: Audit test coding standards
Type: maintenance
Status: done
Done in: v1.23.0
Priority: medium
Summary: Test Engineer assesses all test code against the standards from REQ-069/MAINT-010. Actionable findings; quick fixes in-release, larger items deferred to PM.
Derived work items: MAINT-013
Source: human request (direct)

### REQ-071
Request ID: REQ-071
Title: Audit backend coding standards
Type: maintenance
Status: done
Done in: v1.23.0
Priority: medium
Summary: Backend Developer assesses all backend code against the standards from REQ-069/MAINT-010. Actionable findings; quick fixes in-release, larger items deferred to PM.
Derived work items: MAINT-012
Source: human request (direct)

### REQ-070
Request ID: REQ-070
Title: Audit frontend coding standards
Type: maintenance
Status: done
Done in: v1.23.0
Priority: medium
Summary: Frontend Developer assesses all frontend code against the standards from REQ-069/MAINT-010. Actionable findings; quick fixes in-release, larger items deferred to PM.
Derived work items: MAINT-011
Source: human request (direct)

### REQ-069
Request ID: REQ-069
Title: Establish coding standards
Type: maintenance
Status: done
Done in: v1.20.0
Priority: medium
Summary: PA writes practical coding standards for frontend, backend, and test code. Output is a document at docs/engineering/coding-standards.md usable during implementation and code review. Prerequisite for REQ-070/071/072.
Derived work items: MAINT-010
Source: human request (direct)

### REQ-068
Request ID: REQ-068
Title: Spike internationalisation architecture
Type: feature
Status: done
Done in: v1.20.0
Priority: low
Summary: PA spike covering frontend strings, backend text, help content, validation messages, and config labels. Output at docs/spikes/SPIKE-005.md. Low priority until a concrete second-language need arises.
Derived work items: SPIKE-005
Source: human request (direct)

### REQ-067
Request ID: REQ-067
Title: Surface response actions help
Type: bug
Status: done
Done in: v1.20.0
Priority: medium
Summary: Documentation was written to `frontend/public/help/en/response-actions.md`, but it was never added to the in-app help page, so users cannot discover it from the help UI. Decision: fold response actions content into the risks help section rather than adding a standalone tab.
Notes: Content should appear as a subsection within the risks help article.
Derived work items: BUG-051
Source: human request (direct)

### REQ-066
Request ID: REQ-066
Title: Investigate draft config application
Type: bug
Status: done
Done in: v1.22.0
Priority: high
Summary: Each config change sends a PATCH to /draft (correct) but then a PATCH to <registerId> appears to send all local page settings, potentially overriding the server-side draft. PA must audit all config pages and fix any paths that bypass the draft mechanism.
Derived work items: BUG-056
Source: human request (direct)

### REQ-065
Request ID: REQ-065
Title: Reduce duplicate release CI
Type: improvement
Status: done
Done in: v1.21.0
Priority: medium
Summary: CI runs the same checks multiple times across branch, PR, and post-merge workflows. Investigate and tighten GitHub Actions trigger config to eliminate redundant runs without compromising release confidence.
Derived work items: MAINT-009
Source: human request (direct)

### REQ-064
Request ID: REQ-064
Title: Spike production editions model
Type: feature
Status: done
Done in: v1.22.0
Priority: medium
Summary: PA spike on fixed production editions vs. per-deployment flag drift. Must address short-term BUG-055 context and long-term tenant model relationship. Output at docs/spikes/SPIKE-004.md.
Derived work items: SPIKE-004
Source: human request (direct)

### REQ-063
Request ID: REQ-063
Title: Fix production feature flags
Type: bug
Status: done
Done in: v1.21.0
Priority: high
Summary: Feature flags set in `.env` have no effect in the production Docker Compose deployment. The full env var pipeline needs to be investigated and fixed, with README.md updated to document the correct approach.
Derived work items: BUG-055
Source: human request (direct)

### REQ-062
Request ID: REQ-062
Title: On-demand branch package publishing
Type: improvement
Status: done
Done in: v1.21.0
Priority: high
Summary: Add a manually triggered GitHub Actions workflow to publish a Docker package for a specific branch, using the same build process as a release build. README updated with trigger instructions and production targeting guidance.
Derived work items: MAINT-007
Source: human request (direct)

### REQ-061
Request ID: REQ-061
Title: Improve production backend logging
Type: improvement
Status: done
Done in: v1.22.0
Priority: high
Summary: Production deployments emit insufficient log information to debug live issues. PA defines the logging structure and approach first; backend then implements configurable structured logging (LOG_LEVEL in .env) and operational docs are written to docs/operations/observability.md.
Derived work items: MAINT-008
Source: human request (direct)

### REQ-060
Request ID: REQ-060
Title: Stabilize feature flag combinations
Type: bug
Status: done
Done in: v1.21.0
Priority: high
Summary: The app may fail when certain feature flags are turned off, with `/registers/<registerId>` called out as a suspected affected route. Fix is a systematic review and hardening of all feature-flagged paths on both frontend and backend.
Derived work items: BUG-054
Source: human request (direct)

### REQ-059
Request ID: REQ-059
Title: Modal errors persist across reopens — should reset on close
Type: bug
Status: done
Done in: v1.21.0
Priority: high
Summary: Across many modals in the app, error states are not cleared when the modal is closed. Reopening the same modal shows the previous error until a successful action clears it. Fix is a sweep of all modals to apply a consistent error-reset pattern on close.
Derived work items: BUG-053
Source: human request (direct)

### REQ-058
Request ID: REQ-058
Title: Audit table doesn't refresh after adding risk response action
Type: bug
Status: done
Done in: v1.21.0
Priority: medium
Summary: When adding a risk response action in child record mode, the Audit Table in the View Risk modal does not update in real-time. The new entry only appears after closing and reopening the modal.
Derived work items: BUG-052
Source: human request (direct)

### REQ-057
Request ID: REQ-057
Title: Evaluate ad-hoc browser-based permission testing tooling
Type: feature
Status: done
Done in: v1.20.0
Priority: low
Summary: Evaluate and implement Playwright for browser-based permission testing. PA to assess against ADR-0008 before implementation. QA-001 (manual plan) is the permission matrix the suite will automate.
Derived work items: SPIKE-003
Source: human request (direct)

### REQ-056
Request ID: REQ-056
Title: Manual test plan for permissions — all role/type permutations
Type: feature
Status: done
Done in: v1.20.0
Priority: medium
Summary: A human-executable permission test plan covering all roles and entity types. Also serves as the specification for SPIKE-003 (Playwright automation). Suggested location: docs/engineering/permission-test-plan.md.
Derived work items: QA-001
Source: human request (direct)

### REQ-055
Request ID: REQ-055
Title: CALCULATED field value — no real-time preview in risk edit form
Type: improvement
Status: done
Done in: v1.18.0
Priority: medium
Summary: When editing a risk, a CALCULATED custom field displays the last saved server-side value. It does not update in real time as the user changes the referenced numeric fields. The correct value only appears after saving and reopening the risk. A real-time preview — via client-side formula evaluation or a debounced backend call — would improve the editing experience.
Notes: Deferred from v1.17.1 during BUG-049 verification. The current behaviour is technically correct (saved value is accurate) but the UX lag is confusing. Client-side formula evaluation is likely simpler than a debounced backend call given the formula is already available from the register config.
Derived work items: UI-023
Source: deferred from v1.17.1

### REQ-054
Request ID: REQ-054
Title: CALCULATED field formula — no live validation on save
Type: improvement
Status: done
Done in: v1.18.0
Priority: medium
Summary: The formula textarea in the custom field modal gives no validation feedback when saving a field definition. An invalid formula is silently accepted and only rejected at publish time. The scoring formula panel already has debounced live validation using the /validate-formula endpoint — the same pattern should be applied to the CALCULATED field formula input in CustomFieldModal.tsx.
Notes: Deferred from v1.17.1 during BUG-050 verification. The validate-formula endpoint already exists from PM6-SCORING work. This is a UX improvement that would prevent invalid formulas from reaching the publish step.
Derived work items: UI-022
Source: deferred from v1.17.1

### REQ-053
Request ID: REQ-053
Title: Show yellow * for warn fields in risk edit form
Type: improvement
Status: done
Done in: v1.18.0
Priority: high
Summary: The risk edit form uses red asterisks (*) to indicate required fields, but fields with a validation mode of WARN show no visual indicator. Users have no way to tell which fields are suggested without trying to save. A yellow * should be shown next to warn fields to distinguish them from required fields (red *), making the form's validation state clear before submission.
Notes: This is a companion to the existing required-field indicator. The yellow * means "suggested" and the red * means "required". Implementation will need to check the validationMode for each field and apply the appropriate colour to the asterisk.
Derived work items: UI-021
Source: human request (direct)

### REQ-052
Request ID: REQ-052
Title: Update help docs for scoring formula feature
Type: maintenance
Status: done
Done in: v1.17.1
Priority: medium
Summary: The in-app help documentation has not been updated to cover the recently shipped scoring formula feature. Users reading the help content will find no guidance on how to configure or use custom scoring formulas. The relevant help article(s) should be updated to accurately describe the feature, including how to write a formula, what variables are available, and any constraints.
Derived work items: MAINT-006
Source: human request (direct)

### REQ-051
Request ID: REQ-051
Title: Make open risks and overdue counts links on /registers
Type: improvement
Status: done
Done in: v1.17.1
Priority: medium
Summary: The /registers page shows a table of all registers with columns for open risk count and overdue count. These numbers are plain text. They should be made into clickable links that navigate to the relevant register page with the appropriate filter pre-applied, consistent with the same pattern already implemented on the homepage Admin Summary widget (REQ-034).
Notes: Reference the Admin Summary widget implementation for the link and filter pattern. Open risks count should link to /registers/<registerID> filtered to open risks; overdue count should link filtered to overdue reviews.
Derived work items: UI-020
Source: human request (direct)

### REQ-050
Request ID: REQ-050
Title: Fix calculated field save error — missing validationMode
Type: bug
Status: done
Done in: v1.17.1
Priority: critical
Summary: Adding or editing a custom field of type CALCULATED throws a backend validation error because the frontend does not send a validationMode value. The validation mode input is intentionally hidden for calculated fields (since the value is auto-computed and user validation is meaningless), but the backend still requires one of "ALLOW"|"WARN"|"BLOCK". The fix is to default validationMode to "ALLOW" in the form submission when fieldType is CALCULATED.
Notes: Error text: "Invalid request body — Custom Fields 1 Validation Mode: Invalid option: expected one of 'ALLOW'|'WARN'|'BLOCK'". Fix location: CustomFieldModal.tsx form onSubmit handler — add `validationMode: "ALLOW"` when `values.fieldType === "CALCULATED"`. This blocks all use of calculated fields.
Derived work items: BUG-050
Source: human request (direct)

### REQ-049
Request ID: REQ-049
Title: Investigate and fix custom calculated field functionality
Type: bug
Status: done
Done in: v1.17.1
Priority: high
Summary: The user cannot get custom calculated fields to work as expected. It is unclear whether this is a configuration/UX issue (no clear documentation or example) or an actual bug. The save error (REQ-050/BUG-050) is addressed separately. Residual scope is verifying end-to-end functionality with a known-good example after the save error is fixed.
Notes: User flagged this may be user error — needs a working example documented or surfaced in-app before treating as a definite bug. Related to REQ-003 (custom field behaviour) and the formulaEvaluator service. Depends on BUG-050 shipping first.
Derived work items: BUG-049
Source: human request (direct)

### REQ-047
Request ID: REQ-047
Title: Apply rounded corners to left nav hover/active states
Type: improvement
Status: done
Done in: v1.14.0
Priority: medium
Summary: The app consistently uses rounded corners on buttons, frames, and other UI elements, but the hover and active highlight on the left-hand navigation does not follow this style. The nav hover and active states should be updated to use rounded corners to match the rest of the design language.
Derived work items: UI-015
Source: human request (direct)

### REQ-045
Request ID: REQ-045
Title: Delete legacy docs/planning directory
Type: maintenance
Status: done
Done in: v1.15.0
Priority: low
Summary: The old docs/planning directory and all its contents are now superseded by the new planning process under docs/work. It should be deleted to keep the repository clean and avoid confusion.
Derived work items: MAINT-005
Source: human request (direct)

### REQ-044
Request ID: REQ-044
Title: Append ellipsis to API key prefix in audit log
Type: improvement
Status: done
Done in: v1.14.0
Priority: low
Summary: In the audit log, API key prefixes are displayed as-is (e.g. `cr_live_27e6515b`), which could imply it is the full key. Since the prefix is only the beginning of the key, it should be rendered with a trailing ellipsis (e.g. `cr_live_27e6515b...`) to make clear that the value is truncated. This applies both to the description text and the prefix displayed in the affected field column.
Derived work items: UI-016
Source: human request (direct)

### REQ-041
Request ID: REQ-041
Title: Restyle action buttons to look like buttons, not links
Type: improvement
Status: done
Done in: v1.14.0
Priority: high
Summary: Action buttons such as "Review", "Edit", and "Delete" — used throughout the app in the register table, modals, and elsewhere — have a background matching the page, making them look like plain links rather than interactive controls. They lack the visual weight expected of CTAs. Additionally, their font size is inconsistent with other buttons in the app. All three issues should be resolved with a consistent button style applied globally.
Notes: REQ-046 (/templates page buttons) is consolidated into this request and UI-017.
Derived work items: UI-017
Source: human request (direct)

### REQ-040
Request ID: REQ-040
Title: Paginate Review History table in View Risk modal
Type: improvement
Status: done
Done in: v1.14.0
Priority: medium
Summary: The Review History table in the View Risk modal should be paginated with a page size of 5 rows. A hard limit of 100 rows should be enforced, and the UI should display a note explaining that only the most recent 100 review records are shown.
Derived work items: UI-018
Source: human request (direct)

### REQ-039
Request ID: REQ-039
Title: Paginate Audit History table in View Risk modal
Type: improvement
Status: done
Done in: v1.14.0
Priority: medium
Summary: The Audit History table in the View Risk modal is currently not paginated. As audit records accumulate over time the list could become very long and slow. Pagination should be added with a page size of 5 rows. A hard cap of 100 rows should also be enforced to keep performance predictable, and the UI should display a note explaining that only the most recent 100 audit records are shown.
Derived work items: UI-019
Source: human request (direct)

### REQ-038
Request ID: REQ-038
Title: Allow register admins to control the position of the Review field in the risk detail modal
Type: improvement
Status: done
Done in: v1.15.0
Priority: medium
Summary: The Review status row in the risk detail modal is not part of the register's field configuration, so admins cannot control its position relative to other fields the way they can for custom fields. It currently appears at a fixed position (end of table). The field configuration system should be extended to include Review as a configurable field so its display order can be set per register.
Source: verification feedback (v1.12.0 release)
Derived work items: UI-014

### REQ-037
Request ID: REQ-037
Title: Remove redundant "show closed" checkbox from register page
Type: improvement
Status: done
Done in: v1.11.0
Priority: medium
Summary: The /registers/<registerID> page has both a "State" dropdown filter (with options including Open, Closed, Draft) and a separate "Show closed" checkbox. The checkbox is redundant since closed risks can already be shown by selecting "Closed" in the state dropdown. The checkbox should be removed to simplify the filter UI.
Derived work items: UI-003
Source: human request (direct)

### REQ-036
Request ID: REQ-036
Title: Add Export CSV button to /my-risks page
Type: improvement
Status: done
Done in: v1.13.0
Priority: medium
Summary: The /my-risks page has no CSV export capability. An Export CSV button should be added, styled and positioned consistently with the equivalent button on /registers/<registerID> and other pages that have it.
Derived work items: UI-006
Source: human request (direct)

### REQ-035
Request ID: REQ-035
Title: Add search filters to /my-risks page
Type: improvement
Status: done
Done in: v1.13.0
Priority: medium
Summary: The /my-risks page currently has no search or filter capability. Filters should be added in a style consistent with the /registers/<registerID> page. Care is needed because the /my-risks table is a unified cross-register view, so filters must work across all registers rather than assuming a single register's schema — custom field filters in particular may need special handling.
Notes: The register page filter pattern is the reference. Cross-register nature of the table means register-specific custom field filters may be out of scope or need a different approach — PM should define scope at refinement.
Derived work items: UI-005
Source: human request (direct)

### REQ-034
Request ID: REQ-034
Title: Make Admin summary widget counts link to pre-filtered register
Type: improvement
Status: done
Done in: v1.12.0
Priority: medium
Summary: The "Admin summary" homepage widget displays open risk counts and overdue review counts per register, but these are plain numbers. Each count should be a clickable link that navigates to the relevant register page with the appropriate filter pre-applied — e.g. clicking the open risks count opens /registers/<registerID> filtered to open risks only, and clicking the overdue reviews count filters to overdue reviews only.
Notes: Requires a mechanism to pass filter state into the register page via URL params or navigation state. Both the open risks column and the overdue reviews column should be made into links.
Derived work items: UI-007
Source: human request (direct)

### REQ-033
Request ID: REQ-033
Title: Add inline review action to "My overdue risks" homepage widget
Type: improvement
Status: done
Done in: v1.12.0
Priority: medium
Summary: The "My overdue risks" homepage widget should include a Review button for each risk so users can complete a review without leaving the page. The review modal should open in-place (not navigate away), consistent with the approach requested in REQ-022. After the review is submitted the widget should refresh to reflect the updated state.
Notes: Related to REQ-022 (in-place modals on /my-risks). Same pattern applies here — modal opens on the homepage, widget data refreshes on completion.
Derived work items: UI-008
Source: human request (direct)

### REQ-032
Request ID: REQ-032
Title: Externalise /help content out of source code
Type: improvement
Status: done
Done in: v1.15.0
Priority: medium
Summary: Help content on the /help page is currently embedded directly in code, making it hard to maintain and impossible to localise. The content should be moved to external files (e.g. Markdown or similar) so it can be edited independently of the codebase. The chosen approach must also support including or referencing images within help articles, and should lay the groundwork for future multi-language support.
Notes: Solution should consider: file-based content (e.g. Markdown files served as assets), image support (inline or referenced), and a structure that could accommodate locale variants in future. REQ-031 (content accuracy audit) should ideally be done after or alongside this change.
Derived work items: MAINT-002
Source: human request (direct)

### REQ-031
Request ID: REQ-031
Title: Audit and update /help page content for accuracy
Type: improvement
Status: done
Done in: v1.15.0
Priority: medium
Summary: The content on the /help page has not been kept in sync with how the application currently works. A review pass is needed to identify and correct any outdated, inaccurate, or missing information so the help content accurately reflects the live product.
Derived work items: MAINT-003
Source: human request (direct)

### REQ-030
Request ID: REQ-030
Title: Align "Views" dropdown styling with columns and export buttons
Type: bug
Status: done
Done in: v1.11.0
Priority: high
Summary: On the /registers/<registerID> page, the "Views" dropdown is styled differently from the adjacent "Columns" dropdown and "Export CSV" button. All three controls should share a consistent style.
Derived work items: BUG-006
Source: human request (direct)

### REQ-029
Request ID: REQ-029
Title: Fix "Save View" broken on register — columns type mismatch
Type: bug
Status: done
Done in: v1.11.0
Priority: critical
Summary: The "Save View" feature on the register page is completely broken. Attempting to save a view throws a validation error, making the feature unusable. The root cause appears to be a type mismatch in the request payload: the API expects `columns` to be an array but is receiving an object.
Notes: Exact error: "Invalid request body — Columns: Invalid input: expected array, received object". Likely a serialisation issue on the frontend when building the save view request body.
Derived work items: BUG-003
Source: human request (direct)

### REQ-028
Request ID: REQ-028
Title: Move "Configuration is version-controlled" alert above action buttons
Type: improvement
Status: done
Done in: v1.11.0
Priority: medium
Summary: On the register configuration page, the "Configuration is version-controlled" alert box currently appears below the action button group (create draft, export config, etc.). It should be moved above that box so the contextual information is presented before the actions it relates to.
Derived work items: UI-009
Source: human request (direct)

### REQ-027
Request ID: REQ-027
Title: Use Mantine Fieldset on register permissions page
Type: improvement
Status: done
Done in: v1.11.0
Priority: medium
Summary: The register permissions page does not use Mantine Fieldset components for grouping its content, unlike the configuration → settings page and other configuration sub-pages which already follow this pattern. The permissions page should be updated to match for visual and structural consistency.
Notes: Reference the configuration → settings page and its sub-pages as the pattern to follow.
Derived work items: UI-010
Source: human request (direct)

### REQ-026
Request ID: REQ-026
Title: Fix calculated field dark mode styling in risk modals
Type: bug
Status: done
Done in: v1.11.0
Priority: high
Summary: Calculated fields are unreadable in dark mode in both the add risk and edit risk modals — they appear to use hardcoded or incorrect colours that do not adapt to the dark theme. The fields need to honour the app's dark mode colour scheme so their values are legible in both modals.
Notes: Confirmed in both the add risk modal and the edit risk modal.
Derived work items: BUG-004
Source: human request (direct)

### REQ-025
Request ID: REQ-025
Title: Show live risk ID and title in sticky edit risk modal header
Type: improvement
Status: done
Done in: v1.12.0
Priority: medium
Summary: Similar to REQ-024 for the view modal, the edit risk modal's sticky header should show the risk ID and a live reflection of the title field value so the user retains context while scrolling. Since the title is an editable input in this modal, the header should display the current value of that input and update on every keystroke rather than embedding the input itself.
Notes: Related to REQ-024. The exact implementation approach is open — PM and dev should determine the best way to mirror the title input value in the header. Update should be reactive (on each character press).
Derived work items: UI-002
Source: human request (direct)

### REQ-024
Request ID: REQ-024
Title: Show Risk ID and title in sticky risk view modal header
Type: improvement
Status: done
Done in: v1.12.0
Priority: medium
Summary: The risk view modal currently shows "Risk Detail" as the header text. Replacing this with the risk's ID and title would provide useful persistent context as the user scrolls through the modal content, since the header is sticky. This is a small change with a meaningful UX benefit.
Notes: Replace the static "Risk Detail" text with the risk ID and title. Header is already sticky so no layout changes needed.
Derived work items: UI-002
Source: human request (direct)

### REQ-023
Request ID: REQ-023
Title: Hide review button on /my-risks when reviews not required
Type: bug
Status: done
Done in: v1.11.0
Priority: high
Summary: The /my-risks table shows a Review button for all risks regardless of whether the parent register has reviews enabled. When a risk's review status is "not required", the Review button should be hidden as it is not applicable and creates a misleading UI.
Notes: Condition to check: the register for that risk has reviews disabled, which surfaces as a review status of "not required" on the risk.
Derived work items: BUG-005
Source: human request (direct)

### REQ-022
Request ID: REQ-022
Title: Open edit/view modals in-place on the /my-risks page
Type: improvement
Status: done
Done in: v1.12.0
Priority: medium
Summary: Clicking "Edit" or a risk ID from the /my-risks page currently navigates the user away to /registers/<registerID> and opens the modal there. Both actions should instead open the relevant modal directly on the /my-risks page, keeping the user in context without a page jump.
Notes: Affects both the edit action and the risk ID link. The modal content itself does not need to change — only where it is triggered from.
Derived work items: UI-004
Source: human request (direct)

### REQ-020
Request ID: REQ-020
Title: Add descriptive helper text under the title on all pages
Type: improvement
Status: done
Done in: v1.15.0
Priority: medium
Summary: The /help page displays a short descriptive subtitle beneath the page title, but no other pages follow this pattern. Helper text should be added to all pages to improve orientation and consistency. On the /api-keys page specifically, the existing alert box content is a good candidate to be repurposed as the helper text rather than shown as an alert.
Notes: Use the /help page subtitle as the reference pattern. For /api-keys, convert the alert box into helper text rather than duplicating the content. Exception: on /registers/<registerID> the helper text should be the register's own description field rather than generic page-level text, since the page title is already the register name.
Derived work items: UI-011
Source: human request (direct)

### REQ-019
Request ID: REQ-019
Title: Remove icon from /help page header
Type: bug
Status: done
Done in: v1.11.0
Priority: medium
Summary: The /help page displays an icon before the "Help" heading text in the page header. No other page in the app follows this pattern, making it visually inconsistent. The icon should be removed so the header matches the style of all other pages.
Derived work items: BUG-008
Source: human request (direct)

### REQ-018
Request ID: REQ-018
Title: Fix /audit page Export CSV button styling and layout
Type: bug
Status: done
Done in: v1.11.0
Priority: high
Summary: The Export CSV button on the /audit page is styled incorrectly — it should use the same blue button style as the Export CSV button on the /registers/<registerID> page. The button should also be moved onto the same line as the page title, matching the layout pattern used on the register page.
Notes: Use the /registers/<registerID> page as the reference for both the button variant/colour and the title-row layout.
Derived work items: BUG-007
Source: human request (direct)

### REQ-017
Request ID: REQ-017
Title: Investigate and improve CI/CD pipeline performance
Type: maintenance
Status: done
Done in: v1.16.0
Priority: medium
Summary: The CI/CD pipeline is running slowly and impacting developer velocity. The team should audit the current pipeline configuration to identify bottlenecks and explore improvements such as caching, parallelisation, or tooling changes to reduce build and test times.
Derived work items: MAINT-004
Source: human request (direct)

### REQ-016
Request ID: REQ-016
Title: Use date picker input in Create API Key modal
Type: improvement
Status: done
Done in: v1.13.0
Priority: medium
Summary: The Create API Key modal includes a date field but renders it as a plain text input rather than a proper date picker. The audit log search filter already implements a date picker component that could be reused here. The inconsistency creates a worse UX and makes it easier for users to enter invalid dates.
Notes: Reference the date picker component used in the audit log search filter as the pattern to follow.
Derived work items: UI-012
Source: human request (direct)

### REQ-015
Request ID: REQ-015
Title: Add a password strength meter to the change password form on /profile
Type: improvement
Status: done
Done in: v1.10.0
Priority: low
Summary: The change password form on /profile gives no feedback on password strength. A live strength meter below the new password field would help users choose stronger passwords without requiring server-side enforcement.
Notes: Mantine docs include a password strength example using Progress and Popover — no new dependency needed. Advisory only by default.
Derived work items: QOL-001
Source: human request (direct)

### REQ-014
Request ID: REQ-014
Title: Polish the /profile page — fix card styling and API keys table overflow
Type: improvement
Status: done
Done in: v1.10.0
Priority: medium
Summary: The /profile page uses Card components with a grey background that does not match the rest of the app. The API keys table also overflows its card and produces a horizontal scrollbar at normal desktop widths. Both fixed together as a single TLC pass.
Notes: ProfilePage.tsx is the only file in the frontend that uses Mantine Card. Table overflow root cause is the combination of outer Stack maw=520, Card padding="lg", and Table.ScrollContainer minWidth=480 against six columns.
Derived work items: UI-001
Source: human report (direct)

### REQ-013
Request ID: REQ-013
Title: Fix SavedViewsPanel crash on /registers — views.map is not a function
Type: bug
Status: done
Done in: v1.10.0
Priority: critical
Summary: Navigating to /registers throws an unhandled application error in SavedViewsPanel.tsx at line 85. The component calls `.map()` on `views`, but `views` is not an array at that point (likely null, undefined, or a non-array API response shape). The register page is completely unusable when this crash occurs.
Notes: Stack trace points to SavedViewsPanel@SavedViewsPanel.tsx:85. Root cause is almost certainly a missing array guard or an API response that does not return the expected array for saved views.
Derived work items: BUG-002
Source: human report (direct)

### REQ-011
Request ID: REQ-011
Title: Upgrade or align the project Node.js runtime
Type: maintenance
Status: done
Done in: v1.16.0
Priority: low
Summary: Upgrade the project toolchain to Node 24 LTS (the current LTS line as of mid-2026) and tighten package.json engines.node to >=24. Covers .nvmrc, GitHub Actions CI, Dockerfile, and all workspace package.json files. The original request referenced Node 25 (not an LTS release); Node 24 LTS is the correct target. Principal Architect to confirm compatibility before devops-engineer executes.
Notes: Node 24 became LTS in October 2025. PA confirmation required before proceeding. Derived work item MAINT-001 captures the scoped change.
Derived work items: MAINT-001
Source: human request

## Deferred requests

### REQ-089
Request ID: REQ-089
Title: Decide fate of config draft system feature flag
Type: improvement
Status: deferred
Priority: medium
Summary: The config draft system is now deeply integrated into the product, prompting a question of whether to promote it from a feature flag to a permanent, always-on feature. Removing the flag would simplify the architecture — no per-setting API endpoints needed — but would eliminate the ability to gate it commercially. The alternative is to keep it as a flag and position draft config as an enterprise-tier feature.
Notes: Two paths to evaluate: (1) remove the feature flag entirely and ship draft config as a core capability; (2) retain the flag and assign it to an enterprise edition (see also REQ-076 re: editions model). PM decision needed on commercial positioning before implementation can proceed. Deferred — not a near-term priority.
Source: human request (direct)

### REQ-077
Request ID: REQ-077
Title: Implement internationalisation support
Type: feature
Status: deferred
Priority: low
Summary: Add multi-language support across the full product surface. Architecture assessed in docs/spikes/SPIKE-005.md. Recommended library: react-i18next. Five-phase approach: (1) string externalisation, (2) date/number formatting via Day.js, (3) help content locale namespacing, (4) Zod validation message localisation, (5) audit description schema change if required. Spike explicitly recommends not starting without a confirmed product need for multi-language support.
Derived work items: I18N-001
Source: deferred from SPIKE-005

### REQ-048
Request ID: REQ-048
Title: Investigate bulk-batch job queue architecture
Type: maintenance
Status: deferred
Priority: medium
Summary: As the risk register grows, operations that require recalculating all risks (e.g. changing the scoring formula) will become too slow to execute synchronously via a single API call. A job queue architecture should be investigated to handle bulk-batch operations asynchronously. This becomes especially important if/when the app moves to multi-tenant, where a bulk operation for one customer must not block others.
Notes: Key concerns to address in the investigation: FIFO ordering and tenant isolation (customer A's bulk job must not block customer B); resumability (if a job fails partway through, it should know where to resume); visibility (customer admins should be able to see the status of their own queued jobs; super admins should have a system-wide queue view); and identifying which other operations beyond score recalculation may benefit from the same pattern (e.g. CSV import, bulk status changes). Deferred until SPIKE-001 (multi-tenant architecture spike) produces an output — the tenant model must be resolved before a job queue architecture can be designed without risk of rework.
Source: human request (direct)

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

### REQ-046
Request ID: REQ-046
Title: Fix button styling on /templates screen
Type: improvement
Status: duplicate
Priority: high
Summary: The "Create Register", "Update Config", and "Deactivate" buttons on the /templates screen suffer from the same styling issues described in REQ-041 — they blend into the page background, look like links rather than buttons, and have inconsistent font sizing.
Notes: Consolidated into UI-017 (derived from REQ-041). /templates is explicitly called out in UI-017's scope so it is not overlooked.
Source: human request (direct)
