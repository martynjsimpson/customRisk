# SPIKE-008: Register Configuration Draft System — Architectural Review

**Status:** Complete
**Date:** 2026-06-25
**Author:** Principal Architect

---

## Context

The register configuration draft system allows admins to stage changes to the risk matrix, custom fields, and register settings in a JSON snapshot (`RegisterConfigVersion.snapshotJson`) before applying them atomically via a publish transaction. The system is documented in `docs/architecture/register-config-draft-system.md`.

The product owner has identified that register settings fall into two categories, but the split was never a deliberate design decision:

- **Category A** — fields stored in `snapshotJson`, applied on publish.
- **Category B** — fields stored directly on the `Register` model, written immediately via `PATCH /registers/:registerId`, bypassing the draft system.

The concern is that the split is architecturally incoherent, creates a footgun for future developers, and produces inconsistent UX (some settings apply immediately, others require draft-then-publish). This spike investigates the origin of the split, evaluates whether it is justified, and recommends a direction.

---

## Investigation

### Why does Category B exist?

The draft system was introduced in commit `dd65cbc` ("feature Register configuration and templates", 2026-05-18). At that point, `ConfigSnapshotRegisterSettings` contained:

```
name, description, riskIdPrefix, riskIdZeroPaddingEnabled, riskIdZeroPaddingWidth,
defaultNewRiskState, reviewsEnabled, defaultReviewFrequencyMonths,
reviewAttestationText, allowViewerExport
```

The publish logic at that commit already included a critical architectural decision, stated in a comment that has survived unchanged to the present day:

> "Register settings are only applied from the snapshot when the draft originated from a template (sourceTemplateVersionId set), because adopting the template's settings is deliberate. For manually-created drafts, direct edits to the register made while the draft was in progress take precedence and must not be overwritten."

This means that from day one, for the common case of a manually-created draft, publishing the draft did NOT apply the register settings stored in the snapshot back to the `Register` row. The snapshot contained those fields for historical record and for template-origin behaviour, but the live `Register` row was the authoritative source. The `PATCH /registers/:registerId` path was always the effective write path for register settings, regardless of whether a draft existed.

Every subsequent field added to `ConfigSnapshotRegisterSettings` followed one of two accretion patterns:

1. **Added to snapshot with no publish promotion for manual drafts** — `customFieldValidationEnabled` (commit `499d38a`), `reviewStatusPosition` (commit `2755757`). These fields were added to the snapshot (for template support and historical record) but their live value continued to come from `PATCH /registers/:registerId`. They are Category B in effect even though they live in the snapshot.

2. **Added to snapshot WITH explicit publish promotion** — `scoringFormula` (commit `9eea5ae`, with a later fix `f33780b`), `responseActionMode` (commit `e22baf6`), `reviewCommentMode` (commit `af0c027`). These fields receive special-case handling in `publishDraft` that promotes them outside the template-origin conditional block — they are always applied on publish regardless of draft origin. These are genuinely Category A in behaviour, and two of them (`responseActionMode`, `reviewCommentMode`) require or benefit from impact analysis before publish.

**Conclusion on origin:** Category B was not a deliberate architectural decision. It is an artefact of the original publish logic, which chose not to overwrite live register settings on manual draft publish. As fields were added subsequently, each developer had to understand this undocumented constraint and decide which fields warranted special-case promotion. Some fields that should be Category A (reviewed below) were simply never promoted.

---

### Field-by-field analysis

The following fields exist on the `Register` model and are included in `PATCH /registers/:registerId`. Fields are evaluated against the question: should they travel through the draft system and be applied atomically on publish?

#### Fields already in the snapshot with always-promote publish semantics (genuinely Category A)

**`scoringFormula`**
Currently always promoted on publish (`scoringFormula: regSettings.scoringFormula ?? ""`). Correct. The formula determines risk scores; it must be co-ordinated with the likelihood/impact/riskLevel changes that come through the same publish. Impact analysis validates the formula against custom fields in the draft. This field must remain Category A.

