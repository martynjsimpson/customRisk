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

## Template System Analysis

### How template linkage works today

The schema maintains two distinct pointers:

- `Register.linkedTemplateVersionId` — points to a specific `RegisterTemplateVersion`. This is the version the register is currently "linked to" for the purpose of detecting template drift. It is set when a register is created from a template, when a template is created from a register (the originating register is automatically linked), and when `applyTemplateUpdateToDraft` is called and that draft is published.

- `RegisterConfigVersion.sourceTemplateVersionId` — set on a draft when `applyTemplateUpdateToDraft` creates it. It records which template version was the source of this particular draft. It is null for all manually created drafts.

These two fields serve different purposes and are updated at different moments. `linkedTemplateVersionId` is the live membership pointer; `sourceTemplateVersionId` is a provenance record on an individual draft.

The backend already computes and returns a derived `linkedTemplate` object on the register response. This object includes `isLatest: boolean`, which compares the linked version's `versionNumber` against the highest published version number for that template. This field is the mechanism by which the UI can detect that a template has been updated and the register is behind.

**Critically:** `linkedTemplateVersionId` is NOT updated on publish when a template-origin draft is published. Looking at `publishDraft` in `configVersion.publish.service.ts`: the `tx.register.update` call inside the transaction sets `linkedTemplateVersionId: draft.sourceTemplateVersionId` inside the `sourceTemplateVersionId` conditional block. This means that when a template-origin draft is published, `linkedTemplateVersionId` advances to the template version that was applied. This is correct — it moves the register's "sync point" forward.

For manual drafts, `linkedTemplateVersionId` is never touched by `publishDraft`. If a linked register creates a manual draft and publishes it, the register remains linked to whichever template version it was linked to before.

### What is editable when linked to a template

There is no backend enforcement preventing a linked register from deviating from its template. `PATCH /registers/:registerId` does not check `linkedTemplateVersionId`. The draft creation endpoint (`POST /config-versions/draft`) does not check `linkedTemplateVersionId`. Any field can be changed independently of the template at any time.

There is no UI enforcement either. The UI surfaces `linkedTemplate.isLatest` to indicate drift, and provides the "apply template update" action to create a template-origin draft. But it does not lock fields or prevent editing when linked.

Unlinking is an explicit admin action (`DELETE /registers/:registerId/template-link`). Once unlinked, `linkedTemplateVersionId` is set to null and the register is entirely self-governing.

This is the intended design: linked registers can deviate freely, and the link is informational. The admin decides whether to incorporate template updates via the apply-and-draft flow.

### Is the template-origin distinction in publish the root cause of the Category A bug?

Yes. This is the direct root cause of Category A settings (`reviewCommentMode`, `reviewAttestationText`) not persisting for manual-draft users.

The conditional in `publishDraft` at lines 703–719 is:

```typescript
...(draft.sourceTemplateVersionId
  ? {
      description: ...,
      riskIdPrefix: ...,
      // ... all Category B fields ...
      reviewAttestationText: regSettings.reviewAttestationText,
      reviewCommentMode: regSettings.reviewCommentMode as any,
      // ...
      linkedTemplateVersionId: draft.sourceTemplateVersionId
    }
  : {}),
```

When `sourceTemplateVersionId` is null (every manually created draft), the spread resolves to an empty object `{}`. The `reviewAttestationText` and `reviewCommentMode` writes are inside this conditional. They are never applied for manual drafts.

The original intent of this design — stated in the comment above the block — was to preserve direct register edits made while a draft is in progress. For Category B fields (name, riskIdPrefix, etc.) this is the correct intent: an admin who renames the register while a draft is open should not have the rename reverted when the draft publishes. But `reviewCommentMode` and `reviewAttestationText` are not in the same category. They have a draft-mode UI path (`updateDraftReviewFieldsMutation`) and a frontend guard that suppresses the direct `PATCH` path in draft mode. The live register is not updated for these fields while a draft is open. The only path for changing them while a draft exists is through the draft. Publishing the draft must therefore apply them — but the conditional prevents this for manual drafts.

