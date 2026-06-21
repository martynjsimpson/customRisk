# SPIKE-003: Evaluate Playwright for Browser-Based Permission Testing

**Status:** Complete — no implementation  
**Date:** 2026-06-21  
**Author:** Principal Architect  
**Branch:** release/v1.20.0

---

## Context

The current test suite covers permission logic in two static layers and one runtime component layer, as governed by ADR-0008. Neither layer exercises real login sessions, live backend authorisation, or browser-rendered permission states in combination. The permission matrix documented in `docs/engineering/permission-test-plan.md` (QA-001) covers 19 sections and approximately 150 discrete test cases across six roles. This matrix was produced by manual inspection for v1.19.x and will need automated coverage as the system grows.

This spike evaluates whether to adopt Playwright as a third test layer, examines how it would sit alongside the current ADR-0008 layering, and proposes a fixture design and CI integration approach. No Playwright tests are written and no implementation is authorised in this release. An ADR update and implementation plan for the follow-on release are recommended below.

---

## Findings

### 1. Gaps in the Current Test Stack

The existing two-layer backend suite and two-layer frontend suite catch the following:

**Backend (`node --test`, `.test.mjs`):**
- Permission helper functions contain the correct logic (static source assertion).
- Route middleware wires the correct guards (static source assertion).
- Integration tests against a real PostgreSQL instance verify permission enforcement at the HTTP boundary for selected cases.

**Frontend (static `.test.mjs` + Vitest/jsdom `.behavior.test.tsx`):**
- Static tests assert that role-conditional render branches reference the correct variables (`isSystemAdmin`, `canManage`, `canEditRows`, etc.).
- Runtime behavior tests exercise component state, mutation hooks, and modal flows with mocked API responses.

What neither layer exercises:

- A real browser authentication session (cookie issuance, session expiry, redirect-to-login on 401).
- React Router navigation guards in a real browser — for example, whether a Viewer who manually navigates to `/registers/:id/configuration` is redirected or sees a blank page.
- The full round-trip where the backend returns 404 (the hidden-resource denial pattern) and the frontend handles it correctly.
- Cross-role isolation: that a session authenticated as User A cannot access resources owned exclusively by User B, exercised across the real session boundary.
- Register-scoped permission edge cases that require data seeded in specific relational arrangements (e.g. a user who is a Risk Response Owner on Action A linked to Risk X in Register A but has no explicit register role, and therefore cannot see Register B).

These gaps correspond directly to the cross-cutting and cross-role cases in QA-001 Sections 1–3, 5, 9, 12, 13, 16, and 19.

---

### 2. Tool Evaluation: Playwright vs. Alternatives

#### 2.1 Playwright

Playwright is a browser automation framework maintained by Microsoft. It controls Chromium, Firefox, and WebKit from a single test API and is written in TypeScript-first.

Relevant characteristics for this project:

- **TypeScript-native.** Test files are TypeScript; no separate type bindings needed. Fits the project's strict-mode TypeScript constraint.
- **Built-in authentication state management.** `storageState` can serialise and restore authenticated sessions per-role without repeating login steps for every test. This directly supports a multi-role permission matrix.
- **Request interception.** API routes can be mocked or observed to verify that the frontend does not make requests it should not make, or to assert the correct status codes are handled.
- **Parallelism.** Playwright can shard tests across workers and browsers. A permission matrix of 150+ cases runs materially faster in parallel than sequentially.
- **Network condition simulation.** Useful for confirming 401 redirect behaviour under session expiry.
- **No iframe or shadow-DOM limitations.** Mantine components render without workarounds.
- **Widely adopted.** Substantial community, tooling (trace viewer, HTML reporter), and CI integration documentation.
- **License:** Apache 2.0.

Weaknesses:

- Requires a running backend and database, meaning CI needs a full application stack rather than just the Node process.
- Test authoring cost is higher than unit tests — each scenario requires seeded data in the correct state.
- Flakiness risk if tests are not designed around explicit waits and stable selectors.

#### 2.2 Cypress

Cypress is a browser automation framework targeting web applications. It runs tests inside the browser process rather than from outside it.

Relevant characteristics:

- **JavaScript/TypeScript.** TypeScript support is available but configuration overhead is higher than Playwright's TypeScript-first approach.
- **Session management.** `cy.session()` can cache login state per role, but it is less ergonomic than Playwright's `storageState` serialisation for multi-role matrix testing.
- **Parallelism.** Parallelism in Cypress requires a paid Cypress Cloud subscription for orchestration. Free-tier parallelism is manual and requires additional setup.
- **Chrome and Firefox only.** No WebKit coverage by default.
- **License:** MIT (open-source runner), proprietary (Cypress Cloud).

