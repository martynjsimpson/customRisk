# Active Release

Status: ready-for-release
Version: v1.11.0

## Release goal

Clear the ready bug backlog and deliver a small-polish pass: fix the critical Save View serialisation bug, resolve high-priority dark mode and review-button display bugs, correct audit and Views toolbar styling, and batch four micro-polish items (help icon, show-closed checkbox, config alert position, permissions page Fieldset). No backend schema changes. No new features. All work is frontend-only or near-frontend.

## Selected work items

### BUG-003 — Fix "Save View" broken on register — columns type mismatch (critical)
Source: REQ-029
Capability: reporting-saved-views
Status: done
done_in: v1.11.0

**Problem:** The Save View feature on the register page is completely broken. The frontend is serialising `columns` as an object instead of an array, causing a validation error on every save attempt. The feature is entirely unusable.

**Acceptance criteria:**
- Saving a view sends `columns` as an array in the request body.
- Save View succeeds and the saved view appears in the views list without error.
- No regression to view list, apply, update, or delete flows.
- Frontend tests cover the save-view serialisation path to confirm `columns` is always an array.

**Key files:** `frontend/src/features/risks/SavedViewsPanel.tsx`, `frontend/src/api/savedViews.api.ts`
**Tests:** `frontend/test/savedViews.behavior.test.tsx`, `frontend/test/savedViews.test.mjs`
**Agents:** Frontend Developer, Test Engineer

---

### BUG-004 — Fix calculated field dark mode styling in risk modals (high)
Source: REQ-026
Capability: advanced-fields
Status: done
done_in: v1.11.0

**Problem:** Calculated fields are unreadable in dark mode in both the add risk and edit risk modals — they use hardcoded or theme-unaware colours that do not adapt to the dark colour scheme.

**Acceptance criteria:**
- Calculated fields are legible in both light and dark mode in the add and edit risk modals.
- No hardcoded colour values remain in the calculated field display component.
- No regression to light mode rendering.

**Decision:** Use Mantine theme tokens or CSS variables for colour — not conditional light/dark checks.

**Key files:** `frontend/src/features/risks/RiskFormModal.tsx`
**Tests:** `frontend/test/configuration.test.mjs`
**Agents:** Frontend Developer, Test Engineer

---

### BUG-005 — Hide Review button on /my-risks when reviews are not required (high)
Source: REQ-023
Capability: advanced-reviews
Status: done
done_in: v1.11.0

**Problem:** The /my-risks table shows a Review button for all risks regardless of whether the parent register has reviews enabled. This is misleading when the risk's review status is "not required".

**Acceptance criteria:**
- Risks with review status "not required" do not show a Review button in the /my-risks table.
- Risks with an active review requirement continue to show the Review button.
- No regression to the review flow for risks where reviews are required.

**Implementation note:** API already includes `reviewStatus` per risk — no backend change required.

**Key files:** `frontend/src/pages/MyRisksPage.tsx`
**Tests:** `frontend/test/myRisks.test.mjs`
**Agents:** Frontend Developer, Test Engineer

---

### BUG-006 — Align "Views" dropdown styling with Columns and Export CSV (high)
Source: REQ-030
Capability: reporting-saved-views
Status: done
done_in: v1.11.0

**Problem:** The Views dropdown on the register page is styled differently from the adjacent Columns dropdown and Export CSV button.

**Acceptance criteria:**
- Views dropdown matches Columns dropdown and Export CSV button in variant, size, and colour.
- No regression to Views, Columns, or Export CSV functionality.

**Key files:** `frontend/src/features/risks/SavedViewsPanel.tsx`
**Agents:** Frontend Developer

---

### BUG-007 — Fix /audit page Export CSV button styling and layout (high)
Source: REQ-018
Capability: audit-log-ui
Status: done
done_in: v1.11.0

**Problem:** The Export CSV button on /audit uses the wrong style and is positioned below the page title rather than inline with it.

**Acceptance criteria:**
- Export CSV on /audit matches the button variant, colour, and title-row position of the register page Export CSV button.
- No regression to the audit export functionality.

**Key files:** `frontend/src/features/audit/AuditLogPanel.tsx`, `frontend/src/pages/AuditPage.tsx`
**Agents:** Frontend Developer

---

### BUG-008 — Remove icon from /help page header (medium)
Source: REQ-019
Capability: help-content
Status: done
done_in: v1.11.0

**Problem:** The /help page header renders an icon before the heading text. No other page does this.

**Acceptance criteria:**
- No icon is rendered before the /help page heading.
- No other page layout is affected.

**Key files:** `frontend/src/pages/HelpPage.tsx`
**Agents:** Frontend Developer

---

### UI-003 — Remove redundant "Show closed" checkbox from register page (medium)
Source: REQ-037
Capability: register-ui
Status: done
done_in: v1.11.0

**Problem:** The register page has both a State dropdown (with Closed as an option) and a separate Show closed checkbox. The checkbox is redundant.

**Acceptance criteria:**
- The Show closed checkbox is removed from the register page filter bar.
- Closed risks remain accessible via the State dropdown.
- No regression to filter behaviour or existing filter tests.

**Key files:** `frontend/src/features/risks/RiskFilters.tsx`
**Tests:** `frontend/test/risks.test.mjs`
**Agents:** Frontend Developer, Test Engineer

---

### UI-009 — Move "Configuration is version-controlled" alert above action buttons (medium)
Source: REQ-028
Capability: config-lifecycle-templates
Status: done
done_in: v1.11.0

**Problem:** The version-controlled alert appears below the action button group on the configuration page, making it feel like an afterthought rather than context.

**Acceptance criteria:**
- The version-controlled alert is rendered above the action button group.
- No regression to configuration page layout or functionality.

**Key files:** `frontend/src/features/configuration/RegisterConfigurationPanel.tsx`
**Agents:** Frontend Developer

---

### UI-010 — Use Mantine Fieldset on register permissions page (medium)
Source: REQ-027
Capability: register-ui
Status: done
done_in: v1.11.0

**Problem:** The register permissions page does not use Mantine Fieldset for content grouping, unlike the configuration settings page and other sub-pages.

**Acceptance criteria:**
- The permissions page uses Mantine Fieldset consistent with the configuration settings page pattern.
- No regression to permissions page functionality or existing tests.

**Key files:** `frontend/src/pages/RegisterDetailPage.tsx`
**Agents:** Frontend Developer

---

## Required agents

- Frontend Developer (all items)
- Test Engineer (BUG-003, BUG-004, BUG-005, UI-003)

## Decisions

- **BUG-004 colour approach:** Use Mantine theme tokens or CSS variables — no hardcoded colours, no conditional light/dark checks.
- **BUG-005 API check:** `reviewStatus` already present in `/dashboard/my-risks` response — no backend change required.
- **BUG-006 sequencing:** Implemented after BUG-003 as planned.
- **UI-003 checkbox removal:** No URL param or filter state persistence logic referenced the show-closed checkbox.

## Test / sign-off

- [x] Implementation pass complete
- [x] Regression test pass complete (191 backend + 91 frontend static + 29 Vitest — all green)
- [x] TypeScript typecheck clean (0 errors)
- [x] Documentation pass complete

## Blockers

None.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
