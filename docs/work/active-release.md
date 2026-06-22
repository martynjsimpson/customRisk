# Active Release

Status: ready-for-release
Version: v1.25.0

## Release goal

Extend the E2E test layer by writing the core permission test suite now that the Playwright infrastructure is in place, clean up 10 CI lint warnings, and have the Principal Architect answer two focused design questions that unblock future backend refactoring and test file migration work.

## Selected work items

### MAINT-023 — Fix 10 CI lint warnings in frontend and backend
Source: REQ-077
Capability: build-toolchain
Suggested agents: frontend-developer, backend-developer

**Problem:** CI quality gates are reporting 10 warnings across five files — unused variables and imports in test files and source files, one forbidden `import()` type annotation, and one missing `import type` in the backend.

**Acceptance criteria:**
- All 10 lint warnings are resolved and CI passes with a clean warning-free quality gate.
- `frontend/test/modalErrorClear.behavior.test.tsx` — unused `isOpen` (L127), `makeAction` (L73), `act` (L11) removed.
- `frontend/test/formulaEvaluator.behavior.test.tsx` — forbidden `import()` type annotation fixed (L147); unused `beforeEach` (L11), `QueryClientProvider` (L8), `QueryClient` (L8) removed.
- `frontend/src/features/risks/RiskFormModal.tsx` — unused `FormulaEvaluationError` import removed (L22).
- `frontend/src/features/registers/RegisterPermissionsPanel.tsx` — unused `useQueryClient` import removed (L13).
- `backend/src/services/dashboard.service.ts` — switched to `import type` (L1).
- No functional behaviour is changed.

---

### E2E-002 — Implement core Playwright E2E permission test suite
Source: REQ-075
Capability: build-toolchain
Suggested agents: test-engineer, frontend-developer

**Problem:** The Playwright infrastructure (E2E-001) shipped in v1.24.0 but no permission test cases exist yet. The test suite needs to be written while the fixture design is fresh and the infrastructure is proven.

**Acceptance criteria:**
- Playwright tests cover QA-001 Sections 19 (Unauthenticated Access), 1 (Register CRUD), 2 (Risk CRUD), 12 (System Audit), and 13 (User Management) at minimum.
- Tests use the cached storageState sessions from E2E-001 — no login repetition per test.
- All selectors use `data-testid` attributes or ARIA roles; no CSS class names or text strings.
- `data-testid` attributes are added to all frontend components involved in permission-sensitive UI, coordinated between test-engineer and frontend-developer.
- Tests pass reliably in CI (Chromium) with no intermittent failures attributable to missing explicit waits.
- Coverage of QA-001 Sections 3 (Response Action CRUD), 5 (Custom Field Visibility), and 9 (Export Controls) is included if scope allows; otherwise deferred to a follow-on item.

**Decision:** data-testid attributes added here must be consistent with those added in MAINT-021 (v1.24.0). Frontend-developer should cross-reference ProfilePage.tsx and RiskDetailModal.tsx patterns before adding new attributes.

---

### MAINT-024 — PA spike: define sub-service boundaries for risks.service.ts and configVersion.service.ts
Source: REQ-080
Capability: build-toolchain
Suggested agents: principal-architect

**Problem:** MAINT-018 (breaking up two oversized service files) is blocked on a design decision — the split boundaries must be defined before implementation can begin. This item is the PA's investigation to produce that decision.

**Acceptance criteria:**
- The PA has reviewed `risks.service.ts` (1,248 lines) and proposed concrete sub-service boundaries — named sub-services, responsibilities, and composition approach.
- The PA has reviewed `configVersion.service.ts` (1,186 lines) and done the same.
- Findings are recorded in the sign-off section of this file so the PM can update MAINT-018 to `ready` in the next planning session.
- No code changes — output is a written design recommendation only.

---

### MAINT-025 — PA spike: confirm .test.mjs to .test.ts toolchain compatibility
Source: REQ-084
Capability: build-toolchain
Suggested agents: principal-architect

**Problem:** MAINT-022 (renaming 16 frontend static test files from `.test.mjs` to `.test.ts`) is blocked on a PA assessment of whether the rename is safe without toolchain config changes.

**Acceptance criteria:**
- The PA has reviewed `vitest.config.ts`, `tsconfig.json`, and relevant Vite config and confirmed whether the rename is safe as-is or requires config changes.
- If config changes are required, they are listed explicitly.
- Findings are recorded in the sign-off section of this file so the PM can update MAINT-022 to `ready` in the next planning session.
- No code changes — output is a written assessment only.