The result: an admin in draft mode changes `reviewCommentMode` from OPTIONAL to MANDATORY via the form. The snapshot is updated. The frontend guard (`handleFormBlur` with `if (!draftConfigMode && ...)`) prevents the direct `PATCH` from firing. The admin publishes. `publishDraft` skips the conditional for manual drafts. The live `Register.reviewCommentMode` remains OPTIONAL. The admin sees no error. The change was silently lost.

This is the v1.27.0 regression and the root cause is the over-broad scope of the `sourceTemplateVersionId` conditional.

### Template change notification

There is a partial mechanism today. The `getRegister` response includes `linkedTemplate.isLatest` (a boolean), `linkedTemplate.latestPublishedVersionNumber`, and `linkedTemplate.linkedVersionNumber`. The UI has enough information to detect that the template has been updated and surface a prompt to the register admin.

What does not exist:

1. **Active notification.** There is no push notification, email, or in-app alert sent to register admins when a template they are linked to is updated. The admin must visit the register settings screen to discover the drift.

2. **Per-register staleness enumeration.** There is no API endpoint that returns "all registers that are linked to template X and are behind version Y". The platform maintainer who publishes a new template version cannot currently discover which registers are affected without querying the database directly.

3. **Blocking behaviour.** There is no mechanism that prevents a linked register from being published while behind the template. Whether to block or warn is a product decision that has never been made.

Building active notification would require:

- A service that, when a new template version is published, queries all `Register` rows where `linkedTemplateVersionId` refers to any prior version of that template (`linkedTemplateVersion.templateId = X` and `linkedTemplateVersion.versionNumber < new version`).
- A notification delivery mechanism (the platform currently has no in-app notification system and no email dispatch infrastructure). This would be a significant new capability, not a targeted fix.
- Alternatively, a lightweight polling approach: the register list/detail query already returns `isLatest`, so the UI already has the data to surface a banner on the settings screen. This is the least-effort path and is already architecturally supported.

### The correct unified model

Given what the template system is intended to do, the correct model is:

**Principle:** the `sourceTemplateVersionId` conditional in `publishDraft` should govern only the fields for which the intent is "adopt the template's value at publish time" — i.e., Category B fields that are correctly immediate-effect for manual drafts. Fields that have a draft-mode UI path and a frontend guard suppressing the direct path must always be applied on publish, regardless of draft origin. These fields are Category A by design; the conditional misclassifies them.

**What should be in the snapshot always (no change from current):** all fields currently in `ConfigSnapshotRegisterSettings` should remain in the snapshot for historical record and template-propagation purposes. The snapshot is the source of truth for what the configuration looked like at a point in time.

**What the publish flow should write back regardless of template origin:**
- `scoringFormula` — already correct.
- `responseActionMode` — already correct (with the undefined-check guard for legacy snapshots).
- `reviewCommentMode` — must be moved outside the `sourceTemplateVersionId` conditional.
- `reviewAttestationText` — must be moved outside the `sourceTemplateVersionId` conditional.

**What should remain inside the `sourceTemplateVersionId` conditional (template-origin only):**
- `name` — register names must not be overwritten on manual draft publish.
- `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition` — all correctly inside the conditional. These are immediate-effect for manual-draft registers and should only be overwritten when the register is adopting a template's settings.
- `linkedTemplateVersionId` — correctly inside the conditional. It should only advance when a template-origin draft is published.

**What should remain immediate-effect (Category B — no change from current):** all of the same fields listed in the field-by-field analysis. None of them warrant draft treatment.

**Locks on linked registers:** no locks should be introduced. The existing design — link is informational, deviations are allowed, admin chooses when to adopt template updates — is correct. Locking fields on linked registers would make the system significantly more complex and would contradict the stated intent (admins may deviate from the template deliberately).

**Template change discovery (the gap):** the existing `isLatest` field returned by the register query is the correct foundation. The UI should surface a visible, persistent banner on the settings screen when `linkedTemplate.isLatest === false`, prompting the admin to review and apply the template update. No backend changes are needed for this — only a frontend UI addition. Active push notification is out of scope until an in-app notification infrastructure exists.

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

