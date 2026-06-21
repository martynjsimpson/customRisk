# SPIKE-004: Production Editions Model

**Status:** Complete — no implementation
**Date:** 2026-06-21
**Author:** Principal Architect
**Branch:** release/v1.22.0

---

## Context

Production deployments of customRisk are configured via per-deployment `.env` values. Feature availability is controlled by ten boolean environment variables (`FEATURE_*`) read at startup by `backend/src/config/featureFlags.ts` and at request time by `backend/src/middleware/requireFeature.ts`. Each operator sets whichever flags they choose; there is no concept of a named release configuration.

This creates drift: different deployments run with different flag combinations that no one has explicitly named or documented, making it hard to reason about what a given deployment is running, reproduce issues, or communicate "what the community edition supports" to an operator. The problem compounds as the flag count grows.

BUG-055 (resolved in v1.21.0) provided real-world evidence of the risk: `requireFeature("draftConfig")` was used to gate a sub-router, but the middleware was applied after route matching had already occurred, causing the router to mount at the wrong path and block unrelated routes. The bug was found and fixed, but diagnosing it required understanding which flags were active and how they affected route-mounting order — complexity that a named edition model would partially address.

REQ-042 and SPIKE-001 sketch an org/tenant model. Any editions design must not foreclose attaching an edition to an org or subscription entity later.

---

## Current approach

`backend/src/config/featureFlags.ts` exports a `featureFlags` object built at module-load time from `process.env`. `backend/src/middleware/requireFeature.ts` re-reads `process.env` at request time (to allow test overrides) and returns a 404 if the flag is off. Flags are referenced in route files and occasionally in service logic.

Current flags (ten in total): `userPreferences`, `samlAuth`, `draftConfig`, `childActions`, `notifications`, `csvImport`, `attachments`, `apiKeys`, `webhooks`, `savedViews`.

In `docker-compose.yml`, all ten flags default to `false`. Operators override them individually. There is no validation that a given combination makes sense.

---

## Findings

### 1. How editions are defined and where the mapping lives

An edition is a named, fixed set of feature flags. The mapping belongs in source code — not in a database, not in a config file that operators edit. It is a product decision, not an operational one, so it should be versioned alongside the application.

Recommended location: `backend/src/config/editions.ts`. This file exports:
- A union type `Edition = "community" | "enterprise"` (names chosen for illustration — the PM defines the canonical set).
- A `const editionFeatures: Record<Edition, Partial<Record<FeatureKey, boolean>>>` map that declares which flags each edition enables.
- A `resolveFeatureFlags(edition: Edition | undefined, overrides: Partial<Record<FeatureKey, boolean>>) => Record<FeatureKey, boolean>` function that merges the edition defaults with any operator-supplied per-flag overrides (see finding 3 on local dev).

The `featureFlags.ts` module calls `resolveFeatureFlags` with the edition and the current `process.env` overrides, producing the same `Record<FeatureKey, boolean>` shape that the rest of the codebase already consumes. No other file changes are needed to adopt this — callers see the same type.

### 2. How a production deployment selects an edition

A single `EDITION` environment variable in the deployment's `.env`. Valid values are the edition names defined in `editions.ts`. If `EDITION` is not set, the application falls back to the flags-only mode for backward compatibility during migration (see finding 4).

At startup, `backend/src/server.ts` logs the resolved edition and the full flag set at `info` level. This makes the active configuration auditable from the log stream without requiring access to the host environment.

Example addition to `docker-compose.yml`:
```yaml
EDITION: ${EDITION:-}
```

If `EDITION` is empty, behaviour is unchanged from today (flags read individually from `process.env`). If set to a valid edition name, the edition defaults apply and individual `FEATURE_*` vars in `docker-compose.yml` can be removed over time.

### 3. How local development retains per-flag flexibility

During development, engineers frequently need to enable or disable individual flags without switching editions. The `resolveFeatureFlags` function accepts per-flag overrides: any `FEATURE_*` env var that is explicitly set to `"true"` or `"false"` overrides the edition default for that flag. This means the local dev workflow is unchanged — engineers continue to set individual vars in their `.env` or shell. The edition simply provides a baseline so engineers do not need to set all ten flags explicitly.

Engineers can also set `EDITION=` (empty) to bypass edition defaults entirely and rely on individual flags, exactly as today.

### 4. Migration path from the current featureFlags.ts approach

The migration is designed to be non-breaking and incremental.

**Phase 1 (this or a near-future release):** Introduce `editions.ts` with the edition definitions and `resolveFeatureFlags`. Update `featureFlags.ts` to call `resolveFeatureFlags`. Publish documentation of the two named editions and what they include. No operator action required — existing deployments with no `EDITION` var continue to work exactly as before.

