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

*(empty)*

## Refined requests

### REQ-093
Request ID: REQ-093
Title: Decide linkedTemplateVersionId policy for manual draft publishes
Type: feature
Status: in-active-release
Priority: low
Summary: When a linked register publishes a manual draft (not a template-origin draft), linkedTemplateVersionId is not updated — the register remains linked at the same template version. Whether this is the correct policy (stay linked, drift silently) or whether the register should auto-unlink when the admin diverges via a manual draft has never been explicitly decided.
Notes: PM decision made — option 1: stay linked at the current template version. Publishing a manual draft does NOT auto-unlink the register. Current backend behaviour is already correct; no code change needed. Help content must explain this behaviour: publishing a manual draft does not change the register's template link, and the drift banner will alert the admin if the template advances further. This help content note is captured in UI-024's acceptance criteria.
Work items: UI-024
Source: extracted from abandoned v1.27.0 (SPIKE-008 deferred items)

### REQ-088
Request ID: REQ-088
Title: Fix broken create-register-from-template function
Type: bug
Status: in-active-release
Priority: critical
Summary: The "create register from template" feature throws a PrismaClientValidationError at runtime. The error occurs in `registers.service.ts` line 700 inside a `$transaction` block where `tx.register.create()` is called with `createdByUserId` and `updatedByUserId` scalar fields but without the required `createdBy` relation. Prisma 7.8.0 is rejecting the invocation because the `createdBy` relation argument is missing.
Notes: Error: "Argument `createdBy` is missing." in `tx.register.create()`. The fix is likely to replace or supplement the scalar `createdByUserId`/`updatedByUserId` fields with a `createdBy: { connect: { id: <userId> } }` relation connect, matching how other register creates in the codebase are structured. Stack trace correlationId: 7f39d6ba-ef11-48b0-96f0-17f2c3973135.
Work items: BUG-058
Source: human request (direct)

### REQ-090
Request ID: REQ-090
Title: Fix broken Prisma seed file
Type: bug
Status: in-active-release
Priority: high
Summary: The `backend/prisma/seed.ts` file is broken, likely due to incomplete or conflicting changes left over from the abandoned v1.27.0 release. This will affect local development setup and any CI steps that run the seed.
Notes: Suspected cause is partial v1.27.0 work that was not cleaned up when that release was abandoned. Investigate what schema or data changes were introduced and whether seed.ts needs to be reverted or updated to match the current schema. Confirmed 2026-08-23: reproduces via both `npm run seed:admin` and `npm run db:setup`. Fails at `backend/prisma/seed.ts:548` in `prisma.register.upsert()` with "The column `review_comment_mode of relation register` does not exist in the current database". `prisma migrate deploy` reports all 19 migrations applied and none pending, so the seed writes a column the schema no longer has — the v1.27.0 remnant BUG-059 predicted. System Admin upsert succeeds first; the failure is in the demo-register loop.
Work items: BUG-059
Source: human request (direct)

### REQ-091
Request ID: REQ-091
Title: Fix createRegisterFromTemplate — does not copy reviewCommentMode, scoringFormula, responseActionMode
Type: bug
Status: in-active-release
Priority: high
Summary: The createRegisterFromTemplate function omits reviewCommentMode, scoringFormula, and responseActionMode from the tx.register.create call. Registers created from templates that encode non-default values for these three fields silently start with wrong values (defaults). This is a pre-existing bug unrelated to the draft unification work.
Notes: Root cause identified in SPIKE-008 deferred items. Note: this is distinct from REQ-088 (which is a Prisma crash in the same function due to a missing createdBy relation). Both bugs exist independently. Fix for this item is to include the three fields in the tx.register.create call.
Work items: BUG-060
Source: extracted from abandoned v1.27.0 (SPIKE-008 deferred items)