**Finding 7: The `sourceTemplateVersionId` publish conditional correctly gates some fields but incorrectly gates others.**
The conditional is the right mechanism for protecting fields that an admin may have intentionally customised away from the template — `name`, `riskIdPrefix`, `reviewsEnabled`, etc. It is the wrong gate for `reviewCommentMode` and `reviewAttestationText`, which have no direct-edit path in draft mode. For those two fields, the draft is the only edit path. The conditional creates a dead zone: no write reaches the `Register` row for these fields during manual draft workflows.

**Finding 8: `createRegisterFromTemplate` silently ignores `reviewCommentMode`, `scoringFormula`, and `responseActionMode`.**
The `tx.register.create` call in `createRegisterFromTemplate` (`registers.service.ts`, lines 700–718) omits these three fields. Any register created from a template that encodes non-default values for these fields silently starts with wrong values (`OPTIONAL`, `""`, `SIMPLE`). This is a data fidelity bug present since template support was introduced.

**Finding 9: `compareRegisterToTemplate` omits `reviewCommentMode`, `scoringFormula`, and `responseActionMode` from its comparison.**
The `registerSettingsKeys` array in `compareRegisterToTemplate` (`template.service.ts`, lines 342–353) covers only ten fields. A template update that only modifies these three fields will show no differences in the Compare modal, even though the register is genuinely out of sync on those fields. The orange badge will appear (version numbers differ) but the diff will say "no differences". This is actively misleading.

**Finding 10: Template drift discovery is passive and limited to the configuration screen.**
The `getRegister` response already includes `linkedTemplate.isLatest`. The orange badge in `TemplateLinkPanel` is the only surface that uses this data. Admins who work primarily in the risks list have no visibility into template drift. No active notification mechanism exists.

---

## Recommendations

### Recommendation 1 [Fix]: Promote `reviewCommentMode` and `reviewAttestationText` unconditionally on publish

Move `reviewCommentMode` and `reviewAttestationText` out of the `sourceTemplateVersionId` conditional block in `publishDraft` (`backend/src/services/configVersion.publish.service.ts`) and into the always-apply block alongside `scoringFormula`. The pattern is identical: read the field from `snapshot.register`, write it to the `Register` row unconditionally.

This is the direct fix for the v1.27.0 regression and the root cause identified above. No schema change, no data migration, no frontend change required.

**Backlog item:** "Fix: always promote `reviewCommentMode` and `reviewAttestationText` from snapshot on publish (manual drafts)."

### Recommendation 2 [Fix]: Clarify the conditional's intent in code comments

The comment above the `sourceTemplateVersionId` conditional currently reads: "Register settings are only applied from the snapshot when the draft originated from a template." After Recommendation 1 is applied, this comment is misleading — two settings are now always applied. Update the comment to state precisely which fields are inside and why:

- Fields inside the conditional: immediate-effect fields that should only be overwritten when the register is adopting a template's values. An admin's direct edits to these fields while a draft is open must not be lost on publish.
- Fields outside the conditional (always-apply): fields that have a draft-mode UI path and a frontend guard that suppresses the direct `PATCH` path in draft mode. The only way to change them while a draft exists is through the draft; the publish must apply them.

This is a one-line code comment change, not a structural change.

**Backlog item:** "Fix: update comment above sourceTemplateVersionId conditional in publishDraft to reflect the correct two-class distinction."

### Recommendation 3 [Fix]: Remove the dual-path for `reviewCommentMode` and `reviewAttestationText` in the frontend

Once Recommendation 1 is implemented, the `PATCH /registers/:registerId` path for these two fields is redundant in draft mode. The `handleFormBlur` guard already suppresses it, but the mutation payload still includes both fields. Remove them from the direct-register save path when `draftConfigMode` is true, or restructure the mutation to exclude them unconditionally (the `updateDraftReviewFieldsMutation` path covers them in draft mode, the `updateSettingsMutation` path covers them outside draft mode). This eliminates one surface where a future developer could accidentally reintroduce the divergence bug.

