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

## PA Audit — BUG-056

**Date:** 2026-06-21
**Auditor:** Principal Architect

### Backend PATCH endpoints confirmed

`PATCH /api/v1/registers/:registerId` — handled by `updateRegisterController` in `backend/src/controllers/registers.controller.ts`. Accepts general register fields: name, description, riskIdPrefix, riskIdZeroPaddingEnabled/Width, reviewsEnabled, defaultReviewFrequencyMonths, allowViewerExport, customFieldValidationEnabled, responseActionMode, reviewStatusPosition.

`PATCH /api/v1/registers/:registerId/config-versions/draft` — handled in `backend/src/routes/configVersion.routes.ts`. This is the correct draft-only path. Updates the draft snapshot in place.

The two paths are distinct. The first overwrites live register fields. The second updates draft config. When `draftConfig` flag is on, changes to scoring/field configuration should go exclusively to the draft endpoint.

### Per-page audit

**RegisterSettingsTab.tsx — INCORRECT (partial)**

`updateSettingsMutation` calls `updateRegister(registerId, ...)` via `PATCH /:registerId`. This fires on form blur when `draftConfigMode` is true (see `handleFormBlur`). It also fires on explicit Save button click (only shown when `!draftConfigMode`), and on form submit.

The blur handler `handleFormBlur` fires `updateSettingsMutation.mutate()` unconditionally when `draftConfigMode && !event.currentTarget.contains(event.relatedTarget)`. This means every time the user clicks away from the settings form in draft mode, a direct register PATCH fires with the local form state — overwriting the live register record and potentially clobbering fields that were intentionally changed in other parts of the draft.

The `responseActionMode` field is handled correctly: when `draftConfigMode && hasDraft`, `updateDraftResponseActionModeMutation` calls `updateDraftConfig`. But the main settings form (name, description, riskIdPrefix, zero-padding, reviews, allowViewerExport, customFieldValidationEnabled) goes direct to `PATCH /:registerId` even in draft mode.

**Fix required:** In `RegisterSettingsTab.tsx`, `handleFormBlur` must not call `updateSettingsMutation` when `draftConfigMode` is true. The settings that belong to the register record (name, description, riskIdPrefix, etc.) are not part of the draft config snapshot — they live on the register row itself and are correctly saved via direct PATCH. The real question is whether the blur-triggered PATCH is the mechanism described in the bug report.

**Re-assessment:** The original bug report says "a subsequent PATCH to `<registerId>` appears to fire and overwrites the server-side draft with local page state". The direct register PATCH does not touch the draft snapshot — it updates the `Register` table row. It does not overwrite draft config version content. Therefore `RegisterSettingsTab` is **not causing draft overwrite**. The blur-triggered PATCH is benign from a draft-integrity perspective, though it could cause premature persistence of intermediate name/description edits. This is a separate UX concern, not a draft-integrity bug.

**FieldConfigTab.tsx — CORRECT**

All mutations branch on `hasDraft`. When `hasDraft` is true, every operation (create, update, activate, deactivate, reorder, delete field; create, update, deactivate option) calls `updateDraftConfig`. When `hasDraft` is false, operations call the direct field/option API endpoints. One mutation (`reorderReviewStatusMutation`) calls `updateRegister(registerId, { reviewStatusPosition })` directly. This updates the register row (not draft config) — `reviewStatusPosition` is a register-level field not part of the config snapshot, so this is correct.

**ScoringConfigurationPanel.tsx — CORRECT (pass-through only)**

This is a layout component. It passes `draftConfigMode` down to child tabs and applies a CSS lock when `configLocked`. No mutations.

**LikelihoodConfigTab.tsx — CORRECT (delegates to ScoringValueConfigTab)**

Thin wrapper. All mutation logic is in `ScoringValueConfigTab`.

**ImpactConfigTab.tsx — CORRECT (delegates to ScoringValueConfigTab)**

Same pattern as LikelihoodConfigTab.

**ScoringValueConfigTab.tsx — CORRECT**

All mutations branch on `hasDraft`. When `hasDraft` is true, calls `updateDraftConfig` with the appropriate section (`likelihoodValues` or `impactValues`). When false, calls the direct scoring API (`createValue`, `updateValue`, `deactivateValue`). No direct register PATCH anywhere in this component.

**RiskLevelConfigTab.tsx — CORRECT**

Same pattern. All mutations branch on `hasDraft`: draft path calls `updateDraftConfig({ riskLevels: ... })`; non-draft path calls `createRiskLevel`, `updateRiskLevel`, `deactivateRiskLevel`. No direct register PATCH.