### REQ-092
Request ID: REQ-092
Title: Fix Template Compare modal — shows empty diff when only reviewCommentMode, scoringFormula, or responseActionMode differ
Type: bug
Status: in-active-release
Priority: high
Summary: The compareRegisterToTemplate function omits reviewCommentMode, scoringFormula, and responseActionMode from its registerSettingsKeys array. A template update that changes only these fields shows "no differences" in the Compare modal even though the register is genuinely out of sync. Actively misleading.
Notes: Root cause identified in SPIKE-008 deferred items. Fix is to add the three fields to registerSettingsKeys in compareRegisterToTemplate.
Work items: BUG-061
Source: extracted from abandoned v1.27.0 (SPIKE-008 deferred items)

### REQ-005
Request ID: REQ-005
Title: Add child actions and stronger review workflows so treatment work can be tracked properly
Type: feature
Status: partially-done
Done in: v1.19.0
Priority: high
Summary: Users need first-class response actions, richer review rules, and better ownership tracking instead of relying on a simple risk field.
Notes: PM7-CORE (child-record response actions) shipped in v1.19.0. PM8-CORE (risk review completeness — comment mode, attestation text UI, review history panel) is blocked pending the unified draft system prerequisite (DRAFT-UNIFIED).
Work items: PM7-CORE, PM8-CORE
Source: migrated from old planning

### REQ-043
Request ID: REQ-043
Title: Spike: encryption of client data at rest
Type: feature
Status: refined
Priority: medium
Summary: Investigate and scope encryption of data at rest, with a focus on PII and other sensitive fields — though full encryption of all client data should be considered. This is likely to be closely related to or absorbed into REQ-042 (SaaS multi-tenant spike) as a key security requirement for any hosted offering.
Notes: Scoping should cover which fields/tables warrant encryption, key management strategy, and the performance and complexity trade-offs of field-level vs. full database encryption. The spike should also cover Bring Your Own Key (BYOK) — allowing clients to supply and manage their own encryption keys — so that tenants retain full control over their data and the platform operator cannot access it without the client's key.
Work items: SPIKE-002
Source: human request (direct)

### REQ-042
Request ID: REQ-042
Title: Spike: SaaS multi-tenant architecture for COTS hosting
Type: feature
Status: refined
Priority: low
Summary: Explore what it would take to offer customRisk as a commercially hosted SaaS product. This is a large scoping exercise covering architecture decisions, required code changes, and data isolation strategy. Key areas to address include: self-serve sign-up and onboarding, an organisation/tenant model with full data isolation between tenants, authentication and authorisation changes, and any infrastructure or deployment changes needed to support multiple isolated customers on shared infrastructure.
Notes: User flagged this as requiring a dedicated scoping exercise before any implementation work is planned. Treat as a spike/discovery item rather than a deliverable work item for now. The scoping should also cover "super admin" / platform manager controls — the tools the platform operator would need to manage tenants, investigate issues, and fix problems, while preserving customer data safety and privacy (e.g. impersonation with audit trail, tenant suspension, data access controls that prevent casual browsing of customer data).
Work items: SPIKE-001
Source: human request (direct)

### REQ-021
Request ID: REQ-021
Title: Overhaul the homepage — it has not been updated since MVP
Type: improvement
Status: refined
Priority: medium
Summary: The homepage has not received meaningful attention since the initial MVP and needs a significant rework. The PM should assess what a post-MVP homepage should offer, potentially overlapping with or superseding any existing planned work in this area.
Notes: User flagged this may conflict with already-planned work — check backlog for related items before scoping.
Work items: UI-013
Source: human request (direct)

### REQ-008
Request ID: REQ-008
Title: Add attachments and evidence support so users can keep supporting files with risks, actions, and reviews
Type: feature
Status: refined
Priority: medium
Summary: Users need to upload, view, and manage supporting files with clear storage, permission, and audit controls.
Notes: Storage architecture is decided in ADR-0006, but the product implementation is still open.
Work items: PM12-CORE
Source: migrated from old planning