This change belongs to the frontend-developer.

**Backlog item:** "Simplify: remove `reviewCommentMode`/`reviewAttestationText` from the direct-register save path in draft mode."

### Recommendation 3b [Fix]: Add `reviewCommentMode`, `scoringFormula`, and `responseActionMode` to `createRegisterFromTemplate`

The `tx.register.create` call in `createRegisterFromTemplate` (`backend/src/services/registers.service.ts`, lines 700–718) does not write `reviewCommentMode`, `scoringFormula`, or `responseActionMode`. These fields default to `OPTIONAL`, `""`, and `SIMPLE` on the new row, regardless of what the template snapshot specifies. Add all three, reading from `regSettings` as the other fields do.

No schema change, no migration required.

**Backlog item:** "Fix: `createRegisterFromTemplate` silently ignores `reviewCommentMode`, `scoringFormula`, and `responseActionMode` from template snapshot — new registers start with wrong defaults."

### Recommendation 3c [Fix]: Add `reviewCommentMode`, `scoringFormula`, and `responseActionMode` to `compareRegisterToTemplate`

Add the three fields to the `registerSettingsKeys` array in `compareRegisterToTemplate` (`backend/src/services/template.service.ts`, line 342). Without this change, a template update that only modifies these fields produces a misleading "no differences" result in the Compare modal, even though the register is out of sync.

**Backlog item:** "Fix: template Compare modal reports no differences when only `reviewCommentMode`, `scoringFormula`, or `responseActionMode` differ between register and template."

### Recommendation 4 [Design decision needed]: Define what happens to a linked register's `linkedTemplateVersionId` when a manual draft is published

Currently, `linkedTemplateVersionId` is only updated when a template-origin draft is published. If a linked register creates a manual draft and publishes it, the register remains linked to the same template version. This is the existing behaviour and is not wrong, but it has not been stated as a deliberate policy.

The product owner must decide: when a linked register publishes a manual draft (one the admin created themselves, not via "apply template update"), should the register remain linked at the same template version, or should it be unlinked automatically (on the basis that the admin has intentionally diverged)? The current behaviour is "remain linked at the same version". This is reasonable — the admin may have made a minor manual change and still want to be notified about future template updates. But it should be a documented decision.

**Backlog item:** "Design decision: define policy for linkedTemplateVersionId when a linked register publishes a manual draft."

### Recommendation 5 [Fix]: Surface a template-drift banner in the settings UI

The backend already returns `linkedTemplate.isLatest` on the register response. The frontend does not currently render a visible, persistent indicator when `isLatest === false`. The settings screen should show a banner or callout when the linked template has a newer published version, with a direct action to apply the template update. No backend change is needed — the data is already returned.

This change belongs to the frontend-developer.

**Backlog item:** "Feature: surface template-drift warning banner on register settings screen when linkedTemplate.isLatest is false."

### Recommendation 6 [Fix]: Codify the two-class publish model in a developer-facing checklist

Update `docs/architecture/register-config-draft-system.md` to make the two-class distinction explicit and operational: any new field added to `ConfigSnapshotRegisterSettings` must be classified at the time of the PR. The classification rule is:

- If the field has a draft-mode UI path (a mutation that updates the snapshot while a draft is active) and the frontend guard suppresses the direct `PATCH` in draft mode — it is always-promote on publish.
- If the field is edited via `PATCH /registers/:registerId` regardless of draft mode — it belongs inside the `sourceTemplateVersionId` conditional.

Add this rule to the architecture document and reference it from the PR template.

**Backlog item:** "Process: add register settings classification rule to architecture doc and PR template."

### Recommendation 7 [Standing decision]: Do NOT unify all settings through the draft system

Full unification — routing all register settings through the draft and applying them only on publish — is not recommended. The fields correctly identified as immediate-effect (`name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`) carry no semantic coupling to the matrix or formula configuration. Requiring a draft for every settings change would impose draft-creation friction on routine operations such as renaming a register, toggling viewer export, or adjusting the review frequency. The value of the draft system is in co-ordinating changes that have data consequences (matrix, formula, field deactivation). These fields do not.