**`responseActionMode`**
Always promoted on publish when the snapshot carries the field. Correct. A mode change triggers a non-trivial data migration (`migrateSimpleResponseActionsToChildRecords` / `migrateChildRecordsToSimple`). Impact analysis has specific blocker and warning logic for this field. Reverting from CHILD_RECORDS to SIMPLE is blocked when risks have multiple action records. This field must remain Category A. The publish-time migration and the impact analysis check are the specific technical reasons it cannot be an immediate-effect field.

**`reviewCommentMode`** and **`reviewAttestationText`**
Both are in the snapshot and are always promoted on publish (inside the `sourceTemplateVersionId` conditional only as of the current code — see note below). However, the UI already implements the dual-path pattern for both: `updateDraftReviewFieldsMutation` for draft mode, `updateSettingsMutation` for non-draft mode. These fields affect review behaviour observed by risk owners during review. There is no impact analysis for them and no data migration required. The question of whether they warrant Category A treatment is discussed in the Findings section.

**Note on publish promotion gap:** the current `publishDraft` code only promotes `reviewCommentMode` and `reviewAttestationText` inside the `sourceTemplateVersionId` conditional. For manual drafts these fields are staged in the snapshot but NOT applied to the `Register` row on publish. The dual-path UI pattern compensates: the user edits them via `updateDraftConfig` (which updates the snapshot) AND via `updateRegister` (which the `onBlur` path fires outside draft mode). The live `Register` row value comes from `updateRegister` in both cases; the snapshot value is purely archival for manual drafts. This is subtle and underdocumented.

---

#### Fields in the snapshot but NOT always promoted on publish (Category B in live effect despite appearing in snapshot)

**`reviewsEnabled`** (in snapshot since `dd65cbc`)
Controls whether the review workflow is available. Changing this does not affect risk score calculation or require a data migration. No impact analysis exists for it. It is currently saved directly via `PATCH /registers/:registerId` in both draft and non-draft modes (the form `onBlur` fires when `!draftConfigMode`, and in draft mode the field is subject to `settingsLocked` but the form `onBlur` guard means it never fires a direct write in draft mode — making it effectively uneditable in draft mode except via the save button path that is hidden in draft mode). In practice, `reviewsEnabled` cannot be changed at all while a draft exists, which is an undocumented constraint.

**`defaultReviewFrequencyMonths`**
Same analysis as `reviewsEnabled`. No impact analysis. No data migration. The monthly frequency affects when `nextReviewDate` is calculated for new reviews, but existing review dates are not recalculated on publish. Immediate effect is appropriate.

**`allowViewerExport`**
A permission flag: whether Register Viewers can trigger CSV exports. No impact on risk data. No migration needed. Immediate effect is clearly correct.

**`customFieldValidationEnabled`**
Controls whether the validate/warn/block mode on custom fields is enforced system-wide for this register. No data migration. No impact analysis. Immediate effect is appropriate.

**`reviewStatusPosition`**
A UI display preference (column ordering). No data semantics. Immediate effect is correct.

**`name`**
Register name is used in audit summaries and is surfaced throughout the UI. Requiring a draft to rename a register would be severely disruptive. Immediate effect is clearly correct. The snapshot contains `name` for template-origin purposes only.

**`description`**
Same as `name`. Immediate effect is correct.

**`riskIdPrefix`**, **`riskIdZeroPaddingEnabled`**, **`riskIdZeroPaddingWidth`**
Risk ID formatting. These fields affect the `displayRiskId` generated for new risks, but do not recalculate existing risk IDs. Changing the prefix does not invalidate existing IDs. Immediate effect is acceptable. No case for draft treatment.

**`defaultNewRiskState`**
Governs the initial state (`DRAFT` or `OPEN`) of newly created risks. Changing this has no retroactive effect on existing risks. No impact analysis. Immediate effect is appropriate.

