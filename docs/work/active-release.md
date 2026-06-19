# Active Release

Status: ready-for-release
Version: v1.12.0

## Release goal

Make the /my-risks page and homepage widget genuinely useful by enabling in-place modals throughout: users can view, edit, and review risks without being navigated away from their current page. Add Admin widget clickthrough to pre-filtered register views. A focused, frontend-only release — no backend schema changes.

## Selected work items

### UI-004 — Open edit and view modals in-place on /my-risks page
Source: REQ-022
Capability: my-risks-ui
Status: done
done_in: v1.12.0

**Problem:** Clicking Edit or a risk ID on /my-risks navigates the user away to /registers/<registerID> and opens the modal there. Both actions should open the modal directly on /my-risks, keeping the user in context.

**Acceptance criteria:**
- Clicking a risk ID on /my-risks opens the risk view modal on the /my-risks page without navigating away.
- Clicking Edit on /my-risks opens the risk edit modal on the /my-risks page without navigating away.
- After the modal is dismissed or submitted, the user remains on /my-risks with the table refreshed if needed.
- No regression to modal content or submit/cancel behaviour.

**Implementation note:** The developer must confirm whether RiskFormModal and RiskDetailModal assume register page context (e.g. via a registerId prop drawn from router state). If so, they need to be made mountable from a non-register-page context. The modals' content does not need to change — only the trigger location.

**Key files:** `frontend/src/pages/MyRisksPage.tsx`, `frontend/src/features/risks/RiskFormModal.tsx`, `frontend/src/features/risks/RiskDetailModal.tsx`
**Tests:** `frontend/test/myRisks.test.mjs`
**Agents:** Frontend Developer, Test Engineer

---

### UI-008 — Add inline review action to "My overdue risks" homepage widget
Source: REQ-033
Capability: homepage
Status: done
done_in: v1.12.0

**Problem:** The My overdue risks homepage widget has no Review button. Users must navigate away to complete a review. The button should open the review modal in-place on the homepage; after submission the widget refreshes.

**Acceptance criteria:**
- Each risk in the My overdue risks widget shows a Review button.
- Clicking Review opens the review modal in-place on the homepage without navigating away.
- After the review is submitted the widget data refreshes to reflect the updated state.
- No regression to the review modal content or submit flow.

**Decision:** UI-008 depends on UI-004's modal portability solution. The same pattern (modal mountable outside register page context) must be confirmed working before wiring up the homepage widget.

**Key files:** `frontend/src/features/homepage`, `frontend/src/features/risks/ReviewModal.tsx`
**Agents:** Frontend Developer, Test Engineer

---

### UI-007 — Make Admin summary widget counts link to pre-filtered register
Source: REQ-034
Capability: homepage
Status: done
done_in: v1.12.0

**Problem:** The Admin summary homepage widget shows open risk counts and overdue review counts per register as plain numbers. Each count should link to the relevant register page with the appropriate filter pre-applied.

**Acceptance criteria:**
- The open risks count in the Admin summary widget links to /registers/<registerID> with the open risks filter pre-applied.
- The overdue reviews count links to /registers/<registerID> with the overdue reviews filter pre-applied.
- No regression to the Admin summary widget data display or other homepage widgets.

**Decision:** Use URL params for filter pre-population (not navigation state) — this is the shareable, bookmarkable approach. If the register page does not already support URL-driven filter state, the developer should add URL param support for at minimum `state=open` (for the open risks count) and an appropriate overdue-reviews param (e.g. `reviewStatus=overdue`) as part of this item. Confirm the exact param names against the existing filter state model before implementing.

**Key files:** `frontend/src/features/homepage`, `frontend/src/pages/RegisterPage.tsx`
**Agents:** Frontend Developer

---

### UI-002 — Show risk ID and title in sticky risk modal headers
Source: REQ-024, REQ-025
Capability: register-ui
Status: done
done_in: v1.12.0

**Problem:** The risk view modal shows "Risk Detail" as its sticky header. The edit risk modal shows a generic heading. Both should show the risk ID and title so users retain context while scrolling.

**Acceptance criteria:**
- The risk view modal sticky header shows the risk ID and title instead of "Risk Detail".
- The edit risk modal sticky header shows the risk ID and the live current value of the title field, updating on every keystroke.
- No regression to modal layout, scroll behaviour, or submit/cancel flows.

**Implementation note:** The header is already sticky — this is a content change only. For the edit modal, mirror the title input's controlled state value into the header; no layout changes needed.

**Key files:** `frontend/src/features/risks/RiskFormModal.tsx`, `frontend/src/features/risks/RiskDetailModal.tsx`

**Verification feedback (round 1):** Risk ID appears twice in the view modal — once in the sticky header (new, correct) and again at the top of the modal body table. The review status badge was sitting next to that risk ID in the body and is left dangling when the ID is removed.
**Ruling:** in scope — removing the duplicate ID is required to meet "no regression to modal layout"; the review status treatment is a direct consequence of that change.
**Fix (round 1):** Remove the risk ID from the modal body table. Move the review status from a badge into the table as a plain row.

**Verification feedback (round 2):** Review status row shows plain text instead of a badge, and the label reads "Review Status" — it should match the "Review" column label used elsewhere. The row also appears at the end of the table; Review Status is not part of the register field configuration so the admin cannot order it — flagged as a backlog gap.
**Ruling:** badge + label fix in scope; field configuration ordering gap deferred to backlog.
**Fix (round 2):** Use ReviewStatusBadge as the cell value. Rename label to "Review". Log ordering gap in requests.md.
**Agents:** Frontend Developer

---

## Required agents

- Frontend Developer (all items)
- Test Engineer (UI-004, UI-008)

## Decisions

- **UI-007 filter mechanism:** Use URL params for filter pre-population, not navigation state. If register page does not already support URL-driven filter state, add it for `state=open` and overdue-reviews equivalent as part of this item.
- **UI-008 dependency on UI-004:** Modal portability pattern must be confirmed working (from UI-004) before wiring the homepage widget. Implement UI-004 first.
- **UI-002 edit modal title:** Mirror the controlled title input state into the sticky header; update on every keystroke.

## Test / sign-off

- [x] Implementation pass complete
- [x] Regression test pass complete (312/312 pass)
- [x] TypeScript typecheck clean
- [x] Documentation pass complete

## Blockers

None.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