**FormulaConfigTab.tsx — CORRECT**

`saveMutation` calls `updateDraftConfig(registerId, { register: { scoringFormula: f } })` exclusively. The save button is only rendered when `draftConfigMode` is true. When `draftConfigMode` is false the textarea is read-only and the save button is not rendered. No direct register PATCH.

**MatrixConfigTab.tsx — CORRECT**

`saveMatrixMutation` branches on `hasDraft`. Draft path calls `updateDraftConfig({ matrixCells: ... })`; non-draft path calls `updateMatrix(registerId, ...)`. The `updateMatrix` call is a dedicated matrix API endpoint, not a direct register PATCH. No incorrect PATCH.

**TemplateLinkPanel.tsx — CORRECT**

`applyMutation` calls `applyTemplateUpdateToDraft` (draft path). `unlinkMutation` calls `unlinkRegisterFromTemplate` (a DELETE to `/:registerId/template-link`). Neither fires a direct register PATCH that could overwrite draft state.

### Summary verdict

No config page is incorrectly routing saves through a direct `PATCH /:registerId` that would overwrite draft config snapshot content. The draft config snapshot is a separate data structure (`ConfigVersion` record with a snapshot column) and is only updated via `PATCH /config-versions/draft`. The direct register PATCH updates the `Register` table row (name, description, etc.) and does not touch the draft snapshot.

The most likely explanation for the original bug report is one of:
1. The `onBlur` handler in `RegisterSettingsTab` fires on focus-leaving the settings form and saves name/description etc. to the live register record unexpectedly — this is a UX issue (premature save) but not a draft config integrity issue.
2. The form state in `RegisterSettingsTab` re-initialises from `registerQuery.data` and then calls `updateRegister` with those re-initialised values, which may produce confusing saves mid-session. But again, this only touches the `Register` row, not the draft snapshot.

### Fix recommendation

**Frontend (RegisterSettingsTab.tsx):** The `handleFormBlur` function should not fire `updateSettingsMutation` in draft mode if the intent is that register settings (name, description, etc.) should only be saved explicitly. The blur-on-leave auto-save was presumably carried over from the pre-draft flow. The fix is to guard the blur handler: only call `updateSettingsMutation.mutate()` when `!draftConfigMode`. The explicit Save button (already gated to `!draftConfigMode`) provides the correct save path in non-draft mode. In draft mode, users should save register settings explicitly via a separate mechanism, or the team should decide those fields (name/description/prefix/etc.) are always saved directly to the register record even during draft editing — in which case the blur auto-save should be documented as intentional.

**Backend:** No backend change required. The routing is correct. The two PATCH targets (`/:registerId` and `/config-versions/draft`) serve distinct purposes and are correctly separated.

**Scope assessment:** The fix is contained to a single guard condition in `RegisterSettingsTab.tsx` line in `handleFormBlur`. This is safe to include in this release. No other pages require changes.

---

## PA Design — MAINT-008

**Date:** 2026-06-21
**Author:** Principal Architect

### Decision 1: Is the current pino setup sufficient?

The core setup in `backend/src/config/logger.ts` is sound. Pino is the correct choice: it emits structured JSON natively, it is fast, and the `mixin` for observability bindings (requestId, correlationId, traceId, source, jobName, jobId) is already wired to `AsyncLocalStorage` via `getObservabilityBindings()` in `backend/src/observability/requestContext.ts`. The `requestContextMiddleware` and `requestMetricsMiddleware` in `backend/src/middleware/observability.ts` already populate and log the request lifecycle.

**No transport changes are needed.** Pino emits JSON to stdout; Docker captures stdout from the container and exposes it via `docker compose logs`. This is the correct pattern for containerised deployments — log aggregation is a concern for the operator's infrastructure (Loki, CloudWatch, Datadog, etc.), not for the application itself. Do not add a pino transport (e.g. `pino-pretty`) to the production logger — pretty-print belongs only in local development.

**Dev vs prod distinction:** The logger currently uses `process.env.NODE_ENV === "test"` to silence logs in tests. It does not differentiate dev from prod in terms of format. The backend developer should add a `pino-pretty` transport in development mode:

In `backend/src/config/logger.ts`, change the logger construction to:

```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  base: undefined,
  mixin: () => getObservabilityBindings(),
  ...(process.env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {})
});
```

This keeps JSON output in production (and CI, since `NODE_ENV` will not be `development` there) and gives readable output locally. `pino-pretty` must be added as a dev dependency in `backend/package.json`.