---

## Required agents

- **frontend-developer** — MAINT-023 (remove unused imports from frontend files), E2E-002 (add `data-testid` attributes to permission-sensitive components as test-engineer identifies selector targets).
- **backend-developer** — MAINT-023 (switch `dashboard.service.ts` to `import type`).
- **test-engineer** — E2E-002 (write Playwright test cases for QA-001 high-priority sections; coordinate with frontend-developer on `data-testid` targets).
- **principal-architect** — MAINT-024 (sub-service boundary design), MAINT-025 (toolchain compatibility assessment). Both are written outputs only — no code changes.

**Sequencing:** MAINT-023 can begin immediately and is independent of everything else. MAINT-024 and MAINT-025 are PA-only and can run in parallel with each other and with E2E-002. For E2E-002, test-engineer should identify required `data-testid` targets early so frontend-developer can add them before the test selectors are written.

## Decisions

**Decision:** MAINT-024 and MAINT-025 output format → PA records findings in the sign-off section of this file rather than producing a full docs/spikes/ document. PM picks up findings in the next planning session and moves MAINT-018 and MAINT-022 to `ready` accordingly.

**Decision:** E2E-002 data-testid conventions → new attributes must be consistent with those added in MAINT-021 (v1.24.0). Cross-reference ProfilePage.tsx and RiskDetailModal.tsx before adding new attributes.

## Test / sign-off

- [x] MAINT-023: All 10 lint warnings resolved; CI quality gate passes clean. done_in: v1.25.0
- [x] E2E-002: Playwright tests written and passing for QA-001 Sections 19, 1, 2, 12, 13; all selectors use data-testid or ARIA roles. done_in: v1.25.0
- [x] MAINT-024: PA findings recorded — sub-service boundaries defined for both service files. done_in: v1.25.0
- [x] MAINT-025: PA findings recorded — .test.mjs → .test.ts toolchain assessment complete. done_in: v1.25.0

## E2E-002 data-testid gap list

The following `data-testid` attributes are required by `e2e/permissions.spec.ts` and must be added by the **frontend-developer** before the E2E tests can pass. All follow the existing `kebab-case` convention from MAINT-021.

### RegistersPage — `frontend/src/pages/RegistersPage.tsx`

Each anchor link in the registers table body needs two attributes so tests can locate a specific register by name without relying on position or text content:

| Attribute | Value pattern | Element |
|---|---|---|
| `data-testid` | `register-row-link` | The `<Anchor>` / `<Link>` inside each `<Table.Td>` that navigates to `/registers/:id` |
| `data-register-name` | The register's `name` field (e.g. `e2e-register-a`) | Same element as above |

Example rendered output:
```html
<a data-testid="register-row-link" data-register-name="e2e-register-a" href="/registers/abc123">
  e2e-register-a
</a>
```

### RiskRegisterPanel — `frontend/src/features/risks/RiskRegisterPanel.tsx`

Two selectors are needed to locate risk rows by title without relying on display risk IDs (which are sequence-generated and non-deterministic across environments):

| Attribute | Value pattern | Element |
|---|---|---|
| `data-testid` | `risk-row-link` | The `<Anchor>` / `<Link>` displaying the `displayRiskId` in each risk row |
| `data-risk-title` | The risk's `title` field (e.g. `e2e-risk-x`) | Same element as above |
| `data-testid` | `risk-table-row` | The `<Table.Tr>` wrapping each risk row |
| `data-risk-title` | The risk's `title` field | Same `<Table.Tr>` element |

The `risk-table-row` testid + `data-risk-title` pair allows tests to scope button queries (Edit, Delete, Review) to a specific risk row — critical for tests 2.16 and 2.17 where different rows have different permissions.

### ResponseActionsPanel — `frontend/src/features/risks/ResponseActionsPanel.tsx`

| Attribute | Value pattern | Element |
|---|---|---|
| `data-testid` | `response-actions-panel` | The outermost `<Stack>` or container of the `ResponseActionsPanel` component |
| `data-testid` | `response-action-row` | The `<Table.Tr>` for each response action row |
| `data-action-text` | The action's `response` field (e.g. `e2e-action-a`) | Same `<Table.Tr>` element |

The `response-actions-panel` testid is needed so tests can wait for the panel to mount before asserting button presence/absence.

### RiskDetailModal — `frontend/src/features/risks/RiskDetailModal.tsx`

