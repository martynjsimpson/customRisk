# Active Release

Status: in-progress
Version: v1.22.0

## Release goal

Improve production reliability and observability: fix the config draft integrity bug, add structured production logging, and complete the PA spike on the production editions model. By the end of this release: register config changes are stored exclusively through the draft mechanism with no silent overrides; production deployments emit structured, level-controlled logs with operational documentation; and a scoping document for a production editions model exists to guide long-term flag management strategy.

## Selected work items

### BUG-056 — Investigate and fix draft config application across register config pages
Source: REQ-066
Capability: config-lifecycle-templates
Suggested agents: principal-architect, backend-developer, frontend-developer, test-engineer
Status: proposed

**Problem:** Each config change correctly sends a PATCH to /draft, but a subsequent PATCH to `<registerId>` appears to send all settings currently on the local page, which would override the server-side draft with local page state and undermine the draft mechanism. Users may unknowingly lose draft changes or have their published config reflect stale local form state rather than intentional draft edits.

**Acceptance criteria:**
- The Principal Architect has audited all register configuration pages — fields, scoring, and all other config sub-pages — and confirmed which are correctly using draft state vs. incorrectly using local page state.
- Any config page that overwrites the server-side draft with local page state is fixed so changes are stored in the draft and not applied via a direct register PATCH.
- Publishing a draft produces the expected config state regardless of which config pages were used during editing.
- No regression to draft creation, editing, or publish flows.
- If the fix scope is larger than a single release can safely contain, the Release Manager logs remaining items under a Deferred items for PM section in active-release.md.
- Tests cover the draft-only save path for each fixed config section.

**Note for Release Manager:** PA audits first — confirm which pages are using the wrong PATCH target before any backend or frontend work begins. The audit output defines the fix list. Backend and frontend developers work in parallel once the audit is complete. Test Engineer adds coverage after fixes are in.

---

### MAINT-008 — Improve production backend logging with configurable log levels and operational docs
Source: REQ-061
Capability: build-toolchain
Suggested agents: principal-architect, backend-developer, devops-engineer
Status: proposed

**Problem:** Production deployments emit insufficient log information to diagnose live issues. There is no structured log format and no way to control verbosity without code changes.

**Acceptance criteria:**
- The Principal Architect defines the logging approach — structure, correlation strategy, verbosity levels, and how logs flow across the two Docker containers — before implementation begins.
- Backend logging is structured and actionable, going beyond a basic HTTP access log.
- A `LOG_LEVEL` environment variable in `.env` controls logging verbosity (e.g. error, warn, info, debug), with a recommended default for production.
- `docs/operations/observability.md` is created or updated to cover relevant Docker Compose log commands, log levels, recommended production defaults, and when to temporarily increase verbosity for investigation.
- No regression to existing backend behaviour or local development logging.

**Note for Release Manager:** PA goes first — backend developer cannot begin implementation until the logging structure and approach are agreed. Devops engineer writes or reviews the observability.md operational documentation.

---

### SPIKE-004 — Spike: production editions model for feature flag management
Source: REQ-064
Capability: architecture
Suggested agents: principal-architect
Depends on: BUG-055 (done in v1.21.0 — provides real-world context for the spike)
Status: proposed

**Problem:** Production deployments currently rely on arbitrary per-deployment `.env` flag values, creating drift and making flag behaviour unpredictable. A production editions model — fixed, named editions with defined feature sets — would give operators a clean, maintainable way to control features. The approach must also consider how editions might later attach to an org/tenant model.

**Acceptance criteria:**
- A scoping document exists at `docs/spikes/SPIKE-004.md` covering: how editions are defined and where the edition-to-feature mapping lives; how a production deployment selects an edition (e.g. a single `EDITION` env var); how local development retains per-flag flexibility; and how the current featureFlags.ts approach migrates to the editions model.
- The document explicitly addresses the BUG-055 context (now resolved in v1.21.0) — clarifying whether the editions model would have prevented the issue and how it changes the long-term flag management picture.
- The document notes how an edition might later be attached to an org, tenant, or subscription entity (REQ-042/SPIKE-001), so the design does not foreclose that path.
- No implementation work starts in this release — output is the scoping document only.

**Note for Release Manager:** PA-only work item. No other agents required. Output document at `docs/spikes/SPIKE-004.md` following the existing spike convention.

---

## Required agents

- **principal-architect** — BUG-056 (audit all config pages and confirm incorrect paths), MAINT-008 (define logging structure and verbosity model), SPIKE-004 (produce the editions model scoping document). PA work on all three items can begin in parallel.
- **backend-developer** — BUG-056 (fix incorrect register-level PATCH paths once PA audit is complete), MAINT-008 (implement structured logging once PA has confirmed the approach).
- **frontend-developer** — BUG-056 (fix incorrect config page save handlers once PA audit identifies them).
- **test-engineer** — BUG-056 (add/update tests for the draft-only save path on each fixed config section).
- **devops-engineer** — MAINT-008 (write or review docs/operations/observability.md).

**Sequencing:** PA begins BUG-056 audit, MAINT-008 logging design, and SPIKE-004 document in parallel. Backend and frontend developers begin BUG-056 fixes once the PA audit output is available. Backend developer begins MAINT-008 implementation once PA confirms the logging approach. Test Engineer picks up BUG-056 coverage after fixes are in. Devops engineer writes observability.md once the logging approach is agreed.

## Decisions

No open product or UX decisions. All architectural decisions are PA calls in-release.

**Decision:** BUG-056 fix scope → PA audits all config pages and fixes what can be safely fixed in this release; anything too large to contain is deferred via the Deferred items for PM section.

**Decision:** MAINT-008 logging library and structure → PA's architectural call in-release; no PM input required.

**Decision:** SPIKE-004 scope → spike document only; no implementation work in this release regardless of what the PA recommends.

## Test / sign-off

- [ ] BUG-056: PA audit complete and all identified incorrect PATCH paths fixed; publishing a draft produces the expected config state; tests cover the draft-only save path for each fixed section.
- [ ] MAINT-008: Structured logging working in production Docker Compose with LOG_LEVEL controlling verbosity; docs/operations/observability.md created and accurate.
- [ ] SPIKE-004: Scoping document exists at docs/spikes/SPIKE-004.md covering editions definition, deployment selection, local dev override, migration path, and tenant model consideration.

## Blockers

None.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
