# Active Release

Status: ready-for-release
Version: v1.26.0

## Release goal

A focused maintenance release: split two oversized backend service files into well-bounded sub-services (following the PA's v1.25.0 design), migrate the 16 frontend static test files to the .test.ts coding standard, and land two small devops housekeeping items (Playwright show-report localhost fix and actions/checkout bump).

## Selected work items

### MAINT-018 — Break up risks.service.ts and configVersion.service.ts into sub-services
Status: done
done_in: v1.26.0
Source: REQ-080
Capability: build-toolchain
Suggested agents: backend-developer, test-engineer

**Problem:** Both service files carry multiple distinct responsibilities at over 1,200 lines each. The PA defined concrete sub-service boundaries in v1.25.0 (MAINT-024). Implementation can now proceed without further design work.

**Sub-service structure:**

*risks.service.ts → three files:*
- `risks.query.service.ts` — listRisks, getRiskDetail, getRiskValidationSummary and all read-only helpers (buildRiskOrderBy, applyReviewFilters, applyValidationIssuesFilter, computeValidationStatus, mapRiskListItem, mapRiskListCustomFieldValue, mapCustomFieldValue, mapRiskDetail, buildMergedCustomFieldValues, riskListInclude constant, ValidationContext type, hasValueCondition/hasPopulatedValue helpers). No mutation side-effects, no audit writes.
- `risks.mutation.service.ts` — createRisk, updateRisk, deleteRisk and their helpers (assertCreateRiskAccess, buildRiskUpdateFieldChanges, riskAuditSelect constant, auditValue helper). Transaction-heavy; calls scoring.service, customFieldValues.service, personReference.service, audit.service.
- `risks.calculatedFields.service.ts` — evaluateAndStoreCalculatedFields only. Kept as a standalone file in the risks domain (not merged into formulaEvaluator.service.ts) so configVersion can import it without crossing domain boundaries and so formulaEvaluator.service.ts remains a pure evaluation engine.

*configVersion.service.ts → two files + one internal shared module:*
- `configVersion.draft.service.ts` — getConfigVersionStatus, createDraft, updateDraft, discardDraft, listConfigVersions and their private helpers (getNextVersionNumber, normalizeSnapshot, normalizeCustomFieldValidationMode, buildSnapshotFromRelationalTables). Depends only on audit.service.
- `configVersion.publish.service.ts` — analyseImpact + publishDraft (kept together — tightly coupled, publishDraft calls analyseImpact as a pre-flight check). Depends on matrix.service, scoring.service, responseActions.service, risks.calculatedFields.service, formulaEvaluator.service.
- `configVersion.shared.ts` (internal, not exported to route handlers) — findRegisterWithVersions only. Used by both draft and publish files; extracted here to avoid a circular dependency.

**Decision:** evaluateAndStoreCalculatedFields → `risks.calculatedFields.service.ts` (Option A — standalone file, not merged into formulaEvaluator.service.ts).

**Decision:** Barrel facades — the existing `risks.service.ts` and `configVersion.service.ts` files are retained as thin re-export facades in this release so route handler imports do not need to change. Callers remain unchanged. Removing the barrels is a follow-on task.

**Decision:** decimalOrNull helper → extract to `backend/src/utils/formatters.ts` (already exports decimalToNumber) so both risks.query.service.ts and risks.calculatedFields.service.ts can share it without a circular dependency.

**Decision:** Re-export at risks.service.ts line 99 (getRiskReviewStatus, isRiskOverdue from reviewStatus.service.ts) — remove from the barrel and have callers import directly from reviewStatus.service.ts.

**Acceptance criteria:**
- risks.service.ts is split into risks.query.service.ts, risks.mutation.service.ts, and risks.calculatedFields.service.ts per the boundaries above.
- configVersion.service.ts is split into configVersion.draft.service.ts, configVersion.publish.service.ts, and configVersion.shared.ts per the boundaries above.
- decimalOrNull is extracted to backend/src/utils/formatters.ts.
- The re-export of getRiskReviewStatus and isRiskOverdue is removed from the barrel; all callers import directly from reviewStatus.service.ts.
- The existing risks.service.ts and configVersion.service.ts barrel files remain as thin re-export facades — no route handler import paths change in this release.
- All existing backend tests pass with no behaviour change.
- New tests added for any logic that gains its own surface area through the split.

---

### MAINT-022 — Migrate frontend static test files from .test.mjs to .test.ts
Status: done
done_in: v1.26.0
Source: REQ-084
Capability: build-toolchain
Suggested agents: frontend-developer, test-engineer

**Problem:** All 16 frontend static test files use the .test.mjs extension; the coding standard says .test.ts. PA confirmed in v1.25.0 (MAINT-025) that the rename is safe with exactly two changes to frontend/package.json — no vitest.config.ts or tsconfig.json changes required.

**Decision:** Two required changes to frontend/package.json alongside the rename:
1. Change the find glob in the `test:static` script from `'*.test.mjs'` to `'*.test.ts'`.
2. Add `tsx` as a dev dependency and add `--import tsx/esm` to the `node --test` invocation so Node can execute .ts files. (tsx is already a backend dev dependency at ^4.22.4 but is not in frontend/package.json.)

**Decision:** No vitest.config.ts or tsconfig.json changes needed. Vitest's include pattern (`test/**/*.behavior.test.tsx`) does not match .test.ts files, so there is no risk of Vitest picking up renamed static tests.

**Acceptance criteria:**
- All 16 .test.mjs files in frontend/test/ are renamed to .test.ts.
- The find glob in test:static in frontend/package.json is changed from '*.test.mjs' to '*.test.ts'.
- tsx is added as a dev dependency in frontend/package.json and --import tsx/esm is added to the node --test invocation.
- All 16 tests pass after the rename.
- No regression to the frontend build, Vitest runtime tests, or CI pipeline.

---

### MAINT-026 — Fix Playwright show-report localhost binding on macOS
Status: done
done_in: v1.26.0
Source: REQ-087
Capability: build-toolchain
Suggested agents: devops-engineer

**Problem:** npx playwright show-report binds to 127.0.0.1:9323 but Firefox on macOS resolves localhost to IPv6 (::1), causing "Unable to connect". Deferred from v1.25.0.

**Decision:** Fix by adding `--host 127.0.0.1` to the show-report invocation in root package.json. No Playwright config file change needed.

**Acceptance criteria:**
- The show-report script in root package.json passes --host 127.0.0.1 to npx playwright show-report.
- Opening the reported URL in Firefox on macOS connects successfully without manually substituting 127.0.0.1.
- No regression to the Playwright test run or CI pipeline.

---

### MAINT-027 — Bump actions/checkout from v6 to v7 in GitHub Actions workflows
Status: done
done_in: v1.26.0
Source: REQ-086
Capability: build-toolchain
Suggested agents: devops-engineer

**Problem:** GitHub Actions workflows reference actions/checkout@v6. This should be bumped to @v7.

**Acceptance criteria:**
- All references to actions/checkout@v6 in .github/workflows/ are updated to actions/checkout@v7.
- CI passes cleanly after the change.

---

## Required agents

- **backend-developer** — MAINT-018 (split both service files, extract decimalOrNull, remove re-export, update barrel facades).
- **test-engineer** — MAINT-018 (run full backend test suite after both splits are complete; add new tests for any logic gaining its own surface area), MAINT-022 (verify all 16 static tests pass after rename).
- **frontend-developer** — MAINT-022 (rename 16 files, update frontend/package.json with new glob and tsx dependency).
- **devops-engineer** — MAINT-026 (show-report localhost fix), MAINT-027 (actions/checkout bump).

**Sequencing:** MAINT-026 and MAINT-027 are fully independent and can run in any order. MAINT-022 frontend-developer work is independent of MAINT-018. For MAINT-018, the backend-developer should complete both service file splits before the test-engineer does a full verification pass — splitting one at a time is fine, but the test run is more efficient after both are done.

## Decisions

**Decision:** evaluateAndStoreCalculatedFields → `risks.calculatedFields.service.ts` (standalone file, not merged into formulaEvaluator.service.ts).

**Decision:** Barrel facades retained in this release — risks.service.ts and configVersion.service.ts kept as thin re-exports, no route handler import changes. Barrel removal is a follow-on task.

**Decision:** decimalOrNull → extract to backend/src/utils/formatters.ts.

**Decision:** Remove the getRiskReviewStatus/isRiskOverdue re-export from the risks.service.ts barrel; update callers to import directly from reviewStatus.service.ts.

**Decision:** MAINT-022 package.json changes — test:static glob updated to '*.test.ts', tsx added as frontend dev dependency with --import tsx/esm loader. No vitest or tsconfig changes.

**Decision:** MAINT-026 fix location — root package.json show-report script, --host 127.0.0.1 flag.

## Test / sign-off

- [x] MAINT-018: risks.service.ts split complete; all backend tests pass.
- [x] MAINT-018: configVersion.service.ts split complete; all backend tests pass.
- [x] MAINT-022: All 16 .test.mjs files renamed to .test.ts; all 16 pass via test:static.
- [x] MAINT-026: show-report --host 127.0.0.1 flag confirmed present.
- [x] MAINT-027: CI passes with actions/checkout@v7.
- [x] Full suite: 541 tests pass, 0 fail. Typecheck green across all workspaces.

## Blockers

None.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