---

#### Summary table

| Field | In snapshot | Promoted on publish | Has impact analysis | Has migration | Verdict |
|---|---|---|---|---|---|
| `scoringFormula` | Yes | Always | Yes (formula validation) | No (but recalc) | Correct as Category A |
| `responseActionMode` | Yes | Always | Yes (blocker + warning) | Yes (data migration) | Correct as Category A |
| `reviewCommentMode` | Yes | Template-origin only | No | No | Should be promoted always; see Rec 1 |
| `reviewAttestationText` | Yes | Template-origin only | No | No | Should be promoted always; see Rec 1 |
| `reviewsEnabled` | Yes | Template-origin only | No | No | Immediate effect acceptable; see Rec 2 |
| `defaultReviewFrequencyMonths` | Yes | Template-origin only | No | No | Immediate effect acceptable |
| `allowViewerExport` | Yes | Template-origin only | No | No | Immediate effect appropriate |
| `customFieldValidationEnabled` | Yes | Template-origin only | No | No | Immediate effect appropriate |
| `reviewStatusPosition` | Yes | Template-origin only | No | No | Immediate effect appropriate |
| `name` | Yes | Template-origin only | No | No | Immediate effect correct |
| `description` | Yes | Template-origin only | No | No | Immediate effect correct |
| `riskIdPrefix` | Yes | Template-origin only | No | No | Immediate effect correct |
| `riskIdZeroPaddingEnabled` | Yes | Template-origin only | No | No | Immediate effect correct |
| `riskIdZeroPaddingWidth` | Yes | Template-origin only | No | No | Immediate effect correct |
| `defaultNewRiskState` | Yes | Template-origin only | No | No | Immediate effect correct |

---

### What a unified system would require

A fully unified system — where every register setting travels through the draft and is applied only on publish — is technically achievable but involves significant cost for little benefit on most fields. The more useful unification is narrower: ensure the fields that already claim to be Category A (by living in the snapshot) actually behave consistently. The fields that warrant genuine Category A treatment are `reviewCommentMode` and `reviewAttestationText`, because:

1. They are already in the snapshot and already have a draft-path mutation in the frontend (`updateDraftReviewFieldsMutation`).
2. The current publish logic does not promote them for manual drafts, meaning the snapshot value and the live register value can diverge.
3. An admin who stages `reviewCommentMode = MANDATORY` in a draft sees the change reflected in the form (via `configQuery.data`) but the live register retains `OPTIONAL` until publish — except that it does not actually change on publish for a manual draft. The draft path is currently a dead-end for these fields on manual drafts.

A unified treatment for `reviewCommentMode` and `reviewAttestationText` requires:

**Backend (`configVersion.publish.service.ts`):**
Move `reviewCommentMode` and `reviewAttestationText` out of the `sourceTemplateVersionId` conditional block and always promote them, using the same pattern as `scoringFormula`.

**Backend (`registers.service.ts` / `registers.schemas.ts`):**
Remove `reviewCommentMode` and `reviewAttestationText` from the `PATCH /registers/:registerId` handler when draft mode is active. This is more complex: the route does not currently know whether a draft is active. The simplest safe option is to leave them in the `PATCH` handler but rely on the frontend not calling it for those fields when in draft mode. The current `handleFormBlur` guard (`if (!draftConfigMode && ...)`) already provides this protection, so no backend change is strictly required for correctness.

**Frontend (`RegisterSettingsTab.tsx`):**
No changes needed. The dual-path pattern is already correctly implemented: `updateDraftReviewFieldsMutation` fires in draft mode, the form `onBlur` guard suppresses the direct path. The gap is entirely on the publish side.

For the remaining fields (`reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`, `name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`), full unification would require:

- Removing the form `onBlur` auto-save path for each field in draft mode.
- Wiring each field to `updateDraftConfig` in draft mode.
- Adding publish promotion logic for each field.
- Adding `settingsLocked` checks or draft-creation requirements for each field when a draft is not yet open.
- No data migration is needed for any of these fields.