**Backlog item:** None required. Record as a closed decision.

---

### Recommendation 7 — Reopened: Full Draft Unification Review

**Trigger:** The product owner challenged the "closed decision" classification above. The original analysis was grounded in the criterion of data-safety coupling (whether a field change can produce an inconsistent or migrated data state). The counter-argument is that the draft system's design intent is UX atomicity — all your changes, then publish everything together — and that many Category B fields affect the live UI in ways that can be jarring or disorienting to users who are actively working in the register when the change fires.

**Revised criterion applied below:** A field should remain immediate-effect ONLY if changing it mid-session could not plausibly cause a jarring or confusing experience for any active user of that register. If it could — even occasionally — it belongs in the draft system.

---

#### Field-by-field re-analysis under the revised criterion

**`name`**

- Current behaviour: immediate-effect via `PATCH /registers/:registerId`. The new name appears in the page title, breadcrumb, and register list the moment a user tabs out of the field.
- Mid-session jarring risk: low. No user working in the risks list sees a register name change that surprises them. The name is a heading, not an operational data point. A user mid-editing a risk does not see the register name at all on that surface. The register list does not auto-refresh unless the user navigates away and back.
- Verdict: **keep immediate-effect.** A register rename is an administrative act. The admin performing it is the only user actively on the settings screen. Other users will see the new name on their next navigation. No jarring experience.

**`description`**

- Current behaviour: immediate-effect via `PATCH`. Description is shown only on the settings screen itself, not in any risk-facing surface.
- Mid-session jarring risk: none. No user working with risks ever sees the description change under their feet.
- Verdict: **keep immediate-effect.** No user-visible impact beyond the settings screen.

**`riskIdPrefix`**

- Current behaviour: immediate-effect via `PATCH`. The prefix is baked into `displayRiskId` at risk-creation time. Changing the prefix does not retroactively recalculate existing `displayRiskId` values — existing risks keep their existing IDs.
- Mid-session jarring risk: low for existing risks (their IDs are unchanged). For the admin making the change, the settings form updates immediately. Any user currently viewing a risk list sees no change — their existing `displayRiskId` values are fixed. The only visible effect is that the next risk created gets the new prefix.
- Counterpoint: the product owner cited this as a specific jarring example ("changing the Risk ID prefix while a user is mid-editing a risk would change the displayed risk ID under their feet"). This is factually incorrect in the current implementation: the prefix change does not alter any existing `displayRiskId`. There is no risk that a user mid-editing a risk sees its ID change.
- Verdict: **keep immediate-effect.** The concern is based on a misunderstanding of what the field does. Existing IDs are immutable once set; only new risks inherit the updated prefix.

**`riskIdZeroPaddingEnabled`**

- Current behaviour: immediate-effect via `PATCH`. Like `riskIdPrefix`, zero-padding only affects the generation of new `displayRiskId` values; existing ones are unchanged.
- Mid-session jarring risk: none for existing risks. Same reasoning as `riskIdPrefix`.
- Verdict: **keep immediate-effect.** Same rationale.

**`riskIdZeroPaddingWidth`**

- Current behaviour: immediate-effect via `PATCH`. Same as above.
- Mid-session jarring risk: none for existing risks.
- Verdict: **keep immediate-effect.** Same rationale.

**`defaultNewRiskState`**

- Current behaviour: immediate-effect via `PATCH`. This field is read in `RiskFormModal.tsx` at line 498 via the `formConfig.register.defaultNewRiskState` path — the value comes from the config snapshot, not the live register. The config snapshot is invalidated on register save. A user who has the "New Risk" modal open at the exact moment the setting changes would use the cached value; the next time they open the modal, the new default applies.
- Mid-session jarring risk: very low. The default state only pre-fills the state selector in the new risk form. A user mid-editing a new risk would not see their pre-filled state change. The change only affects the next time the modal is opened.
- Verdict: **keep immediate-effect.** The impact is the default for the next new risk. No current user action is disrupted.

