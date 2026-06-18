# Active Release

Status: ready-for-release
Version: v1.10.0
Release type: patch

## Release goal

Ship a focused bug-fix and UI polish pass: eliminate the critical SavedViewsPanel crash that makes /registers unusable, clean up the /profile page visual inconsistencies and table overflow, and add a password strength meter to the change password form. No new feature scope.

## Selected work items

### BUG-002 — Fix SavedViewsPanel crash on /registers (critical) ✓ done in v1.10.0
Source: REQ-013  
Capability: reporting-saved-views

**Problem:** SavedViewsPanel.tsx line 85 calls `.map()` on `views` before it is guaranteed to be an array, throwing an unhandled React error and making /registers completely unusable.

**Acceptance criteria:**
- SavedViewsPanel does not call `.map()` on a non-array value under any conditions (loading, empty, error, or populated).
- Fix verified against both the empty-views state and the normal populated-views state.
- No regression to SavedViewsPanel feature behaviour (create, apply, delete saved views).
- Frontend tests cover the crash scenario (null/undefined/non-array views response).

**Key files:** `frontend/src/features/risks/SavedViewsPanel.tsx`, `frontend/src/api/savedViews.api.ts`  
**Tests:** `frontend/test/savedViews.behavior.test.tsx`, `frontend/test/savedViews.test.mjs`  
**Agents:** Frontend Developer, Test Engineer

---

### UI-001 — Polish /profile page — align card styling and fix API keys table overflow (medium) ✓ done in v1.10.0
Source: REQ-014  
Capability: profile-preferences

**Problem:** /profile is the only page using Mantine Card, which renders a grey background inconsistent with the rest of the app. The API keys table overflows its card and shows a horizontal scrollbar at standard desktop widths.

**Acceptance criteria:**
- /profile page has no grey-background card inconsistency — matches the app design system.
- API keys table renders without a horizontal scrollbar at 1728×1117 (standard desktop breakpoint).
- All profile page functionality unaffected (name update, password change, API key generate/revoke, colour scheme preference).
- No regression to existing profile and API key frontend tests.

**Key files:** `frontend/src/pages/ProfilePage.tsx`  
**Tests:** `frontend/test/apiKeys.behavior.test.tsx`, `frontend/test/apiKeys.test.mjs`, `frontend/test/preferences.behavior.test.tsx`  
**Agents:** Frontend Developer, Test Engineer

**Decisions resolved:**
- Card style → switch to plain Stack, matching all other pages
- Table overflow → widen the outer Stack page width constraint (not rationalise columns)

---

### QOL-001 — Add password strength meter to change password form on /profile (low) ✓ done in v1.10.0
Source: REQ-015  
Capability: profile-preferences

**Problem:** The new password field on /profile gives no strength feedback. Users have no signal when choosing a weak password.

**Acceptance criteria:**
- Strength meter appears below the new-password field and updates live as the user types.
- Covers at least weak / fair / strong signal (exact bands confirmed during implementation).
- Advisory only — form submits regardless of score.
- No regression to the existing change password flow or tests.

**Key files:** `frontend/src/pages/ProfilePage.tsx`  
**Tests:** `frontend/test/preferences.behavior.test.tsx`  
**Agents:** Frontend Developer, Test Engineer

**Decision resolved:** Strength meter → use Mantine Progress+Popover pattern, no new dependency

---

## Required agents

- Frontend Developer (BUG-002, UI-001, QOL-001)
- Test Engineer (BUG-002, UI-001, QOL-001)

## Decisions

- **UI-001 card style:** Replace Mantine Card with plain Stack — match the pattern used on all other pages.
- **UI-001 table overflow:** Widen the outer Stack page width constraint rather than rationalising the table columns.
- **QOL-001 strength meter:** Use Mantine Progress+Popover pattern — no new dependency.

## Blockers

None. Release complete.

## Test / sign-off

- [x] BUG-002: SavedViewsPanel crash scenario covered in frontend tests
- [x] UI-001: No visual regression; table fits at 1728×1117; no horizontal scrollbar
- [x] QOL-001: Strength meter renders and updates live as user types

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