The benefit would be that an admin could prepare a rename, review frequency change, and risk matrix change together and apply them atomically. The cost is that every settings change requires creating a draft first — a significant increase in friction for what are today simple, safe, immediate changes. None of these fields interact with impact analysis, and changing them cannot produce an inconsistent data state.

---

### Migration path

No data migration is needed for any of the changes recommended below.

The fields under analysis have always been stored on the `Register` model. Moving a field to be "always promoted on publish" does not change any column or any existing snapshot data. Existing published snapshots already contain the field values (they were captured in the snapshot from day one); those values simply need to be applied to the `Register` row at publish time.

For `reviewCommentMode` and `reviewAttestationText` specifically: if a register has an existing draft that was created before the promotion change, that draft's snapshot contains whatever value the field had at draft-creation time (or whatever the admin staged via `updateDraftConfig`). When the promotion is added to `publishDraft`, the next publish will apply that snapshot value. This is the intended behaviour — the snapshot value was already the canonical draft representation.

There is a theoretical edge case: an admin creates a draft, directly edits `reviewCommentMode` on the live register via some other path (e.g., direct API call), and then publishes the draft. After the promotion change, the published draft would overwrite the direct edit. This is not currently possible from the UI because `handleFormBlur` blocks the direct path in draft mode. The risk is acceptable.

---

## Findings

**Finding 1: The split is unintentional accretion, not a design decision.**
The original implementation chose not to overwrite live register settings on manual draft publish. Every subsequent field addition inherited this behaviour by default. Fields that warranted always-promotion were only promoted when a developer noticed the need and added a special case (`scoringFormula`, `responseActionMode`). The two most recent additions (`reviewCommentMode`, `reviewAttestationText`) were correctly added to the snapshot and correctly wired in the frontend but were not promoted in `publishDraft` for manual drafts. This was the root cause of the v1.27.0 regression.

**Finding 2: The gap between snapshot and live register on manual drafts creates ongoing risk.**
For any field that has a draft-mode UI path (`updateDraftConfig`) but is not promoted on publish, the draft snapshot and the live register will diverge every time the admin uses the draft-mode UI. The frontend compensates by also writing directly to the register via `PATCH /registers/:registerId` (the `onBlur` path), but this compensation depends on the guard condition being maintained correctly. Any future UI change that removes or misapplies the guard will silently break the field's live behaviour.

**Finding 3: Most Category B fields are correctly immediate-effect.**
After field-by-field analysis, the following are correctly treated as immediate-effect: `name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`. None of these have data migration requirements, impact analysis logic, or semantic coupling to the matrix/formula/field configuration that the draft system exists to co-ordinate. Requiring a draft to change a register's name or review frequency would impose unnecessary friction.

**Finding 4: `reviewCommentMode` and `reviewAttestationText` should be always-promoted.**
These two fields are already in the snapshot, already have a draft-mode UI path, and already have the frontend `onBlur` guard suppressing the direct path in draft mode. The only thing missing is the backend publish promotion. Their behaviour is semantically closer to `scoringFormula` (always apply on publish) than to `name` (template-origin only). An admin who stages a review comment policy change expects it to be applied atomically with the rest of the published draft.

**Finding 5: The two-mutation pattern in the frontend is fragile by design.**
For any field with dual paths, the correctness of the system depends on three separate conditions all being maintained simultaneously: the draft-mode mutation firing in draft mode, the `onBlur` guard suppressing the direct path in draft mode, and the `publishDraft` service promoting the field. A single misstep at any layer produces a silent bug. This fragility is inherent to the current architecture and will recur with each new field addition.

**Finding 6: Future developers have no reliable signal for which category a new field belongs to.**
The architecture document (`register-config-draft-system.md`) now describes both categories, but the categorisation guidance is informal. The code itself provides no guard: both `PATCH /registers/:registerId` and `PATCH /config-versions/draft` accept overlapping fields without enforcing separation.

