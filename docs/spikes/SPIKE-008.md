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

The template system has two distinct mechanisms that are frequently conflated.

**`Register.linkedTemplateVersionId`** — a nullable FK to `RegisterTemplateVersion`. This is a tracking reference. It records which template version this register was most recently aligned to. It does not gate any write operations. Nothing in the backend reads `linkedTemplateVersionId` to enforce any constraint on edits or on what a draft can contain. It is purely informational: the UI reads it to show the `TemplateLinkPanel`, which exposes "Compare", "Apply latest", and "Unlink" actions. A register can be linked to a template while its admin makes arbitrary manual edits to the config — the system does not prevent this.

**`RegisterConfigVersion.sourceTemplateVersionId`** — a nullable FK on the `RegisterConfigVersion` row (i.e., on a specific draft). This is set when a draft is created via `applyTemplateUpdateToDraft` (in `template.service.ts`, line 508). It is NOT set when a manual draft is created via `createDraft`. It is this flag — not `linkedTemplateVersionId` — that changes publish behaviour.

The two flags serve different purposes and are independently nullable. A register with `linkedTemplateVersionId` set may have `draftConfigVersionId` pointing to a draft with `sourceTemplateVersionId = null` (if the admin manually created the draft rather than using "Apply latest"). Conversely, `sourceTemplateVersionId` on a draft does not require the register to currently be linked to any template.

### The template update workflow

When a system admin publishes a new version of a template (via `publishTemplateVersion` in `template.service.ts`), nothing automatic happens to linked registers. There is no notification and no enforcement. The admin of a linked register sees a visual indicator in `TemplateLinkPanel` — an orange badge reading "v2 — latest is v3" — and a button labelled "Apply latest (v3)".

Clicking "Apply latest" calls `applyTemplateUpdateToDraft` (`template.service.ts` line 436), which:
1. Validates that no draft already exists (returns 409 if one does).
2. Takes the template's snapshot wholesale, overwriting only `register.name` with the register's actual name.
3. Creates a `RegisterConfigVersion` row with `status = DRAFT` and `sourceTemplateVersionId` set to the template version's ID.
4. Updates `Register.draftConfigVersionId` to point to the new draft.

The admin then uses the standard draft workflow (edit, impact analysis, publish) to review and publish the template changes. At publish time, `draft.sourceTemplateVersionId` being set triggers the full Category A promotion path in `publishDraft`, writing all register settings from the snapshot back to the `Register` row.

### What is locked/unlocked when a register is linked to a template

**Answer: nothing is locked in either the backend or the frontend on the basis of template linkage alone.**

The backend `PATCH /registers/:registerId` handler has no check for `linkedTemplateVersionId`. Any admin can call it at any time regardless of template linkage status. The frontend `RegisterSettingsTab` applies `settingsLocked` based on `draftConfigMode && !hasDraft` — not on template linkage. The `TemplateLinkPanel` is rendered alongside the `ConfigVersionBanner` and settings form as a purely informational widget; it does not disable any form controls.

A linked register admin can freely edit the register name, description, review frequency, and all other direct-register fields at any time, linked or not. There is no enforcement of "template compliance". This is consistent with the intended design as stated in the product brief: admins may deviate from the template, and the template linkage is advisory.

### The `sourceTemplateVersionId` publish conditional: is it correct?