### REQ-001
Request ID: REQ-001
Title: Finish saved views and reporting foundations so users can keep and reuse their working views
Type: feature
Status: partially-done
Done in: v1.9.0
Priority: high
Summary: Users need reusable personal views, safer report/export behaviour, and a clearer reporting foundation instead of relying only on ad hoc table state.
Notes: Personal saved views (filters, sort, column state) shipped in v1.9.0. Report builder, charts, shared views, scheduled reports, CSV import, and export polish remain open. Evidence: `backend/src/services/savedViews.service.ts`, `frontend/src/features/risks/SavedViewsPanel.tsx`, `backend/test/savedViews.test.mjs`, `frontend/test/savedViews.behavior.test.tsx`
Work items: PM11-01, PM10-CORE
Source: migrated from old planning

### REQ-002
Request ID: REQ-002
Title: Let users and administrators manage API keys safely for integrations and offboarding
Type: security
Status: partially-done
Done in: v1.9.0
Priority: high
Summary: The product needs safe API key creation, listing, revocation, and audit coverage without exposing secrets.
Notes: User self-service and admin API key management shipped in v1.9.0 (PM13-01). Keys are inherit-user-permissions scoped. API key request authentication and deactivated-user enforcement remain deferred as PM13-03. Evidence: `backend/src/services/apiKeys.service.ts`, `backend/src/routes/apiKeys.routes.ts`, `backend/src/routes/users.routes.ts`, `frontend/src/pages/ApiKeysPage.tsx`, `frontend/src/pages/ProfilePage.tsx`, `backend/test/apiKeys.test.mjs`
Work items: PM13-01, PM13-03
Source: migrated from old planning

### REQ-003
Request ID: REQ-003
Title: Support advanced custom field behaviour and safer validation rules
Type: feature
Status: partially-done
Done in: v1.7.0
Priority: high
Summary: Register admins need stronger custom field behaviour, including validation modes, calculated behaviour, visibility rules, and safe lifecycle controls.
Notes: Validation modes, multi-select fields, calculated fields, and field visibility controls shipped in v1.7.0 and the PM5-CORE audit confirmed every acceptance criterion. Re-checked 2026-08-23: the response-owner field-visibility gap that PM5-CORE left open has since been closed by PM7-CORE (v1.19.0) — `visibleToRiskResponseOwners` is now enforced server-side in `backend/src/services/risks.query.service.ts` and respected in `RiskDetailModal.tsx`, so nothing remains there. The only outstanding scope is whether custom-field visibility should also govern risk CSV export (currently core columns only); that decision is deliberately carried by PM10-CORE, which is `ready` in the backlog, so this request stays partially-done rather than spawning a duplicate. Evidence: `backend/src/services/customFields.service.ts`, `backend/src/services/formulaEvaluator.service.ts`, `frontend/src/features/configuration/CustomFieldModal.tsx`, `backend/test/formulaEvaluator.test.mjs`
Work items: PM5-CORE
Source: migrated from old planning

### REQ-004
Request ID: REQ-004
Title: Improve scoring and residual risk support for more advanced methodologies
Type: feature
Status: partially-done
Done in: v1.17.0
Priority: high
Summary: The platform needs configurable formulas, inherent and residual risk support, and related workflow behaviour to support more mature risk methods.
Notes: Basic scoring, matrix behaviour, and calculated-field formula support exist. Configurable score formula engine (PM6-SCORING) shipped in v1.17.0. Inherent/residual mode (PM6-CORE) is deferred until after PM7-CORE (child actions). Residual suggestions (PM6-RESIDUAL-SUGGESTIONS) follow after both. Evidence: `backend/src/services/scoring.service.ts`, `backend/src/services/matrix.service.ts`, `backend/src/services/formulaEvaluator.service.ts`, `backend/test/riskScoring.test.mjs`
Work items: PM6-SCORING, PM6-CORE, PM6-RESIDUAL-SUGGESTIONS
Source: migrated from old planning

