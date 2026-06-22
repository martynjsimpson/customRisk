# Active Release

Status: in-progress
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

- [ ] MAINT-023: All 10 lint warnings resolved; CI quality gate passes clean.
- [ ] E2E-002: Playwright tests written and passing for QA-001 Sections 19, 1, 2, 12, 13; all selectors use data-testid or ARIA roles.
- [ ] MAINT-024: PA findings recorded — sub-service boundaries defined for both service files.
- [ ] MAINT-025: PA findings recorded — .test.mjs → .test.ts toolchain assessment complete.

## Blockers

None.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