The current publish logic in `publishDraft` (lines 699–731) applies the full set of register settings from the snapshot — including `reviewCommentMode`, `reviewAttestationText`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`, `name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState` — only when `draft.sourceTemplateVersionId` is set. For manual drafts, only `scoringFormula` and (conditionally) `responseActionMode` are promoted.

The rationale stated in the code comment — "direct edits to the register made while the draft was in progress take precedence and must not be overwritten" — was correct for the original design: in the original system, all register settings were immediate-effect and the draft was only for matrix/field changes. Register settings in the snapshot were there for historical record and for the template-origin path.

However, as `reviewCommentMode` and `reviewAttestationText` were added to the snapshot AND given draft-mode UI paths (where the frontend writes them via `updateDraftConfig` and suppresses the direct `updateRegister` path via the `onBlur` guard), this rationale broke down. For these two fields specifically:

- In draft mode, the admin edits them via `updateDraftConfig`. The snapshot is updated.
- The `onBlur` guard (`if (!draftConfigMode && ...)`) suppresses the `updateRegister` path.
- On publish, the snapshot value is NOT written to the `Register` row (template-origin conditional).
- The live `Register` row retains the value it had before the draft began.

The result is that for `reviewCommentMode` and `reviewAttestationText`, the draft path is currently a dead-end for manual drafts. The admin appears to have staged the change, but it is silently discarded at publish. This is the root cause identified in v1.27.0.

**The distinction is not correct as currently applied.** The `sourceTemplateVersionId` conditional is the right gate for fields that should only be overwritten when explicitly adopting a template (name, description, ID prefix settings, defaultNewRiskState — fields where an admin might have intentionally diverged from the template and expects that divergence to survive a manual draft cycle). It is the wrong gate for fields that have an active draft-mode edit path, because those fields are already being written via the draft in draft mode and are NOT being written via direct PATCH.

### Fields missing from `createRegisterFromTemplate` and `compareRegisterToTemplate`

**`createRegisterFromTemplate`** (`registers.service.ts`, lines 700–718) creates the initial `Register` row from the template snapshot but does not apply `reviewCommentMode`, `scoringFormula`, or `responseActionMode`. These fields are left at their column defaults (`OPTIONAL`, `""`, `SIMPLE`). A register created from a template that specifies `reviewCommentMode: "MANDATORY"` or a non-empty `scoringFormula` will silently ignore those template values. This is a data fidelity bug.

**`compareRegisterToTemplate`** (`template.service.ts`, lines 342–353) only compares these keys: `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `reviewAttestationText`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`. It omits `reviewCommentMode`, `scoringFormula`, and `responseActionMode`. This means if a template changes any of these three fields, the comparison will not detect the difference, the orange "out of date" badge may not appear even when the register has diverged on those fields, and the "Apply latest" workflow will not surface the change.

### Template change notification mechanism

There is no push notification. The mechanism is pull-based: when the admin visits the configuration settings screen of a linked register, the `getRegister` response includes `linkedTemplate.isLatest` (a boolean computed by comparing `linkedTemplateVersion.versionNumber` to the latest published template version). The UI shows an orange badge when `!isLatest`. There is no email notification, no in-app notification to the register admin, and no API endpoint to query "which registers are out of sync with their templates". A register admin who never visits the configuration screen will never see the update indicator.

---

## Template System Interplay

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

### Recommendation 8 [Future]: Active template-update notification infrastructure

The current discovery mechanism (polling via `linkedTemplate.isLatest` on the settings screen) is the correct minimum viable approach. Active notification — sending a push or email when a template the register is linked to is updated — requires an in-app notification system that does not yet exist. Do not build this until a notification infrastructure is in place. When it is built, the backend hook is clear: when `publishTemplateVersion` succeeds, query all `Register` rows with `linkedTemplateVersionId` pointing to a prior version of that template and emit a notification to each register's management-role members.

**Backlog item:** "Future: active notification to register admins when linked template version advances."

### Recommendation 9 [Future]: Evaluate always-promote for `reviewsEnabled` and `defaultReviewFrequencyMonths`

These fields are semantically close to `reviewCommentMode` — they govern review behaviour observable by risk owners. They are currently immediate-effect and there is no practical problem with that. If review-related impact analysis is ever introduced (e.g., warning that changing review frequency will affect overdue calculations), these fields should be moved to always-promote at that point. No action now.

**Backlog item:** "Future: extend always-promote to `reviewsEnabled` / `defaultReviewFrequencyMonths` if review impact analysis is introduced."

---

## Summary

Category B is an unintentional artefact, not a design decision. For the vast majority of fields it produces the correct outcome: immediate-effect changes that require no draft. The specific problem identified by the product owner is real and the template system confirms its root cause.

The `sourceTemplateVersionId` conditional in `publishDraft` was written to serve template-origin drafts: adopt the template's register settings wholesale on publish, and advance `linkedTemplateVersionId` to record the sync point. For manual drafts, the conditional was left empty — the rationale being that direct edits made while the draft was open should not be overwritten. This rationale is sound for immediate-effect fields (name, riskIdPrefix, etc.) but was incorrectly applied to `reviewCommentMode` and `reviewAttestationText`, which have no direct-edit path in draft mode. For those two fields, the draft is the only edit path. Publishing without applying them was a silent bug, not a deliberate protection.

The correct unified model is:

- **Always-promote on publish** (regardless of draft origin): `scoringFormula`, `responseActionMode`, `reviewCommentMode`, `reviewAttestationText`. These fields have draft-mode UI paths; the direct register path is suppressed in draft mode; the publish must apply them.
- **Template-origin only** (inside the `sourceTemplateVersionId` conditional): all immediate-effect fields. Direct edits made while a draft is open should not be overwritten.
- **Immediate-effect, no draft involvement**: the same fields, edited via `PATCH /registers/:registerId` in both draft and non-draft modes.
- **No locks on linked registers**: the template link is informational. Admins may deviate freely. The link advances only when a template-origin draft is published.
- **Template drift discovery**: `linkedTemplate.isLatest` is already returned by the backend. The missing piece is a UI banner on the settings screen — no backend work needed.

The fix is targeted: move two fields out of a conditional block in one service file. No schema changes, no data migration, no new infrastructure.
