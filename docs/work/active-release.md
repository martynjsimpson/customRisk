# Active Release

Status: in-progress
Version: v1.24.0

## Release goal

Complete the maintenance debt surfaced by the v1.23.0 code audits and lay the foundation for browser-based E2E permission testing. By the end of this release: page components are extracted from the three oversized page files; shared backend utility functions are no longer duplicated across services; test files have opening block comments, stable selectors, and consistent describe structure; and the Playwright E2E infrastructure (ADR amendment, fixtures, auth helpers, CI job) is in place and ready for E2E-002 to write test cases against.

## Selected work items

### MAINT-016 — Extract feature components from large page files
Source: REQ-078
Capability: build-toolchain
Suggested agents: frontend-developer, test-engineer
Status: proposed

**Problem:** RegisterDetailPage.tsx, UsersPage.tsx, and MyRisksPage.tsx each contain substantial inline logic and JSX (~80–300 lines) that should live in dedicated feature components. The page files should be thin composition layers.

**Acceptance criteria:**
- RegisterDetailPage.tsx, UsersPage.tsx, and MyRisksPage.tsx are each refactored so that logic and JSX are extracted into feature components in appropriately named feature directories.
- The page files become thin composition layers.
- No regression to existing behaviour, routing, or UI on any of the three pages.
- Existing tests continue to pass; new tests added for any extracted components that expose testable logic.

---

### MAINT-017 — Extract shared utility functions to backend/src/utils/
Source: REQ-079
Capability: build-toolchain
Suggested agents: backend-developer, test-engineer
Status: proposed

**Problem:** `toDateOnlyString` and `decimalToNumber` are duplicated across four service files (`risks.service.ts`, `reviews.service.ts`, `dashboard.service.ts`, `customFieldValues.service.ts`).

**Acceptance criteria:**
- `toDateOnlyString` is defined once in `backend/src/utils/` and imported by all four service files.
- `decimalToNumber` is defined once in `backend/src/utils/` and imported by all four service files.
- No duplicated copies of either function remain in service files.
- All existing tests pass with no behaviour change.
- Unit tests for the extracted utilities exist or are confirmed covered by existing service-level tests.

---

### MAINT-019 — Add opening block comments to test files missing them
Source: REQ-081
Capability: build-toolchain
Suggested agents: backend-developer, frontend-developer, test-engineer
Status: proposed

**Problem:** Approximately 38 test files (24 backend, 14 frontend static) are missing required opening block comments per the coding standard in `docs/engineering/coding-standards.md`.

**Acceptance criteria:**
- All backend test files under `backend/test/` have an opening block comment per the standard.
- All frontend static test files under `frontend/test/` have an opening block comment per the standard.
- No test behaviour or assertions are changed — comment additions only.

---

### MAINT-020 — Restructure myRisks.test.mjs to use describe blocks
Source: REQ-082
Capability: build-toolchain
Suggested agents: test-engineer
Status: proposed

**Problem:** 17 tests in `myRisks.test.mjs` are separated by inline comments rather than `describe` blocks, contrary to the coding standard.

**Acceptance criteria:**
- All 17 tests are grouped into appropriate `describe` blocks instead of relying on inline comments for structure.
- Test names within each `describe` block are meaningful in context with no duplication of the describe label.
- All 17 tests continue to pass.
- No test logic or assertions are changed — restructuring only.

---

### MAINT-021 — Replace brittle querySelector selectors in three frontend test files
Source: REQ-083
Capability: build-toolchain
Suggested agents: frontend-developer, test-engineer
Status: proposed

**Problem:** `passwordStrength.behavior.test.tsx`, `apiKeys.behavior.test.tsx`, and `riskDetailModal.behavior.test.tsx` use brittle DOM `querySelector` selectors. Fixing requires `aria-label` or `data-testid` attributes to be added to the relevant source components.

**Acceptance criteria:**
- All three test files no longer use `querySelector` — all selectors use `aria-label`, `data-testid`, or ARIA role queries.
- The relevant source components have the required `aria-label` or `data-testid` attributes added.
- All affected tests continue to pass with the new selectors.
- Attributes added are consistent with the data-testid conventions that E2E-002 will rely on.