The parallelism limitation is a material factor here. A permission matrix of 150+ cases across 6 roles is well-suited to parallel sharding. Cypress's free-tier parallel story requires more infrastructure than Playwright's built-in worker model. For this project, which is self-hosted and open-source-aligned, the reliance on Cypress Cloud for efficient parallel runs is a constraint.

#### 2.3 Other Candidates

**WebdriverIO** and **TestCafe** were considered and rejected. Both have smaller communities, less Vite/React ecosystem integration, and no material advantage over Playwright for this use case.

**Puppeteer** was rejected. It controls only Chromium and has no built-in test runner structure, test reporting, or multi-browser support. Playwright supersedes it for E2E test scenarios.

#### 2.4 Recommendation

Adopt Playwright. It is TypeScript-native, has the most ergonomic multi-role session management for a permission matrix of this size, supports built-in parallelism without infrastructure cost, and aligns with the project's open-source and self-hosted constraints. The main cost — a full application stack in CI — is manageable given that the existing `ci.yml` already provisions PostgreSQL as a service container.

---

### 3. The Proposed Three-Layer Test Model

ADR-0008 established a two-layer frontend testing approach: static source assertions (`node --test`) and runtime component behavior (Vitest/jsdom). The architecture already noted in ADR-0008 §4.2 that browser end-to-end coverage "may still be appropriate later for high-value cross-page workflows" but was not the right first step at the time.

The proposed model extends the ADR-0008 layering to three layers:

| Layer | Tool | What it tests | Where |
|---|---|---|---|
| 1. Static source assertions | `node --test` | Source shape: imports, function references, route registration, permission guard presence | `backend/test/*.test.mjs`, `frontend/test/*.test.mjs` |
| 2. Runtime component behavior | Vitest + jsdom + Testing Library | Component render logic, mutation hooks, modal flows, conditional UI — with mocked API responses | `frontend/test/*.behavior.test.tsx` |
| 3. Browser E2E | Playwright | Real sessions, real routing, real backend authorisation, cross-role isolation, full-stack permission enforcement | `e2e/` (new top-level directory) |

Layer 3 does not replace Layers 1 and 2. Each layer has a distinct cost profile and catches a distinct failure class:

- Layer 1 is fast (milliseconds), catches structural regressions, runs on every commit.
- Layer 2 is fast-to-moderate (seconds), catches behavioral regressions in components, runs on every commit.
- Layer 3 is slow (minutes), catches integration and session regressions, runs gated (see Section 5).

ADR-0008 is not amended in this release. The follow-on implementation release should produce an Amendment to ADR-0008 that formally adds Layer 3 and documents the `e2e/` directory convention and gating policy.

---

### 4. Permission Fixture Design

#### 4.1 Fixture Goals

The fixtures must cover the permission matrix in `docs/engineering/permission-test-plan.md` (QA-001). That matrix requires:

- Six role types: System Admin, Register Admin, Register Viewer, Risk Owner, Risk Response Owner, authenticated user with no register role.
- At least two registers (Register A and Register B) for cross-register isolation tests.
- Risks in specific ownership states (owned by a named user, not owned by the test user).
- Response actions in specific ownership states.
- Custom fields with different visibility settings.
- Register configuration flags: `allowViewerExport`, `reviewsEnabled`, `allowRiskOwnerCreatedDateOverride`, response action mode (child record mode).

#### 4.2 Named Fixture Users

| Handle | Role(s) | Purpose |
|---|---|---|
| `sys-admin@test.local` | System Admin | Covers all System Admin paths (Sections 1, 2, 5, 7, 9, 12, 13, 14, 15, 16) |
| `reg-admin-a@test.local` | Register Admin on Register A | Covers Register Admin paths within a specific register |
| `reg-viewer-a@test.local` | Register Viewer on Register A | Covers Viewer paths; also used for export flag variants |
| `risk-owner-a@test.local` | Risk Owner on Risk X in Register A (no explicit register role) | Covers derived Risk Owner paths |
| `response-owner-a@test.local` | Risk Response Owner on Action A linked to Risk X (no explicit register role) | Covers derived Response Owner paths; custom field visibility (Section 5) |
| `no-access@test.local` | Authenticated, no register role | Covers Section 1.17, 2.24, 3.23, 19.x |

All accounts use a fixed test password managed via environment variable (`E2E_TEST_PASSWORD`). No production credentials appear in fixtures.

#### 4.3 Named Fixture Data

