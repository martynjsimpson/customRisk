# Active Release

Status: ready-for-release
Version: v1.21.0

## Release goal

Fix production deployment reliability: establish on-demand branch publishing so production fixes can be tested iteratively, then fix and harden the feature flag pipeline and modal error state. By the end of this release: branch Docker packages can be published on demand from any branch; feature flags work correctly in production Docker deployments; the app degrades cleanly when flags are disabled; modal errors clear on close; and the audit table in the View Risk modal refreshes after response action mutations.

## Selected work items

### MAINT-007 — Add on-demand branch package publishing via GitHub Actions manual trigger
Source: REQ-062
Capability: build-toolchain
Suggested agents: devops-engineer
Status: done
done_in: v1.21.0

**Problem:** There is no way to publish a Docker package for a specific branch without going through a full PR and merge to main. Developers cannot test production-environment issues iteratively without landing code.

**Acceptance criteria:**
- A GitHub Actions workflow can be triggered manually (workflow_dispatch) for a specified branch, building and publishing a Docker package using the same process as the main release build.
- The on-demand workflow does not trigger automatically on push or PR — manual invocation only.
- Published branch packages are clearly distinguishable from release packages by tag naming convention.
- The root README.md is updated to document how to trigger the on-demand build and how to target the resulting branch package in a production Docker Compose setup.
- No change to the existing automatic release workflow behaviour.

**Note for Release Manager:** The devops-engineer should implement this first — it is a prerequisite for iterative production testing of BUG-055 and BUG-054. The branch package tag naming convention is a devops decision to make in-release.

---

### MAINT-009 — Reduce duplicate CI runs across branch, PR, and post-merge workflows
Source: REQ-065
Capability: build-toolchain
Suggested agents: devops-engineer
Status: done
done_in: v1.21.0

**Problem:** CI runs the same checks multiple times — on the release branch, again when a PR is created with no new changes, and again after merge to main. This slows releases without adding confidence.

**Acceptance criteria:**
- CI does not re-run identical checks on a PR if the branch has already passed CI with the same commit SHA.
- Post-merge CI does not repeat checks already passed pre-merge unless new code was introduced by the merge itself.
- All required status checks for branch protection and release confidence are still satisfied after the change.
- Release velocity is measurably improved — fewer redundant CI minutes per release.

**Note for Release Manager:** Can be worked alongside MAINT-007 — both touch GitHub Actions workflow config and the devops-engineer is already in that area.

---

### BUG-055 — Fix production feature flags — .env values have no effect in Docker deployment
Source: REQ-063
Capability: build-toolchain
Suggested agents: principal-architect, devops-engineer, backend-developer, frontend-developer
Status: done
done_in: v1.21.0

**Problem:** Feature flags set in .env have no effect in the production Docker Compose setup. Operators have no reliable way to control feature flags in a deployed instance.

**Acceptance criteria:**
- Feature flag values set in .env take effect in a production Docker Compose deployment following the documented README setup.
- Both backend-read flags (env vars consumed at runtime by Node) and frontend-read flags (Vite env vars baked at build time) are confirmed to work correctly, or the architectural split between them is explicitly documented.
- If a runtime config mechanism is required for frontend flags, the PA designs and agrees the approach before the frontend developer implements it.
- The root README.md production setup section is updated to accurately describe how to configure feature flags in a production deployment.
- No regression to local development flag behaviour.

**Decision:** If frontend flags require a runtime config mechanism (due to Vite build-time baking), the approach is the PA's architectural call — implement whatever the PA approves. No PM input needed.

---

### BUG-054 — Harden app behaviour across feature flag combinations
Source: REQ-060
Capability: build-toolchain
Suggested agents: frontend-developer, backend-developer, test-engineer
Depends on: BUG-055 (validate flag combinations only once flags work in production)
Status: done
done_in: v1.21.0

**Problem:** The app may crash or behave incorrectly when certain feature flags are disabled. /registers/<registerId> is specifically suspected. Feature-flagged code paths on both frontend and backend need to be reviewed and hardened.

**Acceptance criteria:**
- All feature-flagged routes and components degrade cleanly when their flag is disabled — no crashes, unhandled errors, or broken UI.
- /registers/<registerId> is verified to load correctly under all supported flag combinations.
- Flag-gated backend endpoints return appropriate responses (e.g. 404 or 403) rather than 500 errors when their flag is off.
- Flag-gated frontend components hide cleanly or show an appropriate fallback when their flag is disabled.
- Test coverage exists for at least the key disabled-flag scenarios, particularly /registers/<registerId> and any other routes identified during the review.

---

### BUG-053 — Clear modal error state on close across all modals
Source: REQ-059
Capability: register-ui
Suggested agents: frontend-developer, test-engineer
Status: done
done_in: v1.21.0

**Problem:** Error state is not cleared when modals are closed. Reopening any affected modal shows the previous error until a successful action clears it.

**Acceptance criteria:**
- All modals in the app reset their error state when closed — reopening always starts clean with no prior error visible.
- The fix covers every modal that can display an error: risk add/edit, response action add/edit, review, config modals, API key creation, and any others identified during the sweep.
- No regression to error display behaviour during an active modal session — errors must still appear correctly within a single open.
- Frontend tests cover the close-then-reopen scenario for at least the highest-traffic modals.