---

### E2E-001 — Set up Playwright E2E test infrastructure
Source: REQ-075
Capability: build-toolchain
Suggested agents: principal-architect, test-engineer, devops-engineer
Status: proposed

**Problem:** No E2E test layer exists. Before test cases can be written (E2E-002), the infrastructure must be in place: an amended ADR, Playwright installed and configured, fixture seed/teardown scripts, per-role auth helpers, a CI job, and an operations doc.

**Acceptance criteria:**
- An amendment to ADR-0008 formally adds Layer 3 (Playwright) to the test strategy, documents the `e2e/` directory, and records the CI gating policy. Amendment reviewed before any other E2E-001 work begins.
- Playwright is installed as a dev dependency with `playwright.config.ts` committed (base URL, test directory, reporter).
- `e2e/fixtures/seed.ts` and `e2e/fixtures/teardown.ts` are implemented per SPIKE-003.md Section 4 — covering all named users, registers, risks, actions, and configuration flags. Seed is idempotent; teardown is clean.
- `e2e/auth.setup.ts` is implemented using `storageState` — one cached session file per named role.
- The e2e CI job is added to `ci.yml` gated on quality, Chromium-only, with artifact upload on failure. Passes with no test files present.
- `e2e:seed` and `e2e:teardown` scripts are added to the root `package.json`.
- `docs/operations/e2e-testing.md` covers prerequisites, env vars, running the suite locally, running a single test, viewing the HTML report, and how the CI job is triggered.

---

## Required agents

- **principal-architect** — E2E-001 Steps 1–2 (ADR-0008 amendment, Playwright install and config). Must complete the ADR amendment before test-engineer begins E2E-001 fixture work.
- **backend-developer** — MAINT-017 (utility extraction), MAINT-019 (backend test block comments).
- **frontend-developer** — MAINT-016 (page component extraction), MAINT-021 (add data-testid/aria-label to source components and update test selectors), MAINT-019 (frontend static test block comments).
- **test-engineer** — MAINT-019 (any remaining test block comments), MAINT-020 (myRisks describe restructure), MAINT-021 (test selector updates — coordinate with frontend-developer), E2E-001 (fixture seed/teardown and auth setup — begins after PA's ADR amendment).
- **devops-engineer** — E2E-001 (CI job in `ci.yml` — can work in parallel with test-engineer after PA's ADR amendment).

**Sequencing:** MAINT-017, MAINT-019, MAINT-020, and MAINT-016 can all begin immediately in parallel. MAINT-021 requires frontend-developer to add attributes before test-engineer updates selectors — coordinate within the item. E2E-001: PA's ADR amendment is Step 1 and must land before test-engineer or devops-engineer begin their E2E-001 tasks.

## Decisions

No open product or UX decisions. All items are implementation-ready.

**Decision:** MAINT-016 extraction boundaries and feature directory naming → developer judgment call during implementation. The developer should identify natural component boundaries in each file before extracting.

**Decision:** MAINT-019 block comment coverage → all three agent types (backend-developer, frontend-developer, test-engineer) should each handle the files within their domain during the same release to complete the sweep in one pass.

**Decision:** MAINT-021 data-testid conventions → prefer `data-testid` over `aria-label` where the element has no meaningful ARIA role. Attributes must be consistent with E2E-002 naming conventions — frontend-developer should note any patterns established here in a comment or in the E2E-001 operations doc for E2E-002 to follow.

## Test / sign-off

- [ ] MAINT-016: All three page files refactored; existing tests pass; new component tests added where logic is testable.
- [ ] MAINT-017: Both utilities extracted to `backend/src/utils/`; no duplicates remain; all backend tests pass.
- [ ] MAINT-019: All ~38 affected test files have opening block comments; no test behaviour changed.
- [ ] MAINT-020: `myRisks.test.mjs` uses describe blocks; all 17 tests pass.
- [ ] MAINT-021: No `querySelector` in the three test files; source components have stable attributes; all tests pass.
- [ ] E2E-001: ADR-0008 amendment committed; Playwright installed; fixture seed/teardown run cleanly; auth setup produces one storageState file per role; CI e2e job passes with no test files; operations doc committed.

## Blockers

None.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