### Decision 2: Additional log calls to add

The following log calls are missing and should be added by the backend developer. All use the module-level `logger` import already present in those files.

**`backend/src/middleware/errorHandler.ts`**

The `notFoundHandler` currently sends a 404 response silently. Add a `logger.debug` call before `sendError` so 404s are visible at debug level but not noise in production:

```typescript
logger.debug({ method: request.method, path: request.path }, "Route not found");
```

The `errorHandler` already logs unhandled errors at `logger.error` — this is correct. The `ApiError` branch (known application errors, 4xx) currently returns without logging. Add `logger.info` for 4xx ApiErrors so they are traceable without being alarming:

```typescript
if (error instanceof ApiError) {
  if (error.statusCode >= 500) {
    logger.error({ error, method: request.method, route: getSafeRouteLabel(request) }, "API error");
  } else {
    logger.info({ code: error.code, statusCode: error.statusCode, method: request.method, route: getSafeRouteLabel(request) }, "Client error response");
  }
  sendError(...);
  return;
}
```

Do not log `error.message` in the structured fields for 4xx — the code and statusCode are sufficient for correlation without leaking validation detail into logs.

**`backend/src/services/auth.service.ts`**

The `safeRecordAuthAudit` helper already logs at `logger.error` when the audit write fails — correct. Add `logger.info` calls at the successful login and logout paths so auth events are queryable in logs even without the audit table. Suggested log points: after `signAccessToken` succeeds (login), with fields `{ userId, email }` and message `"User login succeeded"`; and at logout/token revoke with `{ userId }` and message `"User session revoked"`. Do not log passwords or tokens. Level: `info`.

**`backend/src/server.ts`**

Already logs startup (`"Custom Risk backend listening"`) and shutdown/error paths at `info`/`error`. This is correct and complete. No changes needed here.

**`backend/src/services/personReference.service.ts`**

Already has `logger.warn` for the failure case. No additional logging required.

**Service layer (general):** The backend developer should add `logger.debug` calls at the entry point of significant service operations — e.g. publish draft, discard draft, apply template — with the `registerId` and (where available) acting `userId` as structured fields. These are debug-level so they do not appear in production with the default `info` level, but they are available during incident investigation when `LOG_LEVEL=debug` is temporarily set. The backend developer should use their judgement on which service functions qualify — a guideline is: any operation that mutates a config version, publishes a draft, or modifies user/register permissions.

### Decision 3: Recommended LOG_LEVEL default for production

The recommended production default is `info`. This captures HTTP request completion (from `requestMetricsMiddleware`), startup/shutdown lifecycle, auth events, and unhandled errors, without emitting per-query debug noise.

The backend developer must ensure `LOG_LEVEL=info` is present in `.env.example` (or `env.example` if that is the project convention — check which file exists) with a comment explaining the valid values (`error`, `warn`, `info`, `debug`) and when to use each.

Add `LOG_LEVEL` to the `docker-compose.yml` environment block for the `app` service:

```yaml
LOG_LEVEL: ${LOG_LEVEL:-info}
```

This allows operators to override via their `.env` without editing the compose file.

### Decision 4: Log flow across Docker containers

The `docker-compose.yml` defines two containers: `app` (the Express backend) and `db` (PostgreSQL). The `app` container writes logs to stdout/stderr; Docker captures them. The `db` container's PostgreSQL logs are separate and do not flow through the application logger.

The backend developer does not need to do anything special for log aggregation — stdout is the correct output destination. The DevOps engineer should document in `docs/operations/observability.md`:

- `docker compose logs -f app` — tail application logs
- `docker compose logs -f db` — tail PostgreSQL logs
- `LOG_LEVEL=debug docker compose up` — temporarily elevate verbosity for investigation (or set in `.env`)
- JSON log format: each line is a JSON object; pipe to `jq` locally for readability: `docker compose logs -f app | jq .`
- In production, pipe container stdout into the operator's chosen aggregation stack (Loki, CloudWatch, etc.). No application-side aggregation is required or recommended.
- No log rotation is needed at the application level; Docker's `json-file` log driver handles rotation. Operators who need log persistence should configure a logging driver in their Docker daemon or use a sidecar.

There is no second backend container, no worker process, and no background job runner at this time. If background jobs are added in future, the existing `runWithJobContext` in `backend/src/observability/requestContext.ts` already supports job-scoped observability bindings (jobName, jobId) — the job logs will appear in the same stream with those fields present, making them filterable without additional infrastructure.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