### REQ-007
Request ID: REQ-007
Title: Add safer import, export, and data portability workflows
Type: improvement
Status: partially-done
Done in: v1.9.0
Priority: medium
Summary: Operators need more complete data movement support, especially CSV import and more polished exports, without breaking permissions or auditability.
Notes: Risk CSV export, audit CSV export, and config bundle import/export exist, but CSV import and the broader portability workflow still remain. Evidence: `backend/src/services/export.service.ts`, `backend/src/services/audit.service.ts`, `backend/src/services/configExport.service.ts`, `backend/src/services/configImport.service.ts`
Work items: PM10-CORE
Source: migrated from old planning

### REQ-010
Request ID: REQ-010
Title: Improve person-assignment administration so unresolved owners and audit gaps are visible
Type: improvement
Status: partially-done
Done in: v1.9.0
Priority: medium
Summary: Admins need a clean way to find unresolved person references and understand assignment changes without reopening already shipped person-reference work.
Notes: Core person-reference support and a system-admin unresolved-person route exist, but there is still no clear evidence of a completed admin UI or fully closed assignment-audit coverage. Evidence: `backend/src/routes/persons.routes.ts`, `backend/src/services/personReference.service.ts`, `backend/test/personReferences.test.mjs`
Work items: PM2-05A
Source: migrated from old planning

## Done

### REQ-086
Request ID: REQ-086
Title: Bump actions/checkout from v6 to v7
Type: maintenance
Status: done
Done in: v1.26.0
Priority: low
Summary: The GitHub Actions workflow is using actions/checkout@v6. This should be bumped to v7 to stay current with the latest stable release.
Work items: MAINT-027
Source: human request (direct)

### REQ-087
Request ID: REQ-087
Title: Fix Playwright show-report localhost binding on macOS
Type: maintenance
Status: done
Done in: v1.26.0
Priority: low
Summary: npx playwright show-report binds to 127.0.0.1:9323 but Firefox on macOS resolves localhost to IPv6, causing "Unable to connect". Workaround is to navigate to 127.0.0.1:9323 directly. Fix is to add --host 127.0.0.1 to the show-report invocation in root package.json.
Work items: MAINT-026
Source: deferred from v1.25.0

### REQ-084
Request ID: REQ-084
Title: Migrate frontend static tests from .test.mjs to .test.ts
Type: maintenance
Status: done
Done in: v1.26.0
Priority: low
Summary: All 16 frontend static tests use .test.mjs extension; the coding standard says .test.ts. This is an architectural decision — requires Principal Architect review before any rename proceeds, as it may affect module resolution, toolchain config, or other tooling.
Work items: MAINT-022
Source: deferred from v1.23.0 (MAINT-013)

### REQ-083
Request ID: REQ-083
Title: Fix brittle querySelector usage in three frontend test files
Type: maintenance
Status: done
Done in: v1.24.0
Priority: medium
Summary: passwordStrength.behavior.test.tsx, apiKeys.behavior.test.tsx, and riskDetailModal.behavior.test.tsx use brittle DOM selectors (querySelector). Fixing requires adding aria-label or data-testid attributes to the relevant source components, so this involves both the frontend developer and the test code.
Work items: MAINT-021
Source: deferred from v1.23.0 (MAINT-013)

### REQ-082
Request ID: REQ-082
Title: Restructure myRisks.test.mjs to use describe blocks
Type: maintenance
Status: done
Done in: v1.24.0
Priority: low
Summary: 17 tests in myRisks.test.mjs are currently separated by inline comments rather than describe blocks, contrary to the coding standard. Restructuring requires intentional coordination as test name changes affect test run output and any CI reporting that references test names.
Work items: MAINT-020
Source: deferred from v1.23.0 (MAINT-013)

