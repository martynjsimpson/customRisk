# Active Release

Status: ready-for-release
Version: v1.20.0

## Release goal

Produce a set of investigation and scoping documents that unblock future delivery work, alongside one small bug fix. By the end of this release: coding standards exist for engineers to apply during review; an i18n architecture assessment is available; a comprehensive manual permission test plan exists; a Playwright evaluation spike document scopes the future E2E implementation; and the missing response actions help content is surfaced in the in-app help page.

## Selected work items

### BUG-051 — Surface response actions help content within the risks help section
Source: REQ-067
Capability: help-content
Status: done
done_in: v1.20.0

**Problem:** `frontend/public/help/en/response-actions.md` was written as part of v1.19.0 but was never wired into the in-app help page. Users cannot discover response action documentation from the help UI.

**Acceptance criteria:**
- The response actions help content from `frontend/public/help/en/response-actions.md` is reachable from within the risks section of the in-app help page.
- Response actions content is not a standalone tab — it is a subsection of the risks help article, appearing in a logical position after core risk management content.
- The developer may merge the file into the risks help article or keep it as a separate file that is included/referenced — whichever is cleaner — as long as the content is reachable from the risks section.
- No regression to other help content or help page navigation.

---

### MAINT-010 — Establish coding standards for frontend, backend, and test code
Source: REQ-069
Capability: build-toolchain
Status: done
done_in: v1.20.0

**Problem:** No agreed coding standards exist for the project. Engineers and reviewers have no shared reference for when to refactor, how to structure components and services, or how to write and maintain tests.

**Acceptance criteria:**
- A coding standards document is created at `docs/engineering/coding-standards.md` (new directory).
- Standards cover backend concerns: DRY, consistency, service layer patterns, separation of concerns, error handling, and when to refactor rather than extend.
- Standards cover frontend concerns: component reuse, avoiding duplicate UI patterns, when shared components or hooks are appropriate, and state management consistency.
- Standards cover test writing: when tests are required, what level of test is appropriate, naming and structure conventions, fixture usage, avoiding brittle assertions, and regression coverage expectations.
- Clear refactoring triggers are included for both frontend and backend — concrete signals that indicate code should be refactored rather than extended in place.
- The document is practical enough to reference during a code review.

---

### SPIKE-005 — Spike: internationalisation architecture assessment
Source: REQ-068
Capability: architecture
Status: done
done_in: v1.20.0

**Problem:** No i18n architecture assessment exists. If multi-language support becomes a requirement, the team has no agreed approach for how to add it across the frontend, backend, help content, validation messages, and configuration labels.

**Acceptance criteria:**
- A spike document exists at `docs/spikes/SPIKE-005.md` covering: frontend string externalisation approach (i18n library recommendation, translation file structure, locale selection); backend-generated text (error messages, audit summaries); help content locale management (relationship to the existing `frontend/public/help/en/` structure); validation message localisation; and user-visible configuration labels.
- The document covers date, number, and currency formatting and recommends a consistent approach across frontend and backend.
- The document identifies the areas of the app requiring the most refactoring and recommends a sequencing that allows incremental progress.
- The document flags any third-party library recommendations and assesses their fit with the existing Vite/React/Node/Mantine stack.
- No implementation work is started as part of this spike.

---

### QA-001 — Write manual permission test plan covering all role and content-type permutations
Source: REQ-056
Capability: build-toolchain
Status: done
done_in: v1.20.0

**Problem:** No comprehensive permission test plan exists. There is no authoritative reference document describing what each role can and cannot do across every entity type — making it difficult to verify permission correctness manually or to scope automated permission testing.

**Acceptance criteria:**
- A document exists at `docs/engineering/permission-test-plan.md` covering every role in the system — System Admin, Register Admin, Register Editor, Register Viewer, Risk Owner, Risk Response Owner — against every permission-gated action and entity type.
- Each test case specifies: the role or persona, the entity/action being tested, and the expected outcome (allowed or denied).
- The plan covers at minimum: register CRUD, risk CRUD, custom field visibility, response action CRUD and ownership, review actions, configuration and permissions tab access, export controls, audit log access, user management, template management, and API key management.
- The document is structured as a pass/fail checklist executable by a human tester without needing code access.
- The document is reviewed against the PRD permission model (§5, §12) to confirm no gaps.

---

### SPIKE-003 — Spike: evaluate Playwright for browser-based permission testing
Source: REQ-057
Capability: build-toolchain
Status: done
done_in: v1.20.0
Depends on: QA-001

**Problem:** Current static and Vitest/jsdom tests do not fully exercise real login sessions, routing, backend authorisation, and browser-rendered permission states together. Before committing to Playwright (or any alternative), the architecture and implementation approach should be evaluated and documented.

**Acceptance criteria:**
- A spike document exists at `docs/spikes/SPIKE-003.md` covering: whether to adopt Playwright vs. alternatives (Cypress, etc.) and the rationale; the proposed three-layer test model (static, Vitest/jsdom runtime, Playwright E2E) and its relationship to ADR-0008; the permission fixture design — named users, named registers, named risks and actions, explicit cross-user access edges — and how it would be seeded without coupling to `seed.ts`; the proposed CI integration approach including how Playwright tests would be gated separately from unit/integration tests; and a scoped implementation plan with sequencing for a follow-on release.
- The document explicitly references QA-001 as the source of truth for the permission matrix the future suite will automate.
- ADR-0008 is assessed in the document but not updated in this release — any update is deferred to the implementation release.
- No Playwright tests are written in this release.

---

## Required agents

- **principal-architect** — MAINT-010 (coding standards document), SPIKE-005 (i18n architecture assessment), SPIKE-003 (Playwright evaluation spike document). PA may work on MAINT-010 and SPIKE-005 in parallel. SPIKE-003 must start after QA-001 is complete.
- **test-engineer** — QA-001 (manual permission test plan). Can begin immediately with no dependencies.
- **frontend-developer** — BUG-051 (surface response actions help). Small independent change; can be done at any point in the release.

**Sequencing:** test-engineer and frontend-developer can begin immediately. PA begins MAINT-010 and SPIKE-005 immediately in parallel. SPIKE-003 starts after QA-001 is delivered — PA reviews QA-001 before producing the Playwright spike document.

## Decisions

No open decisions. All scoping questions were resolved during refinement.

**Decision:** SPIKE-003 scope → evaluation and spike document only. No Playwright implementation in this release. Implementation is scoped in a follow-on release using the spike document as input.

**Decision:** Response actions help → fold into risks help section as a subsection, not a standalone tab.

**Decision:** Coding standards → output at `docs/engineering/` (new directory created as part of MAINT-010).

**Decision:** Permission test plan → output at `docs/engineering/permission-test-plan.md`.

## Test / sign-off

- [x] BUG-051: Help page verified — response actions content reachable from risks section, no regression to other help tabs
- [x] MAINT-010: Coding standards document reviewed by PM and confirmed fit for purpose before MAINT-011/012/013 audits begin
- [x] SPIKE-005: i18n spike document reviewed and accepted
- [x] QA-001: Permission test plan reviewed against PRD §5 and §12 for completeness
- [x] SPIKE-003: Playwright spike document reviewed and accepted; confirms no implementation starts until a follow-on release is approved

## Blockers

None.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
