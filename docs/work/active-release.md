# Active Release

Status: in-progress
Version: v1.17.1

## Release goal

Close the post-v1.17.0 gap: fix the critical calculated field save error that blocks all CALCULATED field use, verify calculated field end-to-end behaviour, update help docs for the scoring formula feature that shipped in v1.17.0, and make open-risk and overdue counts on /registers clickable links.

## Selected work items

### BUG-050 — Fix calculated field save error — missing validationMode
Source: REQ-050
Capability: custom-fields
Status: ready

**Problem:** Adding or editing a custom field of type CALCULATED throws a backend validation error because the frontend omits `validationMode`. The validation mode input is intentionally hidden for CALCULATED fields, but the backend still requires one of `"ALLOW"|"WARN"|"BLOCK"`. This blocks all use of calculated fields.

**Acceptance criteria:**
- Adding a CALCULATED custom field no longer throws a validation error.
- Editing an existing CALCULATED custom field saves successfully.
- `validationMode` is sent as `"ALLOW"` for CALCULATED fields in all form submission paths.
- No regression to ALLOW/WARN/BLOCK behaviour for non-CALCULATED field types.

**Fix:** In `CustomFieldModal.tsx` onSubmit handler, add `validationMode: "ALLOW"` when `values.fieldType === "CALCULATED"`. No backend change required.

**Key files:** `frontend/src/features/configuration/CustomFieldModal.tsx`

**Tests:** `frontend/test/configuration.test.mjs` — add or update a test covering CALCULATED field create and edit.

---

### BUG-049 — Verify calculated field end-to-end functionality post BUG-050 fix
Source: REQ-049
Capability: custom-fields
Status: ready
Depends on: BUG-050

**Problem:** After the save error is resolved, confirm that calculated fields actually work end-to-end with a known-good example. Catch any further issues before they are reported again.

**Acceptance criteria:**
- A CALCULATED custom field can be created, saved, and displays a computed value on a risk record.
- The formula evaluator correctly resolves field references in a sample formula.
- Any remaining bugs identified during verification are logged as separate requests.

**Key files:** `backend/src/services/formulaEvaluator.service.ts`, `frontend/src/features/configuration/CustomFieldModal.tsx`

**Tests:** `backend/test/customFields.test.mjs`

**Note:** BUG-050 must be implemented before this verification step runs. Test Engineer should use a concrete example (formula, fields referenced, expected output) and document it in the test.

---

### MAINT-006 — Update help docs for configurable scoring formula feature
Source: REQ-052
Capability: help-content
Status: ready

**Problem:** PM6-SCORING shipped in v1.17.0 with no help content update. Users find no in-app guidance on configuring or using custom scoring formulas.

**Acceptance criteria:**
- Help content in `frontend/public/help/en/` updated to reflect the scoring formula feature.
- Content covers: how to write a formula; available canonical variable names (`likelihood`, `impact`); numeric custom field references; constants; supported arithmetic operators (+, -, *, /, parentheses).
- Content covers validation behaviour: formulas are checked on save and enforced on publish; invalid formulas are rejected with an error message.
- Content notes that existing registers default to `likelihood × impact` and are unaffected unless a Register Admin changes the formula.

**Key files:** `frontend/public/help/en/`

---

### UI-020 — Make open-risk and overdue counts clickable links on /registers
Source: REQ-051
Capability: register-list
Status: ready

**Problem:** The /registers page table shows plain-text open-risk and overdue counts. They should be clickable links, consistent with the pattern already used by the Admin Summary widget (REQ-034).

**Acceptance criteria:**
- Open-risk count on /registers is a link to `/registers/<registerID>` with an open-risks filter pre-applied.
- Overdue count on /registers is a link to `/registers/<registerID>` with an overdue-reviews filter pre-applied.
- Links match the visual and navigation pattern used by the Admin Summary widget counts.
- No regression to /registers page load, permissions, or table sorting/filtering behaviour.

**Implementation note:** Reference the Admin Summary widget implementation for the exact filter param format before implementing.

**Key files:** `frontend/src/features/registers/RegistersPage.tsx`

**Tests:** `frontend/test/registers.test.mjs`

---

## Required agents

- **frontend-developer** — BUG-050 (CustomFieldModal fix), UI-020 (register count links), MAINT-006 (help content update)
- **test-engineer** — BUG-049 (end-to-end calculated field verification), test coverage for BUG-050 and UI-020

**Sequencing:** BUG-050 must be implemented before BUG-049 verification begins. All other items are independent and can run in parallel.

## Decisions

No open decisions. All items have established patterns or clearly specified fixes.

## Blockers

None.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
