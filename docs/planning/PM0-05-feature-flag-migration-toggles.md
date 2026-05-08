# Post-MVP Feature Flag and Migration Toggle Foundation

**Ticket:** PM0-05  
**Version:** 1.0  
**Date:** 2026-05-07  
**Status:** Approved  
**Related documents:** PM0-01 Scope Baseline, Technical Architecture v1.0, Post-MVP Implementation Backlog v1.0

---

## 1. Purpose

This document defines how post-MVP features will be gated during development so that:

- incomplete features can be merged to the main branch without being exposed to users;
- backend-protected routes cannot be reached by manually entering a URL, even when the frontend hides the entry point;
- flags are safe by default (i.e. all post-MVP flags are `false` unless explicitly enabled);
- the mechanism is simple enough to not require a dedicated flag-management service.

---

## 2. Decision: Environment-Variable Feature Flags

**Decision:** Post-MVP feature gating uses environment variables. No database-backed feature flag table is introduced.

**Rationale:**

- The product is self-hosted and single-tenant. There are no per-user, per-organisation, or A/B rollout requirements that would justify a runtime-configurable flag store.
- Environment variables are already the established configuration pattern (`backend/src/config/env.ts`). Adding feature flags there keeps the model consistent.
- A database-backed flag table adds schema complexity and a migration dependency for every new phase — the opposite of what this ticket is trying to achieve.
- Operators control their deployment environment. A flag that gates an incomplete feature is set to `false` in the shipped `.env.local.example` and can be enabled by the operator when the feature is ready.

**Constraint:** If a future phase introduces a genuinely user-toggleable capability (e.g. an operator can enable dark mode globally), that is a register or system setting — not a feature flag — and belongs in the application's own settings model.

---

## 3. Flag Naming Convention

All feature flags use the prefix `FEATURE_` and are named after the capability in `SCREAMING_SNAKE_CASE`.

```text
FEATURE_<CAPABILITY_NAME>=false
```

Examples:

```text
FEATURE_USER_PREFERENCES=false
FEATURE_SAML_AUTH=false
FEATURE_DRAFT_CONFIG=false
FEATURE_CHILD_ACTIONS=false
FEATURE_NOTIFICATIONS=false
FEATURE_CSV_IMPORT=false
FEATURE_ATTACHMENTS=false
FEATURE_API_KEYS=false
FEATURE_WEBHOOKS=false
```

**Defaults:** All `FEATURE_*` variables default to `false` when absent from the environment. The `env.ts` helper must treat a missing or unrecognised value as `false`.

**Graduation:** When a phase is complete and passes acceptance criteria, its flag variable is removed from the codebase entirely — not set to `true` by default. Completed features do not need a gate. The flag exists only while the implementation is incomplete.

---

## 4. Backend Gating

### 4.1 `featureFlags` module

A `backend/src/config/featureFlags.ts` module reads and exposes all `FEATURE_*` values:

```typescript
function flag(key: string): boolean {
  return process.env[key]?.toLowerCase() === "true";
}

export const featureFlags = {
  userPreferences: flag("FEATURE_USER_PREFERENCES"),
  samlAuth:        flag("FEATURE_SAML_AUTH"),
  draftConfig:     flag("FEATURE_DRAFT_CONFIG"),
  childActions:    flag("FEATURE_CHILD_ACTIONS"),
  notifications:   flag("FEATURE_NOTIFICATIONS"),
  csvImport:       flag("FEATURE_CSV_IMPORT"),
  attachments:     flag("FEATURE_ATTACHMENTS"),
  apiKeys:         flag("FEATURE_API_KEYS"),
  webhooks:        flag("FEATURE_WEBHOOKS"),
} as const;
```

This module is read once at startup. It does not re-read the environment at request time. Changing a flag requires a process restart.

### 4.2 Route-level gating middleware

A `requireFeature` middleware function gates individual routes or route groups:

```typescript
import { Request, Response, NextFunction } from "express";
import { featureFlags } from "../config/featureFlags";

type FeatureKey = keyof typeof featureFlags;

export function requireFeature(feature: FeatureKey) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!featureFlags[feature]) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
      return;
    }
    next();
  };
}
```

**Response:** Gated routes return `404 NOT_FOUND`, not `403 FORBIDDEN`. This prevents route existence from being discoverable when the feature is disabled, consistent with the existing "do not reveal hidden resources" principle in the permission model.

### 4.3 Applying to route groups

In `backend/src/routes/index.ts`, a gated route group is mounted with the middleware:

```typescript
import { requireFeature } from "../middleware/requireFeature";
import preferencesRoutes from "./preferences.routes";

// Gated: only active when FEATURE_USER_PREFERENCES=true
router.use("/users/me/preferences", requireFeature("userPreferences"), preferencesRoutes);
```

The `requireFeature` call sits between the path and the route handler, so it applies to all methods on that path.

---

## 5. Frontend Gating

### 5.1 Feature flag delivery

The backend `GET /api/v1/auth/me` response is extended (when Phase 1 is active) to include an `enabledFeatures` map:

```json
{
  "data": {
    "user": { ... },
    "permissions": { ... },
    "enabledFeatures": {
      "userPreferences": false,
      "samlAuth": false,
      "draftConfig": false,
      "childActions": false,
      "notifications": false,
      "csvImport": false,
      "attachments": false,
      "apiKeys": false,
      "webhooks": false
    }
  }
}
```

This piggybacks on the existing bootstrap call the frontend already makes. No additional flag endpoint is needed.

The `enabledFeatures` field is always present in the response (even before Phase 1 is active), defaulting all flags to `false`. This makes the field safe to add now without breaking the current frontend.

### 5.2 `useFeatureFlags` hook

A `frontend/src/hooks/useFeatureFlags.ts` hook reads the `enabledFeatures` map from the auth context:

```typescript
export function useFeatureFlags() {
  const { enabledFeatures } = useAuth();
  return enabledFeatures ?? {};
}
```

### 5.3 Route hiding

In `frontend/src/router/routes.tsx`, gated routes are conditionally registered based on the flag. For pages not yet built, the route simply does not exist in the router:

```typescript
// Not registered until FEATURE_USER_PREFERENCES=true:
// { path: "/profile", element: <ProfilePage /> }
```

For navigation items, the nav component reads the flag before rendering the link:

```typescript
const flags = useFeatureFlags();
// ...
{flags.userPreferences && <NavLink to="/profile">Profile</NavLink>}
```

### 5.4 No frontend-only gating

The frontend must not be the sole gate for a protected feature. Every gated route must also have `requireFeature` middleware on the backend. The frontend gate is a UX convenience only.

---

## 6. `.env.local.example` Maintenance

Each new `FEATURE_*` variable is added to `.env.local.example` with a `false` default and a comment identifying the phase that activates it. The comment is removed when the flag is graduated.

Example additions for `.env.local.example`:

```ini
# Post-MVP feature flags — set to true only when the phase is complete and tested
# Phase 1: user preferences and dark mode
FEATURE_USER_PREFERENCES=false
# Phase 3: SAML authentication
FEATURE_SAML_AUTH=false
# Phase 4: draft/publish configuration versioning
FEATURE_DRAFT_CONFIG=false
# Phase 7: child-record risk response actions
FEATURE_CHILD_ACTIONS=false
# Phase 9: in-app and email notifications
FEATURE_NOTIFICATIONS=false
# Phase 10: CSV import wizard
FEATURE_CSV_IMPORT=false
# Phase 12: file attachments and evidence
FEATURE_ATTACHMENTS=false
# Phase 13: API keys
FEATURE_API_KEYS=false
# Phase 13: webhooks
FEATURE_WEBHOOKS=false
```

---

## 7. Flag Lifecycle

| Stage | Action |
|---|---|
| Phase ticket created | Add `FEATURE_*` variable to `.env.local.example` (default `false`). Add flag key to `featureFlags.ts`. Add `requireFeature` to relevant backend routes. |
| Implementation in progress | Merge code with flag disabled. Feature is invisible to users. |
| Phase acceptance complete | Remove `requireFeature` middleware. Remove flag from `featureFlags.ts`. Remove from `.env.local.example`. Remove frontend checks. |
| Rollback needed | Set `FEATURE_*=false` in environment and restart. Routes return 404. Frontend hides entry points. |

---

## 8. What This Does Not Cover

- **Per-user flags.** Not needed. The product is single-tenant and flags are operator-controlled.
- **Gradual rollout / percentage flags.** Out of scope. Operator either enables a feature for all users or does not.
- **Flag UI in the admin panel.** Not planned. Flags are environment variables, not in-app settings.
- **Long-lived flags.** All flags are temporary scaffolding. A flag that persists after phase acceptance is a bug to be cleaned up.

---

## 9. Document References

| Document | Location |
|---|---|
| Post-MVP Scope Baseline v1.0 | `docs/planning/PM0-01-scope-baseline.md` |
| Technical Architecture v1.0 | `docs/architecture/technical-architecture.md` |
| Permission Model v1.0 | `docs/architecture/permission-model.md` |
| Post-MVP Implementation Backlog v1.0 | `docs/planning/post-mvp-backlog.md` |