### REQ-081
Request ID: REQ-081
Title: Add opening block comments to test files missing them
Type: maintenance
Status: done
Done in: v1.24.0
Priority: low
Summary: Approximately 38 test files (24 backend, 14 frontend static) are missing required opening block comments per the coding standard. Low risk, high volume — recommend adding them incrementally during upcoming releases rather than in a single dedicated pass.
Work items: MAINT-019
Source: deferred from v1.23.0 (MAINT-013)

### REQ-080
Request ID: REQ-080
Title: Break up oversized backend service files
Type: maintenance
Status: done
Done in: v1.26.0
Priority: medium
Summary: risks.service.ts (1,248 lines) and configVersion.service.ts (1,186 lines) each carry multiple distinct responsibilities and warrant extraction into sub-services. Requires Principal Architect review before implementation to agree the correct split boundaries.
Work items: MAINT-018
Source: deferred from v1.23.0 (MAINT-012)

### REQ-079
Request ID: REQ-079
Title: Extract duplicated utility functions to backend/src/utils/
Type: maintenance
Status: done
Done in: v1.24.0
Priority: medium
Summary: toDateOnlyString and decimalToNumber are duplicated across four service files (risks.service.ts, reviews.service.ts, dashboard.service.ts, customFieldValues.service.ts). Both should be extracted to a shared backend/src/utils/ module. Multi-file change across high-traffic services — warrants dedicated coverage and care.
Work items: MAINT-017
Source: deferred from v1.23.0 (MAINT-012)

### REQ-078
Request ID: REQ-078
Title: Extract large page components into feature components
Type: maintenance
Status: done
Done in: v1.24.0
Priority: medium
Summary: RegisterDetailPage.tsx, UsersPage.tsx, and MyRisksPage.tsx each contain substantial logic and JSX (~80–300 lines each) that should be extracted into dedicated feature components. Each requires its own feature directory and careful extraction to avoid regressions.
Work items: MAINT-016
Source: deferred from v1.23.0 (MAINT-011)

### REQ-075
Request ID: REQ-075
Title: Implement Playwright E2E permission test suite
Type: feature
Status: done
Done in: v1.24.0, v1.25.0
Priority: medium
Summary: Adopt Playwright as a third test layer (E2E) to cover real browser sessions, live backend authorisation, and cross-role permission isolation — gaps that Layers 1 and 2 cannot exercise. Implementation follows the 6-step plan in docs/spikes/SPIKE-003.md. Two work items: E2E-001 (infrastructure) and E2E-002 (core permission test suite).
Notes: E2E-001 (Playwright infrastructure) shipped in v1.24.0; E2E-002 (core permission test suite) shipped in v1.25.0.
Work items: E2E-001, E2E-002
Source: deferred from SPIKE-003

### REQ-085
Request ID: REQ-085
Title: Fix 10 CI lint warnings in frontend and backend
Type: maintenance
Status: done
Done in: v1.25.0
Priority: medium
Summary: CI quality gates were reporting 10 warnings across several files — unused variable/import declarations in test files and source files, plus one forbidden import() type annotation and one missing import type usage in the backend.
Notes: Affected files: frontend/test/modalErrorClear.behavior.test.tsx (unused: isOpen L127, makeAction L73, act L11); frontend/test/formulaEvaluator.behavior.test.tsx (forbidden import() type annotation L147, unused: beforeEach L11, QueryClientProvider L8, QueryClient L8); frontend/src/features/risks/RiskFormModal.tsx (unused: FormulaEvaluationError L22); frontend/src/features/registers/RegisterPermissionsPanel.tsx (unused: useQueryClient L13); backend/src/services/dashboard.service.ts (use import type L1). Note: originally logged as REQ-077 (ID collision with i18n request); renumbered to REQ-085.
Work items: MAINT-023
Source: human request (direct)

### REQ-074
Request ID: REQ-074
Title: Admin summary widget shows deleted registers
Type: bug
Status: done
Done in: v1.23.0
Priority: high
Summary: On the home page, the Admin summary widget (which shows all registers) is incorrectly including registers that have been marked as deleted. Deleted registers should be excluded from this view. This likely means the widget query is missing a filter on the deleted/soft-delete flag.
Work items: BUG-057
Source: human request (direct)