**`reviewsEnabled`**

- Current behaviour: immediate-effect via `PATCH`. This field is read in real time in `RiskRegisterPanel.tsx` (lines 267, 284, 436, 485) to control: (a) whether the "Review" button appears per risk row, (b) whether the review action can be opened from URL params, (c) whether the review panel is available in `RiskDetailModal`. It is also read in `RiskDetailModal.tsx` (line 209) to conditionally include review-related items in the detail view.
- Mid-session jarring risk: **yes, genuine and significant**. If an admin disables reviews while a user is on the risk register page: the "Review" button disappears from every row instantly on the next re-render triggered by any query invalidation. If a user has the URL `?action=review&riskId=X` open, the code at line 267 will silently skip opening the review modal. If a user has the `RiskDetailModal` open and the register query re-fetches (which happens on any background refetch interval), the review section may disappear or reorder. A user who was mid-navigating to open a review modal could find the button gone. This is a real jarring experience, not a theoretical one.
- Verdict: **move to draft.** Toggling review availability is a significant workflow change. A user actively working with the review workflow who sees the "Review" buttons vanish mid-session has a confusing, broken-feeling experience. This field belongs in the draft system for the same reason `responseActionMode` does: it changes a visible workflow capability, not just a data attribute.

**`defaultReviewFrequencyMonths`**

- Current behaviour: immediate-effect via `PATCH`. This field is not read anywhere in the risk-facing UI. It is used server-side when a review is submitted: it becomes the basis for calculating `nextReviewDate` on the risk. The UI does not display this value anywhere on the risks or review surfaces.
- Mid-session jarring risk: none visible. A user in the middle of submitting a review will not see anything change in the UI. The effect is that the calculated next review date will differ from what it would have been under the old frequency — but this is a background calculation, not something the user sees change under their feet.
- Verdict: **keep immediate-effect.** No visible mid-session UX impact.

**`allowViewerExport`**

- Current behaviour: immediate-effect via `PATCH`. Read in `RiskRegisterPanel.tsx` at line 131 to compute `canExport`, which controls whether the export button is shown.
- Mid-session jarring risk: low-to-moderate. If a Register Viewer is on the risk register page and an admin revokes export permission, the export button will disappear on the next background query refetch. The Viewer may be puzzled. However: this is an administrative permission change — exactly the kind of change that should take effect immediately. Access changes that require a draft would mean viewers retain access for an unknown period until an admin completes and publishes a draft.
- Counter-consideration: immediate revocation of a permission is exactly what administrators need when they want to restrict access. Deferring this to draft-and-publish would be an anti-pattern for permissions. The "jarring" experience here is a deliberate consequence of the revocation, not an accidental side effect.
- Verdict: **keep immediate-effect.** Permission revocations must take effect immediately. Draft treatment would create a time window of unintended access. The jarring UX (export button disappears) is intentional and correct.

**`customFieldValidationEnabled`**

- Current behaviour: immediate-effect via `PATCH`. Read in `RiskRegisterPanel.tsx` at line 145 via `register.customFieldValidationEnabled` to control whether validation enforcement is active. This affects the WARN/BLOCK behaviour on custom field saves.
- Mid-session jarring risk: moderate. If a user is actively editing a risk and saving custom field values when an admin toggles validation on, a field that previously saved with WARN (no block) may now block the save. More significantly, if validation is toggled off mid-edit, a user might bypass validation checks they were presented with a moment earlier. Neither is deeply jarring — there is no visible UI change — but the save behaviour shifts.
- However, validation enforcement is driven from the live register value on the backend at save time, not from a client-cached value. The UI reads it for the WARN/BLOCK UI rendering. The actual enforcement happens server-side on risk save.
- Verdict: **keep immediate-effect.** The mid-session effect is a change in save-time enforcement behaviour, not a visible UI disruption. The shift is not jarring in the sense of disappearing buttons or changed displays. A user actively saving risks sees consistent behaviour within a single save cycle. The next save reflects the new setting.

**`reviewStatusPosition`**

