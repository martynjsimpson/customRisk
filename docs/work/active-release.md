# Active Release

Status: ready-for-release
Version: v1.13.0

## Release goal

Complete the /my-risks page as a genuinely useful destination: add search and filter capability, add CSV export, and make filter state URL-driven for consistency with the rest of the app. Also ships a small date-picker improvement in the Create API Key modal as a self-contained polish item.

## Selected work items

### UI-005 — Add search and filter capability to /my-risks page
Source: REQ-035
Capability: my-risks-ui
Status: done
done_in: v1.13.0

**Problem:** The /my-risks page has no search or filter capability. Users cannot narrow their risk list by title, state, risk level, or register.

**Acceptance criteria:**
- The /my-risks page has a filter bar with at minimum: title/description text search, state, risk level, and register filters.
- Filters work correctly across risks from different registers.
- Custom field filters are explicitly out of scope (cross-register view; custom fields vary per register).
- Filter state is reflected in URL params, consistent with the rest of the app — refreshing the page or sharing the URL restores the active filters.
- Filter state clears cleanly on reset.
- No regression to existing /my-risks functionality.

**Decision:** Use URL params for filter state — consistent with UI-007 and the broader app convention. Not navigation state.

**Implementation note:** Confirm which query params the /my-risks backend endpoint currently supports before implementing the filter bar. New query params may be needed (e.g. `search`, `state`, `riskLevel`, `registerId`). Implement UI-005 before UI-006 so the export can respect active filter state.

**Key files:** `frontend/src/pages/MyRisksPage.tsx`, `backend/src/routes/risks.routes.ts`
**Tests:** `frontend/test/myRisks.test.mjs`, `backend/test/risks.test.mjs`
**Agents:** Backend Developer, Frontend Developer, Test Engineer

---

### UI-006 — Add Export CSV button to /my-risks page
Source: REQ-036
Capability: my-risks-ui
Status: done
done_in: v1.13.0

**Problem:** The /my-risks page has no CSV export capability.

**Acceptance criteria:**
- An Export CSV button appears on /my-risks styled and positioned consistently with the register page Export CSV button (title row, same variant/colour).
- Clicking Export CSV exports the current visible set of risks — if filters are active (from UI-005), export reflects the filtered set; if no filters are active, exports all risks owned by the user across all registers.
- Export respects permissions — only risks the user can see are exported.
- No regression to existing /my-risks functionality.

**Decision:** Export respects active filter state. UI-005 must be implemented first so the filter state mechanism is in place.

**Implementation note:** Confirm whether the backend already supports a my-risks CSV export endpoint or if a new one is needed. The existing export service likely needs a my-risks variant that filters by ownership rather than register scope.

**Key files:** `frontend/src/pages/MyRisksPage.tsx`, `backend/src/services/export.service.ts`
**Tests:** `frontend/test/myRisks.test.mjs`, `backend/test/registers.test.mjs`
**Agents:** Backend Developer, Frontend Developer, Test Engineer

---

### UI-012 — Use date picker in Create API Key modal
Source: REQ-016
Capability: api-keys
Status: done
done_in: v1.13.0

**Problem:** The Create API Key modal uses a plain text input for the expiry date field. The audit log search filter already implements a date picker that can be reused.

**Acceptance criteria:**
- The Create API Key modal expiry date field uses a date picker component matching the audit log search filter pattern.
- Users cannot easily enter invalid dates.
- No regression to API key creation functionality or existing tests.

**Implementation note:** Reuse the date picker component from `AuditFilters.tsx` — no new dependency should be needed. This item is self-contained and can be implemented in any order relative to UI-005/UI-006.

**Key files:** `frontend/src/pages/ApiKeysPage.tsx`, `frontend/src/features/audit/AuditFilters.tsx`
**Tests:** `frontend/test/apiKeys.behavior.test.tsx`
**Agents:** Frontend Developer, Test Engineer

---

## Required agents

- Backend Developer (UI-005, UI-006)
- Frontend Developer (UI-005, UI-006, UI-012)
- Test Engineer (UI-005, UI-006, UI-012)

## Decisions

- **UI-005 filter state:** Use URL params — consistent with the rest of the app. Not navigation state.
- **UI-006 export scope:** Export respects active filter state when filters are applied; exports all owned risks when no filters are active.
- **UI-005/UI-006 ordering:** Implement UI-005 before UI-006 so the export can reference the filter state mechanism.
- **UI-012 date picker:** Reuse the existing AuditFilters date picker component. No new dependency.

## Test / sign-off

- [x] Implementation pass complete
- [x] Regression test pass complete (339 tests, 0 failures)
- [x] TypeScript typecheck clean
- [x] Documentation pass complete

## Blockers

None.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
