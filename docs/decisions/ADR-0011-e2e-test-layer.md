# ADR-0011 — E2E Test Layer (Playwright)

**Status:** Accepted  
**Date:** 2026-06-21  
**Applies to:** customRisk full-stack E2E quality gates from v1.24.0 onwards  
**Related architecture:** `docs/architecture/technical-architecture.md`  
**Related ADRs:** ADR-0008 — Frontend Runtime Test Stack (amended)

---

## 1. Context

The existing test strategy covers two layers:

- **Layer 1 — Static source assertions:** `node --test` `.test.mjs` files in `frontend/test/`. Low-cost guardrails for route exposure and structural invariants.
- **Layer 2 — Runtime component behavior:** Vitest + jsdom + Testing Library in `frontend/test/*.behavior.test.tsx`. Exercises real component logic in a simulated browser environment.

Neither layer exercises the full stack. They cannot verify that:

- a real API call from the browser produces the expected UI state;
- role-based access controls work end-to-end from login to a restricted page;
- multi-step user workflows (e.g. creating a risk register, adding a risk, triggering a review) complete correctly when all system components are running together.

High-value cross-page workflows remain untested at the integration boundary, and post-MVP feature velocity is increasing the risk of regressions in these flows.

---

## 2. Decision

Add **Layer 3 — E2E browser automation** using Playwright.

| Layer | Tooling | Scope |
|---|---|---|
| 1 — Static source assertions | `node --test` (`.test.mjs`) | Source structure, route exposure, package invariants |
| 2 — Runtime component behavior | Vitest + jsdom + Testing Library (`.behavior.test.tsx`) | Component interaction, mutation success, cache invalidation |
| 3 — E2E browser automation | Playwright (Chromium) | Full-stack flows: login, role access, cross-page workflows |

Playwright runs against the full application (backend + frontend) on `http://localhost:5173`.

### 2.1 Browser Target

Chromium only. Cross-browser coverage is not a current requirement; the application targets a controlled internal user base. This keeps CI execution time low and avoids browser-specific flakiness.

### 2.2 Directory Structure

```text
e2e/
  fixtures/
    seed.ts          # Idempotent fixture seeder (run before test suites)
    teardown.ts      # Clean teardown (run after test suites)
  auth/
    .auth/           # storageState files (gitignored): admin.json, viewer.json, editor.json
  tests/             # Test files organised by feature domain
```

The `e2e/` directory lives at the repository root, alongside `frontend/` and `backend/`. This placement reflects that E2E tests are a cross-cutting concern — they are not owned by either workspace.

### 2.3 Authentication Strategy

Each role that appears in E2E tests has a cached authentication state (Playwright `storageState`). A dedicated setup project logs in once per role and writes the resulting browser storage to `e2e/auth/.auth/<role>.json`. Individual tests load this state via `use: { storageState }` rather than performing a login flow per test. This avoids repeated login overhead and keeps test files focused on the scenario under test.

The `.auth/` directory is gitignored. Session files are generated at the start of each CI run and during local test execution.

### 2.4 Fixture Strategy

| File | Purpose | Idempotency |
|---|---|---|
| `e2e/fixtures/seed.ts` | Creates the stable data set each test suite depends on (registers, risks, users, config) | Idempotent — safe to run multiple times; will not duplicate records |
| `e2e/fixtures/teardown.ts` | Removes E2E-created records and resets state to a clean baseline | Destructive — intended for post-suite cleanup only |

Both scripts are invoked via root `package.json` scripts (`e2e:seed`, `e2e:teardown`) so they can be run independently of the Playwright runner.

### 2.5 CI Gating Policy

- E2E tests run as a dedicated `e2e` job in CI.
- The `e2e` job depends on the `quality` job passing (unit and runtime tests must pass first).
- Chromium only; no parallel browser matrix.
- On failure, Playwright HTML report artifacts are uploaded for diagnosis.
- E2E failures block merge.

### 2.6 Configuration

The `playwright.config.ts` file at the repository root is the single configuration point. Key settings:

- `testDir: './e2e'`
- `baseURL: 'http://localhost:5173'`
- Reporter: `html` (default, generates report at `playwright-report/`) plus `list` for CI stdout
- `use.storageState` is set per project (admin, viewer, editor) where applicable

---

## 3. Decision Drivers

- Provide confidence in full-stack flows that neither Layer 1 nor Layer 2 can cover.
- Keep the browser target minimal (Chromium only) to avoid flakiness and CI cost.
- Reuse Playwright's built-in `storageState` mechanism rather than building a custom auth helper.
- Idempotent seeding allows local re-runs without needing a database reset between runs.
- Separate teardown script gives CI the option to run cleanup as a post-job step.

---

## 4. Alternatives Considered

### 4.1 Extend Vitest + jsdom to cover more integration scenarios

Rejected. jsdom does not execute a real network stack or a real browser rendering engine. It cannot test server-side permission enforcement, real HTTP responses, or browser-native behaviour (navigation, history, cookies). The gap between jsdom and a real browser grows as test scenarios become more cross-cutting.

### 4.2 Use Cypress instead of Playwright

Rejected. Playwright is the current industry standard for new projects. It has first-class TypeScript support, a simpler `storageState`-based auth model, and native support for multiple browser engines under one API. Cypress has historically had limitations around iframes and multi-tab scenarios that are not relevant today but were a tiebreaker against it. The team has no existing Cypress investment.

### 4.3 Run E2E tests against a staging environment only

Rejected as the default mode. Running against staging introduces deployment lag and environment drift. Local execution against the full stack (via `docker compose up` or separate dev server processes) is the primary model. CI runs against the same local full-stack setup within the workflow.

---

## 5. Consequences

- Layer 3 is added to the official test strategy and supersedes the note in ADR-0008 §4.2 that deferred E2E to the future.
- The `e2e/` directory is established at the repository root. It is owned jointly by the test engineer (fixture and test authorship) and the devops engineer (CI job wiring).
- The principal architect owns the `playwright.config.ts` shape and any future changes to the CI gating policy.
- Playwright and its browser binaries become a dev dependency. Browser binaries are installed via `npx playwright install --with-deps chromium` and are not committed to the repository.
- The `e2e:seed` and `e2e:teardown` scripts are registered in root `package.json` and must remain in sync with the fixture files.
- Test authors must not write E2E tests that depend on non-idempotent state or assume a specific database record ID. All fixture data must be seeded by `e2e/fixtures/seed.ts`.