**Phase 2 (when operators are ready):** Operators set `EDITION` in their `.env`. They can then remove the individual `FEATURE_*` vars they no longer need to override. `docker-compose.yml` defaults for `FEATURE_*` vars are removed one by one as each edition graduates those flags from "experimental" to "included by default".

**Phase 3 (steady state):** New features ship as part of a named edition rather than as a new bare flag. The flag still exists (it is the lowest-level control), but operators interact with it through the edition knob.

The individual `FEATURE_*` env vars are never removed — they remain as escape hatches for operators who need to deviate from an edition. The editions model layers on top; it does not replace the underlying flag mechanism.

### 5. Whether the editions model would have prevented or simplified the BUG-055 class of issue

BUG-055 was a code bug — `requireFeature("draftConfig")` was applied to a sub-router in a position where Express had already matched the route path, causing the middleware to mount at the wrong path and block `GET /:registerId`. The fix was to mount the flag-gated sub-routers at specific named paths rather than at `/`.

An editions model would not have prevented this bug. The bug was in the route-mounting code, not in flag resolution. Whether `draftConfig` was set via `EDITION=enterprise` or `FEATURE_DRAFT_CONFIG=true` makes no difference to the middleware execution order.

The editions model does, however, simplify the diagnostic picture: a log line at startup that reads `edition=enterprise flags={draftConfig:true, ...}` would have immediately confirmed which flags were active during the incident, narrowing the investigation. That information currently requires inspecting the deployment's `.env` file or running `docker compose config`. This is a meaningful operational improvement even though it would not have prevented the underlying code bug.

More broadly, the editions model would reduce the class of "unexpected flag combination" bugs — cases where an operator has set a flag combination that was never tested — because editions are the tested configurations. BUG-055 was not in that class (the code was wrong regardless of the flag state), but future bugs of that type are more likely to be caught pre-release if the release process validates the named editions rather than arbitrary flag permutations.

### 6. How an edition could later be attached to an org, tenant, or subscription entity

The `resolveFeatureFlags` function in `editions.ts` accepts an `Edition | undefined` parameter. Today, that edition comes from `process.env.EDITION` — a single value for the whole deployment.

When a multi-tenant model exists (REQ-042/SPIKE-001), the edition can instead be stored on the org or subscription entity in the database. The `requireFeature` middleware already receives the request object; it could be extended to resolve the edition from the authenticated tenant's record rather than from `process.env`. The `resolveFeatureFlags` function signature accommodates this without change: the caller passes the tenant's edition and any operator-level overrides.

This means the migration path from single-deployment editions to per-tenant editions requires changes in two places only: (1) where the edition value is sourced (a tenant lookup instead of `process.env`), and (2) the `requireFeature` middleware which must become async if it needs to query the database. The edition-to-feature mapping in `editions.ts` does not change, and callers throughout the codebase do not change.

One design constraint to preserve: the `featureFlags` object used in frontend code (served via the existing flags endpoint) must also reflect the per-tenant edition when a tenant model exists. This is handled at the API layer — the flags endpoint returns the resolved flags for the authenticated tenant rather than the deployment-wide flags. The frontend `useFeatureFlags` hook does not need to change.

---

## Recommendations

1. **Adopt the editions model in a future release** (not this one — this release is spike-only). The implementation is low-risk: it adds `editions.ts` and updates `featureFlags.ts` to call `resolveFeatureFlags`. All other files are unchanged.

2. **Define two initial editions for the PM to confirm:** `community` (the core risk register with no experimental features) and `enterprise` (all current stable flags enabled). The exact flag-to-edition mapping is a PM/product decision, not an architectural one.

3. **Log the resolved edition and flag set at startup** in `backend/src/server.ts` at `info` level. This is an immediate, low-cost improvement to incident diagnostics and is separable from the full editions implementation.

4. **Do not remove individual `FEATURE_*` env vars.** They remain as per-flag escape hatches for operators and local development. The editions model sits above them, not instead of them.

5. **Do not store the edition in the database at the single-tenant stage.** `process.env.EDITION` is the right source of truth for a single-deployment model. When a tenant model exists, the edition moves to the tenant entity — but that is a later design problem (SPIKE-001 scope).

6. **The BUG-055 class of issue (flag-gated route mounting) is not solved by the editions model.** The architectural recommendation from that bug — mount flag-gated sub-routers at specific named paths, never at `/` — stands independently and should be documented as a routing convention, not addressed through editions.