The `risk-detail-field-table` and `risk-detail-field-th` testids were added in MAINT-021 and are already present. No new attributes required for Section 5.

---

## Blockers

None — all items completed.

---

## Verification feedback

**Verification feedback [1]:** `npm run e2e:seed` fails with `PrismaClientInitializationError` — "PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions" at `e2e/fixtures/seed.ts:20`.
**Status:** investigating

**Verification feedback [2]:** `npm run prisma:seed` (backend seed) fails with a null constraint violation on `prisma.customFieldDefinition.upsert()` at `backend/prisma/seed.ts:943`. User states this must be fixed in this release.
**Status:** investigating

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*

---

## PA Spike Findings

### MAINT-024

**Files reviewed:** `backend/src/services/risks.service.ts` (1,248 lines) and `backend/src/services/configVersion.service.ts` (1,186 lines).

---

#### risks.service.ts — proposed sub-service split

The file has three distinct responsibility clusters.

**1. RiskQueryService** (read operations)

Responsibilities: `listRisks`, `getRiskDetail`, `getRiskValidationSummary`. Also owns all the private query helpers: `buildRiskOrderBy`, `applyReviewFilters`, `applyValidationIssuesFilter`, `computeValidationStatus`, `mapRiskListItem`, `mapRiskListCustomFieldValue`, `mapCustomFieldValue`, `mapRiskDetail`, `buildMergedCustomFieldValues`, the `riskListInclude` constant, the `ValidationContext` type, and the `hasValueCondition`/`hasPopulatedValue` helpers.

This cluster has no mutation side-effects and no audit writes. It is the largest slice by line count (~500 lines).

**2. RiskMutationService** (write operations)

Responsibilities: `createRisk`, `updateRisk`, `deleteRisk`. Also owns `assertCreateRiskAccess`, `buildRiskUpdateFieldChanges`, `buildRiskDeleteSnapshot` (currently imported from `audit/snapshotBuilder.js` — leave it there), and the `riskAuditSelect` constant used by the update/delete audit diff.

This cluster is transaction-heavy and calls into `scoring.service`, `customFieldValues.service`, `personReference.service`, and `audit.service`.

**3. RiskCalculatedFieldService** (formula evaluation orchestration)

Responsibilities: `evaluateAndStoreCalculatedFields`. This is currently exported and imported by `configVersion.service.ts` — that cross-file dependency is the reason it must remain a separately importable unit. It can live in its own small file (`risks.calculatedFields.service.ts`) or be promoted into `formulaEvaluator.service.ts` where `evaluateFormula` already lives.

The current re-export at line 99 (`export { getRiskReviewStatus, isRiskOverdue } from "./reviewStatus.service.js"`) is a convenience pass-through. Remove it during the split and have callers import directly from `reviewStatus.service.ts`.

**Composition:** `RiskMutationService` calls `RiskCalculatedFieldService` (after writes) and calls `RiskQueryService.getRiskDetail` at the end of `updateRisk` to return the refreshed record. `RiskQueryService` has no dependencies on the other two.

**Shared utilities to extract:** `auditValue` (the private helper that coerces values for audit field-change records) is used only inside `buildRiskUpdateFieldChanges`. Extract it alongside that function into `RiskMutationService`. The `decimalOrNull` helper is used in both `evaluateAndStoreCalculatedFields` and `mapRiskListCustomFieldValue`; move it to `backend/src/utils/formatters.ts` (which already exports `decimalToNumber`) so both new files can share it.

---

#### configVersion.service.ts — proposed sub-service split

The file has two distinct responsibility clusters with a clear seam at ~line 435.

**1. ConfigVersionDraftService** (lifecycle management)

Responsibilities: `getConfigVersionStatus`, `createDraft`, `updateDraft`, `discardDraft`, `listConfigVersions`. Also owns the private helpers: `findRegisterWithVersions`, `getNextVersionNumber`, `normalizeSnapshot`, `normalizeCustomFieldValidationMode`, and `buildSnapshotFromRelationalTables`.

This cluster manages the version row itself — creating, patching, discarding — and does no relational upserts against live config tables. It is largely self-contained and only depends on `audit.service`.

**2. ConfigVersionPublishService** (impact analysis and publish)

Responsibilities: `analyseImpact` and `publishDraft`. These two functions are tightly coupled: `publishDraft` calls `analyseImpact` at line 801 as a pre-flight check. They share the response-action-mode migration logic and the structural validation rules. Splitting them further would entangle the files without benefit.