### REQ-073
Request ID: REQ-073
Title: Refresh seed scripts
Type: maintenance
Status: done
Done in: v1.23.0
Priority: medium
Summary: Seed data was last meaningfully updated 2026-05-18 (pre-v1.7.0). Gaps confirmed: no custom fields, no response action child records, no custom scoring formula, no completed reviews. Scoped refresh covers all four gaps.
Work items: MAINT-014
Source: human request (direct)

### REQ-072
Request ID: REQ-072
Title: Audit test coding standards
Type: maintenance
Status: done
Done in: v1.23.0
Priority: medium
Summary: Test Engineer assesses all test code against the standards from REQ-069/MAINT-010. Actionable findings; quick fixes in-release, larger items deferred to PM.
Work items: MAINT-013
Source: human request (direct)

### REQ-071
Request ID: REQ-071
Title: Audit backend coding standards
Type: maintenance
Status: done
Done in: v1.23.0
Priority: medium
Summary: Backend Developer assesses all backend code against the standards from REQ-069/MAINT-010. Actionable findings; quick fixes in-release, larger items deferred to PM.
Work items: MAINT-012
Source: human request (direct)

### REQ-070
Request ID: REQ-070
Title: Audit frontend coding standards
Type: maintenance
Status: done
Done in: v1.23.0
Priority: medium
Summary: Frontend Developer assesses all frontend code against the standards from REQ-069/MAINT-010. Actionable findings; quick fixes in-release, larger items deferred to PM.
Work items: MAINT-011
Source: human request (direct)

## Deferred / rejected

### REQ-076
Request ID: REQ-076
Title: Implement production editions model for feature flag management
Type: feature
Status: deferred
Priority: low
Summary: Replace per-deployment arbitrary flag combinations with named, fixed editions. PM direction: three editions — "free", "professional", and "enterprise". Implementation is low-risk once editions are defined — adds editions.ts, updates featureFlags.ts, and logs the resolved edition at startup. Blocked on PM decision: which of the 10 current flags each edition enables.
Notes: Deferred — not a near-term priority. Revisit if editions become commercially relevant.
Work items: MAINT-015
Source: deferred from SPIKE-004

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
Work items: I18N-001
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
Work items: PM3-CORE
Source: migrated from old planning

### REQ-012
Request ID: REQ-012
Title: Extend the template library beyond the shipped baseline with richer lifecycle, preview, and starter-content flows
Type: feature
Status: deferred
Priority: medium
Summary: The current template baseline is implemented, but broader template-library ideas such as richer lifecycle states, preview metadata, optional starter risks, and future local-template patterns are not yet planned for delivery.
Notes: This request exists so those post-baseline template ideas do not live only in `docs/product/feature-register-template-library.md` before that file is removed.
Work items: PM4-TEMPLATE-EXTENSIONS
Source: distilled from product extension doc

### REQ-006
Request ID: REQ-006
Title: Add notifications and reminders so review and action follow-up does not rely on manual chasing
Type: feature
Status: deferred
Priority: medium
Summary: Notifications matter, but the action and review model should settle first to avoid rework.
Notes: Keep this refined, but do not pull it into the first release candidate yet.
Work items: PM9-CORE
Source: migrated from old planning

### REQ-046
Request ID: REQ-046
Title: Fix button styling on /templates screen
Type: improvement
Status: duplicate
Priority: high
Summary: The "Create Register", "Update Config", and "Deactivate" buttons on the /templates screen suffer from the same styling issues described in REQ-041 — they blend into the page background, look like links rather than buttons, and have inconsistent font sizing.
Notes: Consolidated into UI-017 (derived from REQ-041). /templates is explicitly called out in UI-017's scope so it is not overlooked.
Source: human request (direct)