| Entity | Name | Configuration |
|---|---|---|
| Register A | `e2e-register-a` | `allowViewerExport: false` initially; `reviewsEnabled: true`; child record mode enabled; custom fields F1 (visible to response owners) and F2 (hidden from response owners) |
| Register B | `e2e-register-b` | Minimal configuration; used exclusively for cross-register isolation tests (Sections 1.9, 3.23, 10.8, etc.) |
| Risk X | `e2e-risk-x` | Owner: `risk-owner-a@test.local`; linked to Action A |
| Risk Y | `e2e-risk-y` | Owner: `sys-admin@test.local`; used to verify Risk Owner cannot edit a risk they do not own (Section 2.17) |
| Action A | `e2e-action-a` | Response Owner: `response-owner-a@test.local`; linked to Risk X |
| Action B | `e2e-action-b` | Response Owner: `sys-admin@test.local`; used to verify Response Owner cannot edit an action they do not own (Section 3.21) |

#### 4.4 Seeding Approach: Decoupled from `seed.ts`

The existing `backend/prisma/seed.ts` is a development convenience fixture and must not be coupled to E2E test state. E2E fixtures must be independently reproducible in CI, isolated from development seed data, and deterministic.

The recommended approach is a dedicated E2E seed script at `e2e/fixtures/seed.ts` (compiled and run via `ts-node` or `tsx`). This script:

- Uses the Prisma client directly (not the Express API layer) to insert fixture data in a known state.
- Is idempotent — upserts by stable handle (email address for users, stable name for registers/risks/actions) so re-runs do not duplicate data.
- Is invoked as a CI step before Playwright tests run.
- Is documented as a project-local script, not a Prisma seed hook (to keep `prisma db seed` free for development use).

A teardown companion script (`e2e/fixtures/teardown.ts`) removes all e2e-namespaced data (identifiable by the `@test.local` domain and `e2e-` name prefix) to leave the database clean after a test run.

Cross-user access edges — the cases where User A must specifically not be able to see User B's data — are not left implicit. Each fixture row explicitly documents the intended access state in a comment, for example:

```
// risk-owner-a can view Risk X (owns it); cannot view Risk Y (owned by sys-admin)
// response-owner-a can view Risk X (via Action A); cannot view Register B
```

This makes the fixture intent auditable without reference to the permission matrix document.

---

### 5. CI Integration

#### 5.1 Gating Philosophy

Playwright tests require a running application (frontend + backend + database). They are slower than unit tests and should not block every commit. The recommended policy is:

- **Unit and integration tests (Layers 1 and 2):** run on every PR push via the existing `quality` job in `ci.yml`. Gate merges to `main`.
- **Playwright E2E tests (Layer 3):** run as a separate CI job, `e2e`, gated on the `quality` job passing. The `e2e` job runs on every PR but is allowed to be retried independently of `quality`. It does not block the Docker build job.

This mirrors the pattern already used for the `docker` job: it `needs: quality` but is distinct and independently addressable.

#### 5.2 Proposed CI Job Structure

```yaml
e2e:
  name: E2E Permission Tests
  runs-on: ubuntu-latest
  needs: quality

  services:
    postgres:
      image: postgres:16-alpine
      # (same configuration as quality job)

  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with: { node-version: 24, cache: npm }
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - name: Apply migrations and seed E2E fixtures
      run: |
        printf 'DATABASE_URL=%s\n' "$DATABASE_URL" > backend/.env
        npm run db:migrate
        npm run e2e:seed
    - name: Start application
      run: npm run start:ci &   # backend + frontend served together
    - name: Wait for application ready
      run: npx wait-on http://localhost:3000/api/v1/health
    - name: Run Playwright tests
      run: npx playwright test
    - name: Upload Playwright report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
```

Key decisions in this structure:

- **Chromium only in CI.** Cross-browser coverage (Firefox, WebKit) is a developer-local option, not a CI requirement. The permission matrix is logic-testing, not rendering-testing.
- **Parallel sharding.** Playwright's `--shard` option can be added later if the suite grows. The initial implementation does not need sharding.
- **`wait-on`.** A lightweight HTTP readiness probe replaces fragile `sleep` commands.
- **Artifact upload.** The Playwright HTML report is preserved on failure for investigation.

#### 5.3 Branch Triggering

The `e2e` job runs on the same trigger as `quality`: pull requests and pushes to `main` and `release/*`. It does not run on `push` to feature branches where the `quality` job itself is not triggered — the trigger conditions are inherited.

---

### 6. Implementation Plan for the Follow-on Release

This plan is sequenced so that each step is independently shippable and reviewable. No step should be attempted before the previous one is merged.

