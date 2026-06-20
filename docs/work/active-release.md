# Active Release

Status: in-progress
Version: v1.18.0

## Release goal

Custom-field UX polish: surface WARN field indicators in the risk edit form, add live formula validation to the CALCULATED field modal, and show a real-time computed preview when editing a risk with CALCULATED fields.

## Selected work items

### UI-021 — Show yellow asterisk for WARN fields in risk edit form
Source: REQ-053
Capability: custom-fields
Status: proposed

**Problem:** The risk edit form shows a red asterisk (*) for required (BLOCK) fields but gives no visual signal for WARN fields. Users cannot tell which fields are "suggested" until they attempt to save and see the warning.

**Acceptance criteria:**
- Fields with `validationMode: WARN` display a yellow asterisk (*) in the risk edit form.
- Fields with `validationMode: BLOCK` continue to display a red asterisk (*).
- Fields with `validationMode: ALLOW` display no asterisk.
- Both colours are visually distinguishable in light and dark mode using Mantine colour tokens (not hardcoded hex).
- No regression to form submission, field validation behaviour, or existing required-field indicators.

**Key files:** `frontend/src/features/risks/RiskFormModal.tsx`

**Tests:** `frontend/test/risks.test.mjs`, `frontend/test/configuration.test.mjs`

---

### UI-022 — Live formula validation in CALCULATED field modal
Source: REQ-054
Capability: custom-fields
Status: proposed
Depends on: BUG-050 (done in v1.17.1)

**Problem:** The formula textarea in CustomFieldModal.tsx gives no validation feedback. An invalid formula is silently accepted when saving the field definition and only rejected at config publish time.

**Acceptance criteria:**
- The formula textarea shows live validation feedback as the user types, using a debounced call to the existing `/validate-formula` endpoint.
- An invalid formula displays a clear error message below the textarea.
- A valid formula clears the error state.
- Save behaviour (blocked or warned) matches the pattern used by the scoring formula panel — developer to confirm and replicate exactly.
- No regression to the custom field modal save flow or other field types.

**Decision:** Debounce pattern and error display → replicate exactly from `ScoringConfigurationPanel.tsx` for consistency.

**Implementation note:** Confirm whether the `/validate-formula` endpoint handles CALCULATED field formula context (variable set differs from scoring formula). If not, a separate validation endpoint or payload variant may be needed — flag to PM if a new endpoint is required.

**Key files:** `frontend/src/features/configuration/CustomFieldModal.tsx`, `frontend/src/features/configuration/ScoringConfigurationPanel.tsx`

**Tests:** `frontend/test/configuration.test.mjs`

---

### UI-023 — Real-time CALCULATED field preview in risk edit form
Source: REQ-055
Capability: custom-fields
Status: proposed
Depends on: BUG-050 (done in v1.17.1)

**Problem:** When editing a risk, CALCULATED custom fields show the last saved server-side value and do not update as the user edits the referenced numeric fields. The correct value only appears after saving and reopening.

**Acceptance criteria:**
- The CALCULATED field value updates in real time as the user edits referenced numeric fields in the risk edit form.
- Preview is computed client-side using the formula from the register config — no extra backend call per keystroke.
- The preview is clearly visually distinguished as a computed-but-not-yet-saved value (e.g. greyed-out or italicised — developer to choose an appropriate Mantine treatment).
- On save, the server-side evaluated value is authoritative; the preview is discarded.
- No regression to risk edit form submission, field validation, or the CALCULATED field display on the risk detail view.

**Decision:** Client-side formula evaluation → implement a lightweight evaluator in the frontend rather than calling the backend on each keystroke. The backend `formulaEvaluator.service.ts` is the reference for evaluation logic. If the formula language is simple enough (arithmetic + field references), a frontend reimplementation is acceptable; if not, use a debounced backend call as a fallback and flag the approach chosen.

**Key files:** `frontend/src/features/risks/RiskFormModal.tsx`, `backend/src/services/formulaEvaluator.service.ts`

**Tests:** `frontend/test/risks.test.mjs`

---

## Required agents

- **frontend-developer** — UI-021 (WARN asterisk), UI-022 (formula live validation), UI-023 (real-time preview)
- **test-engineer** — test coverage for all three items

**Sequencing:** All three items are independent and can run in parallel. UI-022 and UI-023 are both in `CustomFieldModal.tsx` / `RiskFormModal.tsx` respectively — the frontend-developer should be aware of the overlap but there is no functional dependency between them.

## Decisions

No open decisions.

## Blockers

None.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