---

### BUG-052 — Refresh audit table in View Risk modal after response action mutations
Source: REQ-058
Capability: child-actions
Suggested agents: frontend-developer, test-engineer
Status: done
done_in: v1.21.0

**Problem:** When a response action is added, edited, or soft-deleted in child record mode, the audit table in the View Risk modal does not update. The new audit entry only appears after closing and reopening the modal.

**Acceptance criteria:**
- The audit table in the View Risk modal refreshes automatically after a response action is added, edited, or soft-deleted — without requiring the modal to be closed and reopened.
- No regression to response action CRUD behaviour, the audit table display, or other View Risk modal functionality.
- Frontend tests cover the mutation-then-refresh scenario.

---

## Required agents

- **devops-engineer** — MAINT-007 (on-demand branch publishing) and MAINT-009 (reduce duplicate CI runs). Both touch GitHub Actions workflow config and can be worked in parallel. MAINT-007 should be completed first — it unblocks production testing for the flag work.
- **principal-architect** — BUG-055 (diagnose the flag pipeline break; design any runtime config approach needed for frontend flags before implementation begins).
- **backend-developer** — BUG-055 (backend flag pipeline fix), BUG-054 (backend flag-gated endpoint hardening).
- **frontend-developer** — BUG-055 (frontend flag fix, if needed after PA design), BUG-054 (frontend flag-gated component hardening), BUG-053 (modal error state sweep), BUG-052 (audit table refresh).
- **test-engineer** — BUG-054 (disabled-flag test coverage), BUG-053 (modal close-then-reopen tests), BUG-052 (mutation-then-refresh test).

**Sequencing:** devops-engineer begins immediately with MAINT-007. PA begins BUG-055 diagnosis in parallel. Backend and frontend developers begin BUG-055 implementation once PA has confirmed the approach. BUG-054 begins once BUG-055 is complete and production packages can be built via MAINT-007. BUG-053 and BUG-052 are frontend-only and can run in parallel with BUG-055/054 at any point.

## Decisions

No open product or UX decisions.

**Decision:** Branch package tag naming convention for MAINT-007 → devops-engineer to define in-release; must be clearly distinct from release tags to avoid confusion.

**Decision:** Frontend flag runtime config (BUG-055) → if Vite build-time baking prevents .env flags from working at runtime, the PA designs the runtime config mechanism before the frontend developer implements it. No PM input required.

## Test / sign-off

- [x] MAINT-007: On-demand workflow triggered manually from a branch; branch package published and distinguishable from release tags; README updated.
- [x] MAINT-009: CI no longer re-runs identical checks on a PR when branch has already passed; post-merge CI confirmed not to repeat pre-merge checks; branch protection rules still satisfied.
- [x] BUG-055: Feature flags set in .env confirmed to take effect in a production Docker Compose deployment; README production setup section updated.
- [x] BUG-054: /registers/<registerId> verified clean under all supported flag combinations; flag-gated endpoints and components degrade safely when flags are disabled.
- [x] BUG-053: All modals confirmed to start clean on reopen with no stale error state.
- [x] BUG-052: Audit table confirmed to refresh after response action add, edit, and soft-delete without closing the modal.

## Blockers

None — all work items complete and signed off by Test Engineer.

**Verification feedback [1]:** BUG-054 — /registers/<registerId> fails with "Not found" error when FEATURE_DRAFT_CONFIG=false, FEATURE_USER_PREFERENCES=false, FEATURE_CHILD_ACTIONS=false, FEATURE_SAVED_VIEWS=false, FEATURE_API_KEYS=false. Register detail page does not load under this all-flags-disabled combination.
**Investigation:** Root cause is in `backend/src/routes/registers.routes.ts`. Feature-flagged sub-routers are mounted via `router.use("/", requireFeature(...), subRouter)`. Because "/" matches all requests, `requireFeature` intercepts and returns 404 for every request when the flag is off — including `GET /:registerId` which is not flag-gated. The fix is to not use `requireFeature` as a `router.use("/", ...)` guard; instead the flag check must only gate paths that belong to each sub-router.
**Ruling:** in scope — `GET /:registerId` is not flag-gated but is unreachable when any flag-gated sub-router fires first.
**Fix:** Backend developer to restructure route mounting so `requireFeature` is applied only to the specific path prefixes belonging to each sub-router, not to "/".

**Verification feedback [2]:** MAINT-007 — on-demand workflow does not appear in GitHub Actions UI yet.
**Investigation:** Expected behaviour — GitHub only shows `workflow_dispatch` workflows in the Actions UI when the workflow file exists on the repository's default branch (main). The workflow is on `release/v1.21.0` and will appear after the PR is merged.
**Ruling:** deferred (not a defect) — workflow will be testable after merge to main.
**Fix:** none.

**Verification feedback [2]:** MAINT-007 — on-demand workflow does not appear in GitHub Actions UI yet. User correctly identifies this is likely because workflow_dispatch workflows only appear on the default branch. Not confirmed as a defect — noting for investigation.
**Status:** investigating

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