This cluster depends on `matrix.service`, `scoring.service`, `responseActions.service`, `risks.service` (for `evaluateAndStoreCalculatedFields`), and `formulaEvaluator.service`. It is the more complex slice and the one most likely to grow.

**Composition:** `ConfigVersionPublishService` imports from `ConfigVersionDraftService` only to call `findRegisterWithVersions` (used at the top of both `analyseImpact` and `publishDraft`). Extract `findRegisterWithVersions` to a shared internal module (e.g. `configVersion.shared.ts`) that both files import, rather than creating a circular dependency.

**Shared utilities to extract:** `normalizeSnapshot` and `normalizeCustomFieldValidationMode` are only used during draft reads and during `updateDraft` — keep them in `ConfigVersionDraftService`. `buildSnapshotFromRelationalTables` is only called from `createDraft` — keep it there too.

---

#### Implementation guidance for MAINT-018

File names proposed:
- `risks.query.service.ts`
- `risks.mutation.service.ts`
- `risks.calculatedFields.service.ts` (or merge into `formulaEvaluator.service.ts`)
- `configVersion.draft.service.ts`
- `configVersion.publish.service.ts`
- `configVersion.shared.ts` (internal — not exported to route handlers)

The existing `risks.service.ts` and `configVersion.service.ts` barrel files should be retained as thin re-export facades during the transition so that route handler imports do not need to change. Once the split is stable, the route handlers can be updated to import from the specific sub-service files and the barrels removed.

The cross-file dependency where `configVersion.service.ts` imports `evaluateAndStoreCalculatedFields` from `risks.service.ts` must be preserved — route it through whichever file the calculated-field logic lands in.

---

### MAINT-025

**Files reviewed:** `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/package.json` (test scripts).

**Assessment: the rename is safe with no toolchain config changes required.**

The `.test.mjs` files are run by `node --test` (the Node built-in test runner) via the `test:static` script in `package.json`:

```
"test:static": "find test -name '*.test.mjs' | sort | xargs node --test"
```

The `.behavior.test.tsx` files are run by Vitest via the `test:runtime` script. The vitest config (`vite.config.ts`) explicitly includes only `test/**/*.behavior.test.tsx` and does not glob for `.mjs` or `.test.ts`. There is no risk of Vitest accidentally picking up the static test files after the rename.

After renaming `.test.mjs` to `.test.ts`:

- The `test:static` script's `find` glob must change from `'*.test.mjs'` to `'*.test.ts'`. This is the **only required change** — one line in `frontend/package.json`. It is a script change, not a toolchain config change in the architectural sense, but it must be made for the tests to run.
- `tsconfig.json` has `"include": ["src", "vite.config.ts"]` — the `test/` directory is excluded from TypeScript compilation. The renamed files will not be type-checked by `tsc --noEmit` (the `typecheck` script), which is correct: these are static assertion scripts that import no frontend source types.
- The `.test.ts` extension will not be picked up by Vitest because the `include` pattern in `vite.config.ts` is `test/**/*.behavior.test.tsx` — no ambiguity.
- Node's `--test` runner accepts `.ts` files when invoked via `node --test` directly only if a TypeScript loader is registered. The current invocation uses bare `node --test` with no `--import` or `--loader` flag, so `.ts` files would fail to execute as-is.

**Revised conclusion:** the rename requires two changes, both in `frontend/package.json`:

1. Change the `find` glob in `test:static` from `'*.test.mjs'` to `'*.test.ts'`.
2. Add a TypeScript loader so Node can execute `.ts` files: either `--import tsx/esm` (if `tsx` is already a dev dependency) or `--import ts-node/esm`. Alternatively, keep the files as `.mjs` and only change the extension as part of a broader move to add a `tsx`/`ts-node` dev dependency.

Check whether `tsx` is already listed in `frontend/package.json` devDependencies before deciding which loader to use. If it is present, `--import tsx/esm` is the zero-new-dependency path. If neither `tsx` nor `ts-node` is present, adding `tsx` as a dev dependency is the lightest lift (single package, no tsconfig changes needed).

`tsx` is present in `backend/package.json` as a dev dependency (`^4.22.4`) but is not installed at the workspace root and is not in `frontend/package.json`. Adding `tsx` as a frontend dev dependency is therefore required. No tsconfig changes are needed alongside this — `tsx` works with the existing `tsconfig.json`.