---

## Recommendations

### Recommendation 1: Fix `reviewCommentMode` and `reviewAttestationText` publish promotion (high priority, low effort)

Add `reviewCommentMode` and `reviewAttestationText` to the always-promote block in `publishDraft` in `backend/src/services/configVersion.publish.service.ts`, using the same pattern as `scoringFormula`. Move them out of the `sourceTemplateVersionId` conditional.

This closes the current gap between the snapshot and the live register for these fields on manual drafts. No schema change, no data migration, no frontend change.

**Backlog item:** "Fix: always promote `reviewCommentMode` and `reviewAttestationText` from snapshot on publish (manual drafts)."

### Recommendation 2: Remove the dual-path for `reviewCommentMode` and `reviewAttestationText` in the frontend (medium priority, low effort)

Once Recommendation 1 is implemented, the `PATCH /registers/:registerId` path for these two fields becomes redundant in draft mode. The `handleFormBlur` guard already suppresses it in draft mode, but the `updateSettingsMutation` still lists both fields in its payload. Remove them from `updateSettingsMutation` when `draftConfigMode` is true, or restructure the mutation to exclude them unconditionally (the draft path via `updateDraftReviewFieldsMutation` covers them). This reduces the surface area of the dual-path pattern.

**Backlog item:** "Simplify: remove `reviewCommentMode`/`reviewAttestationText` from the direct-register save path in draft mode."

### Recommendation 3: Codify the two-category model in a developer-facing rule, not just documentation (medium priority, no effort)

The existing `register-config-draft-system.md` documents the two categories clearly. The recommendation is to promote this document to a mandatory checklist in the pull request template or contributing guide: any PR that adds a column to the `Register` model must state which category the field belongs to, and why. This does not require code changes but sets a process gate.

**Backlog item:** "Process: add register settings categorisation checklist to PR template."

### Recommendation 4: Do NOT unify all settings through the draft system (standing decision)

Full unification — routing all register settings through the draft and applying them only on publish — is not recommended. The fields correctly identified as immediate-effect (`name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`) carry no semantic coupling to the matrix or formula configuration. Requiring a draft for every settings change would impose draft-creation friction on routine operations such as renaming a register, toggling viewer export, or adjusting the review frequency. The value of the draft system is in co-ordinating changes that have data consequences (matrix, formula, field deactivation). These fields do not.

**Backlog item:** None required. Record this as a closed decision.

### Recommendation 5: Evaluate whether `reviewsEnabled` and `defaultReviewFrequencyMonths` should also be always-promoted (low priority, low effort, deferred)

These fields affect review scheduling behaviour and are semantically related to `reviewCommentMode` and `reviewAttestationText`. They are currently immediate-effect, and there is no practical problem with that. However, if the product ever introduces impact analysis for review-related settings (e.g., warning that changing review frequency will affect how many risks become overdue), these fields would need to be always-promoted at that point. No action required now, but the pattern established by Recommendation 1 should be extended to include them if impact analysis for review settings is ever built.

**Backlog item:** "Future: extend always-promote to `reviewsEnabled` / `defaultReviewFrequencyMonths` if review impact analysis is introduced."

---

## Summary

Category B is an unintentional artefact, not a design decision. For the vast majority of fields it produces the correct outcome: immediate-effect changes that require no draft. The specific problem identified by the product owner is real but narrow: `reviewCommentMode` and `reviewAttestationText` are misclassified. They behave as Category B on the backend (publish does not promote them for manual drafts) despite being wired as Category A on the frontend. This gap was the direct cause of the v1.27.0 regression. The fix is a targeted change to `publishDraft` — not a system-wide architectural overhaul.

Full unification would solve the developer footgun (every new field would have one path) but at the cost of significant friction for admins and significant implementation effort for no operational benefit on the fields in question.