**Step 1 — ADR-0008 Amendment**

Produce an Amendment to ADR-0008 that formally:
- Adds Layer 3 (Playwright) to the test strategy.
- Documents the `e2e/` directory as the home for Playwright tests and fixtures.
- Records the CI gating policy (separate `e2e` job, `needs: quality`, Chromium-only in CI).
- Notes the decoupled fixture seeding approach.

This amendment should be reviewed and approved before any Playwright installation or test authoring begins.

**Step 2 — Playwright Installation and Baseline Configuration**

- Add `playwright` as a dev dependency in a new `e2e/` workspace package (or as a root devDependency, depending on monorepo preference to be resolved during Step 1).
- Commit `playwright.config.ts` with base URL, test directory, and reporter configuration.
- Add `e2e:seed` and `e2e:teardown` scripts to the root `package.json`.
- Add the `e2e` job to `ci.yml`.
- No test files yet — the CI job passes vacuously at this step.

**Step 3 — Fixture Seed Script**

Implement `e2e/fixtures/seed.ts` and `e2e/fixtures/teardown.ts` covering all named users, registers, risks, actions, and configuration flags documented in Section 4 of this spike. Verify locally that the seed is idempotent and that teardown is clean.

**Step 4 — Authentication Helpers**

Implement `e2e/auth.setup.ts` using Playwright's `storageState` to log in once per named user and cache the session. This setup file runs before the test suites and produces one `storageState` file per role. All subsequent tests use the cached session rather than repeating the login flow.

**Step 5 — Core Permission Test Suite**

Implement test files covering the highest-priority QA-001 sections:

| Priority | Sections | Rationale |
|---|---|---|
| High | 19 (Unauthenticated Access), 1 (Register CRUD), 12 (System Audit), 13 (User Management) | System-wide access controls; high blast radius if broken |
| High | 2 (Risk CRUD) | Core data entity; complex ownership logic |
| Medium | 3 (Response Action CRUD), 5 (Custom Field Visibility), 9 (Export Controls) | Complex derived permissions |
| Medium | 7 (Configuration Tab), 8 (Permissions Tab) | Administrative surfaces |
| Lower | 4, 6, 10, 11, 14, 15, 16, 17, 18 | Supplementary coverage once core is stable |

**Step 6 — Selector Audit and Stability Pass**

Before the suite is considered production-quality, all selectors must use `data-testid` attributes or ARIA roles rather than CSS class names or text strings. Mantine component class names are internal and subject to version changes. This step adds `data-testid` attributes to the relevant frontend components (a frontend-developer task coordinated with the permission test implementation).

---

## Recommendations

1. **Adopt Playwright** as the E2E test framework. The rationale is documented in Section 2. Cypress is the only credible alternative and is rejected primarily on parallelism cost and session management ergonomics for a multi-role matrix.

2. **Do not amend ADR-0008 in this release.** The spike is an assessment only. The implementation release (v1.21.0 or equivalent) should open with an ADR-0008 Amendment as Step 1 of the implementation plan above. No implementation begins before that amendment is approved.

3. **Use a decoupled E2E seed script**, not `seed.ts`. The `e2e/fixtures/seed.ts` approach documented in Section 4.4 keeps the development fixture and the test fixture independent and idempotent.

4. **Use `docs/engineering/permission-test-plan.md` (QA-001) as the authoritative source for what the E2E suite automates.** The 150-case matrix in that document is the acceptance definition for the E2E suite. Prioritise Sections 19, 1, 2, 12, and 13 first (Step 5 above).

5. **Gate the `e2e` job separately from `quality`.** The existing `quality` job gate protects `main`. The `e2e` job provides additional protection but must not block the development loop. Treat E2E failures as blocking for permission-touching changes and advisory for unrelated changes — this policy can be refined once failure rates are understood in practice.

6. **Restrict CI to Chromium.** The permission matrix tests logic, not rendering. Multi-browser E2E coverage would multiply CI cost with no corresponding permission-coverage benefit.

7. **Use `data-testid` attributes on interactive elements.** Before the test suite is complete, a selector-stability pass (Step 6) must add stable test identifiers to the frontend components involved in permission-sensitive UI. This is a coordinated frontend-developer task and should be scoped into the implementation release.

---

*This spike was produced by reviewing `docs/engineering/permission-test-plan.md` (QA-001), `docs/decisions/ADR-0008-frontend-runtime-test-stack.md`, the backend test suite in `backend/test/`, the frontend test suite in `frontend/test/`, and the CI workflow at `.github/workflows/ci.yml`.*