- Current behaviour: immediate-effect via `PATCH` triggered from `FieldConfigTab.tsx` (line 139), not `RegisterSettingsTab`. This controls the column ordering in the custom fields table.
- Mid-session jarring risk: low. Only affects column ordering in the configuration screen (admin-only view). Not visible to risk editors or viewers working in the risks list.
- Verdict: **keep immediate-effect.** Admin-only configuration detail with no risk-facing impact.

---

#### Summary table under revised criterion

| Field | Visible in risk-facing UI | Mid-session jarring risk | Revised verdict |
|---|---|---|---|
| `name` | No (heading only) | Low — admin only on settings screen | Keep immediate-effect |
| `description` | No | None | Keep immediate-effect |
| `riskIdPrefix` | No retroactive effect | None (existing IDs unchanged) | Keep immediate-effect |
| `riskIdZeroPaddingEnabled` | No retroactive effect | None (existing IDs unchanged) | Keep immediate-effect |
| `riskIdZeroPaddingWidth` | No retroactive effect | None (existing IDs unchanged) | Keep immediate-effect |
| `defaultNewRiskState` | Affects new risk modal default only | Very low | Keep immediate-effect |
| `reviewsEnabled` | Yes — "Review" button per row, modal sections | **Yes — buttons disappear mid-session** | **Move to draft** |
| `defaultReviewFrequencyMonths` | No — server-side calculation only | None visible | Keep immediate-effect |
| `allowViewerExport` | Yes — export button for Viewers | Low-to-moderate, but intentional | Keep immediate-effect (permission) |
| `customFieldValidationEnabled` | Indirectly (WARN/BLOCK UI) | Low | Keep immediate-effect |
| `reviewStatusPosition` | Admin config only | None | Keep immediate-effect |

---

#### Revised overall recommendation

After applying the revised criterion honestly, the answer is more nuanced than the original standing decision suggested, but it does not endorse full unification.

**Finding on `reviewsEnabled`:** This is the only Category B field that fails the revised criterion clearly. Toggling review availability is not a cosmetic or administrative setting — it removes or adds visible, interactive workflow controls (the "Review" button) from a live operational view used by risk owners and managers. An admin disabling reviews while users are active in the register produces a mid-session disappearance of controls. This is the same class of experience as `responseActionMode` (which is already Category A). The field should move to draft treatment.

Moving `reviewsEnabled` to draft treatment requires:

- Backend: add `reviewsEnabled` to the always-promote block in `publishDraft` (alongside `scoringFormula`, `responseActionMode`, `reviewCommentMode`, `reviewAttestationText`).
- Frontend: wire `reviewsEnabled` to `updateDraftConfig` in draft mode (analogous to `responseActionMode`'s `updateDraftResponseActionModeMutation`). Apply the `settingsLocked` guard to prevent editing when no draft exists.
- The frontend `handleFormBlur` path already skips firing in draft mode. The gap is only on the draft-write and publish-promote side.
- No data migration required.

**Finding on the remaining fields:** The other ten fields survive the revised criterion. The original analysis was correct for them. The key empirical point that the product owner's argument misses: the `riskId*` fields do not retroactively change displayed risk IDs. Existing `displayRiskId` values are stamped at creation time and never change. The only effect of changing the prefix or padding is on the next risk created. This is not a mid-session jarring experience.

**On the UX consistency argument:** The product owner's argument — "draft is the contract for safe to change" — is compelling as a design philosophy but proves too much if applied universally. A register rename, a description edit, a review frequency adjustment: requiring a draft for these would make the configuration screen feel bureaucratic for genuinely simple, safe operations. The draft system's value is specifically in co-ordinating changes that have observable consequences for users actively working in the register. Only `reviewsEnabled` clears that bar among the Category B fields.

**On the friction argument:** The draft workflow adds meaningful friction. Creating a draft, staging changes, running impact analysis, then publishing is the right path for matrix restructuring, formula changes, and workflow mode switches. It is excessive for "the register is named slightly wrong" or "the review frequency should be 6 months instead of 12". The two-tier model — immediate-effect for administrative settings, draft for workflow capability changes — is the correct design.

**On the middle path:** The product owner asked whether a middle path exists (e.g. "lightweight save without impact analysis" or "register-level lock while a draft is active"). The current architecture already implements a middle path implicitly: the `settingsLocked` guard prevents editing any field when no draft exists (in draft mode), and the draft system handles the co-ordinated fields. Moving `reviewsEnabled` to the draft tier extends this existing middle path correctly without inventing a new mechanism.

**Revised standing decision:** Do not pursue full Category B unification. Move `reviewsEnabled` to the draft/always-promote tier. Keep all other Category B fields immediate-effect. Record this as a deliberate classification, not an artefact.

**Backlog item:** "Fix: move `reviewsEnabled` to draft treatment (always-promote on publish, draft-path mutation in frontend, consistent with `responseActionMode` pattern)."

### Recommendation 8 [Future]: Active template-update notification infrastructure

The current discovery mechanism (polling via `linkedTemplate.isLatest` on the settings screen) is the correct minimum viable approach. Active notification — sending a push or email when a template the register is linked to is updated — requires an in-app notification system that does not yet exist. Do not build this until a notification infrastructure is in place. When it is built, the backend hook is clear: when `publishTemplateVersion` succeeds, query all `Register` rows with `linkedTemplateVersionId` pointing to a prior version of that template and emit a notification to each register's management-role members.

**Backlog item:** "Future: active notification to register admins when linked template version advances."

### Recommendation 9 [Future]: Evaluate always-promote for `reviewsEnabled` and `defaultReviewFrequencyMonths`

These fields are semantically close to `reviewCommentMode` — they govern review behaviour observable by risk owners. They are currently immediate-effect and there is no practical problem with that. If review-related impact analysis is ever introduced (e.g., warning that changing review frequency will affect overdue calculations), these fields should be moved to always-promote at that point. No action now.

**Backlog item:** "Future: extend always-promote to `reviewsEnabled` / `defaultReviewFrequencyMonths` if review impact analysis is introduced."

---

## Summary

Category B is an unintentional artefact, not a design decision. For the vast majority of fields it produces the correct outcome: immediate-effect changes that require no draft. The template system analysis surfaces three additional correctness gaps beyond the original question.

**The core problem** — `reviewCommentMode` and `reviewAttestationText` — stems from the `sourceTemplateVersionId` conditional in `publishDraft`. That conditional was correct for the original design (all register settings were immediate-effect; the conditional existed to adopt template values at publish). As those two fields gained draft-mode UI paths with frontend guards suppressing the direct `PATCH`, they moved into a dead zone: no direct write happens in draft mode, and no publish promotion happens for manual drafts. The fix is targeted: move them out of the conditional in one service file.

**Three additional template gaps** were identified during this analysis:

1. `createRegisterFromTemplate` does not apply `reviewCommentMode`, `scoringFormula`, or `responseActionMode` from the template snapshot. Registers created from templates start with wrong defaults for these fields.

2. `compareRegisterToTemplate` omits the same three fields from its comparison key set. A template update that only changes these fields produces a misleading "no differences" in the Compare modal.

3. The `TemplateLinkPanel` orange badge is the only place template drift is surfaced. Admins who work primarily outside the configuration screen will never see it.

The correct unified model is:

- **Always-promote on publish** (regardless of draft origin): `scoringFormula`, `responseActionMode`, `reviewCommentMode`, `reviewAttestationText`. These fields have draft-mode UI paths; the direct register path is suppressed in draft mode; publish must apply them.
- **Template-origin only** (inside the `sourceTemplateVersionId` conditional): all immediate-effect fields. Direct edits made while a manual draft is open should survive publish.
- **No locks on linked registers**: the template link is informational. Admins may deviate freely. The link advances only when a template-origin draft is published.
- **Template drift discovery**: `linkedTemplate.isLatest` is already returned by the backend. The missing piece is a more prominent UI surface — no backend changes required.

Items 1, 3b, and 3c above are the immediate fix backlog items. Item 6 (classification rule in docs and PR template) is the process change that prevents recurrence.
