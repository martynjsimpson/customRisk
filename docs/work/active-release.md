# Active Release

Status: in-progress
Version: v1.11.0

## Release goal

Clear the ready bug backlog and deliver a small-polish pass: fix the critical Save View serialisation bug, resolve high-priority dark mode and review-button display bugs, correct audit and Views toolbar styling, and batch four micro-polish items (help icon, show-closed checkbox, config alert position, permissions page Fieldset). No backend schema changes. No new features. All work is frontend-only or near-frontend.

## Selected work items

### BUG-003 — Fix "Save View" broken on register — columns type mismatch (critical)
Source: REQ-029
Capability: reporting-saved-views

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

**Problem:** The /my-risks table shows a Review button for all risks regardless of whether the parent register has reviews enabled. This is misleading when the risk's review status is "not required".

**Acceptance criteria:**
- Risks with review status "not required" do not show a Review button in the /my-risks table.
- Risks with an active review requirement continue to show the Review button.
- No regression to the review flow for risks where reviews are required.

**Implementation note:** Confirm that the /my-risks API response already includes review status per risk. If not, a minimal backend addition is needed — the developer should check and scope accordingly before implementing.

**Key files:** `frontend/src/pages/MyRisksPage.tsx`
**Tests:** `frontend/test/myRisks.test.mjs`
**Agents:** Frontend Developer, Test Engineer

---

### BUG-006 — Align "Views" dropdown styling with Columns and Export CSV (high)
Source: REQ-030
Capability: reporting-saved-views

**Problem:** The Views dropdown on the register page is styled differently from the adjacent Columns dropdown and Export CSV button.

**Acceptance criteria:**
- Views dropdown matches Columns dropdown and Export CSV button in variant, size, and colour.
- No regression to Views, Columns, or Export CSV functionality.

**Implementation note:** Implement after BUG-003 so the Views feature is working before the styling is corrected.

**Key files:** `frontend/src/pages/RegisterPage.tsx`, `frontend/src/features/risks/SavedViewsPanel.tsx`
**Agents:** Frontend Developer

---

### BUG-007 — Fix /audit page Export CSV button styling and layout (high)
Source: REQ-018
Capability: audit-log-ui

**Problem:** The Export CSV button on /audit uses the wrong style and is positioned below the page title rather than inline with it.

**Acceptance criteria:**
- Export CSV on /audit matches the button variant, colour, and title-row position of the register page Export CSV button.
- No regression to the audit export functionality.

**Reference:** Use the /registers/<registerID> page as the pattern for both button variant/colour and title-row layout.

**Key files:** `frontend/src/pages/AuditPage.tsx`
**Agents:** Frontend Developer

---

### BUG-008 — Remove icon from /help page header (medium)
Source: REQ-019
Capability: help-content

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

**Problem:** The register page has both a State dropdown (with Closed as an option) and a separate Show closed checkbox. The checkbox is redundant.

**Acceptance criteria:**
- The Show closed checkbox is removed from the register page filter bar.
- Closed risks remain accessible via the State dropdown.
- No regression to filter behaviour or existing filter tests.

**Implementation note:** Confirm that removing the checkbox does not break any filter state persistence or URL param logic that references it before proceeding.

**Key files:** `frontend/src/pages/RegisterPage.tsx`
**Tests:** `frontend/test/risks.test.mjs`
**Agents:** Frontend Developer, Test Engineer

---

### UI-009 — Move "Configuration is version-controlled" alert above action buttons (medium)
Source: REQ-028
Capability: config-lifecycle-templates

**Problem:** The version-controlled alert appears below the action button group on the configuration page, making it feel like an afterthought rather than context.

**Acceptance criteria:**
- The version-controlled alert is rendered above the action button group.
- No regression to configuration page layout or functionality.

**Key files:** `frontend/src/pages/RegisterConfigPage.tsx`
**Agents:** Frontend Developer

---

### UI-010 — Use Mantine Fieldset on register permissions page (medium)
Source: REQ-027
Capability: register-ui

**Problem:** The register permissions page does not use Mantine Fieldset for content grouping, unlike the configuration settings page and other sub-pages.

**Acceptance criteria:**
- The permissions page uses Mantine Fieldset consistent with the configuration settings page pattern.
- No regression to permissions page functionality or existing tests.

**Reference:** Configuration settings page and its sub-pages are the pattern to follow.

**Key files:** `frontend/src/pages/RegisterPermissionsPage.tsx`
**Agents:** Frontend Developer

---

## Required agents

- Frontend Developer (all items)
- Test Engineer (BUG-003, BUG-004, BUG-005, UI-003)

## Decisions

- **BUG-004 colour approach:** Use Mantine theme tokens or CSS variables — no hardcoded colours, no conditional light/dark checks.
- **BUG-005 API check:** Developer must verify /my-risks API response includes review status per risk before implementing the conditional render. If missing, a minimal backend addition is in scope.
- **BUG-006 sequencing:** Implement after BUG-003 so the Views feature is functional before its styling is corrected.
- **UI-003 checkbox removal:** Verify no URL param or filter state persistence logic references the show-closed checkbox before removing it.

## Blockers

None.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
