# ADR-0008 — Frontend Runtime Test Stack

**Status:** Accepted  
**Date:** 2026-05-20  
**Applies to:** Custom Risk frontend quality gates after v1.5.x  
**Related architecture:** `docs/architecture/technical-architecture.md`  
**Related documents:** `docs/operations/development-workflow.md`

---

## 1. Context

The existing frontend test suite was primarily composed of static source assertions using Node's built-in test runner. Those tests were useful for checking:

- route and feature exposure;
- expected imports and function references;
- package scripts and source-level guardrails.

However, recent draft-configuration regressions showed that these checks were not enough to catch bugs where:

- a button rendered but was not usable in the intended mode;
- a mutation wrote to the wrong backend path;
- a successful save did not visibly update the UI;
- a new item appeared in the wrong place because of ordering logic.

These failures were user-visible and behaviorally significant, but the source still contained the expected hook names and API calls, so the static suite continued to pass.

The project needed a lightweight runtime frontend test layer that could exercise real component behavior without adopting a full browser end-to-end framework for every UI regression.

---

## 2. Decision

Adopt a two-layer frontend testing approach:

| Layer | Decision |
|---|---|
| Static source assertions | Keep the existing `node --test` `.test.mjs` suite |
| Runtime component behavior | Add `vitest` with `jsdom` |
| UI interaction helpers | Use `@testing-library/react` and `@testing-library/user-event` |

Implementation standards:

- `frontend/test/*.test.mjs` remains the home for static source-shape guardrails.
- `frontend/test/*.behavior.test.tsx` is used for runtime behavioral tests.
- Frontend package scripts explicitly run both layers:
  - `test:static`
  - `test:runtime`
  - `test`
- Runtime tests must be used for interaction-heavy regressions involving modal flows, conditional controls, mutation success, or UI refresh behavior.

---

## 3. Decision Drivers

- Preserve the value of the existing lightweight static suite.
- Add behavioral confidence without introducing the cost and maintenance burden of full end-to-end browser automation for every frontend change.
- Catch the specific regression class where the code "looks right" but the UI still behaves incorrectly.
- Keep the setup small enough to run locally and in CI as a routine quality gate.
- Use established React testing tooling with broad familiarity and low integration overhead.

---

## 4. Alternatives Considered

### 4.1 Keep only static source assertions

Rejected because static assertions cannot prove runtime behavior. The recent draft-configuration bugs passed those checks while still breaking the user workflow.

### 4.2 Add only browser end-to-end tests

Rejected as the primary answer because end-to-end coverage is heavier to maintain, slower to execute, and requires more application bootstrapping. It may still be appropriate later for high-value cross-page workflows, but it is not the lightest effective first step.

### 4.3 Use a different component-test runner

Rejected because Vitest integrates naturally with Vite and the existing frontend toolchain, while jsdom and Testing Library are well-understood, widely adopted, and fit the required level of behavior testing.

---

## 5. Consequences

- The frontend test strategy is now explicitly layered rather than implicitly relying on a single style of test.
- Frontend feature work that changes visible behavior may require both static and runtime tests, depending on the regression risk.
- Runtime tests will modestly increase test execution time and maintenance cost, but provide materially better protection against interaction regressions.
- AI-assisted and human implementation workflows must treat runtime behavioral coverage as a normal part of frontend bug fixes where user-visible behavior is involved.
- Future architecture and workflow documentation must describe both frontend test layers consistently.

---

## Amendment — Layer 3 E2E Test Layer (2026-06-21)

**ADR-0011** formally adds Layer 3 (Playwright E2E browser automation) to the test strategy. This supersedes the note in §4.2 above that deferred E2E to the future.

The complete three-layer strategy as of v1.24.0:

| Layer | Tooling | Scope |
|---|---|---|
| 1 — Static source assertions | `node --test` (`.test.mjs`) | Source structure, route exposure, package invariants |
| 2 — Runtime component behavior | Vitest + jsdom + Testing Library (`.behavior.test.tsx`) | Component interaction, mutation success, cache invalidation |
| 3 — E2E browser automation | Playwright (Chromium) | Full-stack flows: login, role access, cross-page workflows |

See `docs/decisions/ADR-0011-e2e-test-layer.md` for the full decision record covering directory structure, authentication strategy, fixture approach, and CI gating policy.
