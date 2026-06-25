# SPIKE-008: Register Configuration Draft System — Architectural Review (Revised)

**Status:** Complete
**Date:** 2026-06-25
**Author:** Principal Architect

---

## Context

The register configuration draft system allows admins to stage changes before applying them atomically via a publish transaction. The product owner identified that register settings fall into two implicit categories — fields that travel through the draft and are applied on publish (Category A), and fields that are written directly to the `Register` row and take effect immediately (Category B) — and challenged whether this split is justified. This document revises an earlier analysis that was grounded in a false premise.

---

## How the Draft System Works

A draft is a `RegisterConfigVersion` record whose `snapshotJson` captures the full configuration state at the moment the draft was created: the risk matrix, custom fields, likelihood/impact values, scoring formula, and register settings. Admins edit the snapshot in place while the draft is active. When satisfied, they publish the draft, which atomically applies the staged configuration to the live register — recalculating risk scores, running any required data migrations, and advancing the config version. If they discard the draft, no changes are applied. There is no Save button on the configuration screen; the only commit point is Publish.

---

## How the Two-Category Problem Arose

Category B was not a deliberate architectural decision. The original publish implementation included a comment — still present today — explaining that for manually-created drafts, "direct edits to the register made while the draft was in progress take precedence and must not be overwritten." The entire `Register` settings block in `publishDraft` was wrapped in a conditional that only applies when the draft originated from a template (`sourceTemplateVersionId` is set).

Every field added subsequently inherited this behaviour by default. Some developers noticed that their specific field needed always-promotion and added a special case (`scoringFormula`, `responseActionMode`, `reviewCommentMode`). Others did not. The result is an undocumented, inconsistent split that caused the v1.27.0 regression: `reviewCommentMode` was correctly added to the draft-mode UI path and correctly blocked from the direct-write path in draft mode, but was never promoted on publish for manual drafts. The draft-mode change was silently lost.

The split also creates a persistent footgun: any developer adding a new field to `ConfigSnapshotRegisterSettings` must discover the undocumented categorisation rule, understand which bucket their field belongs in, and add the correct special-case promotion or not. This has failed at least twice.

---

## The "No Save Button" Insight

The earlier analysis argued that requiring a draft to change fields like `name` or `reviewsEnabled` would impose friction because admins are "used to immediate saves" on those fields. This premise is wrong.

There is no Save button on the register configuration screen. The admin's mental model for the entire screen is already: stage your changes, then publish. There is no immediate-save path that users rely on or expect. An admin who renames a register while a draft is open and then publishes the draft is not experiencing additional friction — they are doing exactly what the screen's design asks of them. The register name change is just another staged edit, applied with everything else at publish.

This removes the central argument against full unification. The friction argument was based on a user expectation that does not exist.

---

## Field-by-Field Verdict

The question for each field is: is there a genuine technical reason it cannot travel through the draft system? Not "is it convenient to keep immediate-effect" — a real blocker.

| Field | Technical blocker to draft treatment? |
|---|---|
| `name` | None. It is already in the snapshot. Promote on publish. |
| `description` | None. Same as `name`. |
| `riskIdPrefix` | None. Only affects future risk ID generation; existing IDs are stamped at creation and never change. No migration. |
| `riskIdZeroPaddingEnabled` | None. Same as `riskIdPrefix`. |
| `riskIdZeroPaddingWidth` | None. Same as `riskIdPrefix`. |
| `defaultNewRiskState` | None. Governs the initial state of newly created risks only; no retroactive effect. |
| `reviewsEnabled` | None. No data migration. No impact analysis. Toggling this is a workflow capability change comparable to `responseActionMode`. |
| `defaultReviewFrequencyMonths` | None. Server-side calculation only; no visible mid-session effect. |
| `allowViewerExport` | None. A permission flag with no data semantics. |
| `customFieldValidationEnabled` | None. Controls enforcement behaviour at save time; no migration. |
| `reviewStatusPosition` | None. A UI display preference with no data semantics. |

None of these fields have a genuine technical blocker. The previous analysis cited convenience and friction as reasons to keep them immediate-effect. The "no Save button" insight removes those reasons.

### `responseActionMode` — special case, not a blocker

`responseActionMode` is already Category A and correctly so. A mode switch triggers a data migration (`migrateSimpleResponseActionsToChildRecords` or the reverse), and impact analysis provides a blocker when the migration cannot be reversed safely. This is not an argument against unification — it is an example of a field already in the unified path that happens to require extra work on publish. Other fields being moved to always-promote do not require a migration; they are straightforward value writes.

---

## Are There Genuine Technical Blockers to Full Unification?

After honest consideration, there are none that make unification impossible or harmful.

Background jobs do not read live `Register` fields in a way that would break if those fields were only updated on publish — the same timing applies today for the fields already in the always-promote block. The schema snapshot type (`ConfigSnapshotRegisterSettings`) already includes all the fields under discussion. The publish transaction is already the correct place to write them back to the `Register` row. No field has a side-effect on publish that would be more dangerous staged than immediate.

The one class of concern raised in the earlier analysis — that permission revocations (like `allowViewerExport`) should take effect immediately — does not hold on reflection. The admin is already in a "prepare and commit" model. Revoking export access via a draft that the admin publishes immediately is indistinguishable in practice from an immediate revocation, and the admin can publish in seconds if they need to.

There are no genuine blockers.

---

## Recommendation

The earlier analysis was wrong to recommend keeping most Category B fields as immediate-effect. The "no Save button" insight invalidates that recommendation.

**Adopt a unified draft system for all register settings.** Every field in `ConfigSnapshotRegisterSettings` should be applied on publish, regardless of whether the draft originated from a template. The `sourceTemplateVersionId` conditional in `publishDraft` should be retained only for `linkedTemplateVersionId` — the pointer that advances the register's template sync point. All register settings fields should move outside the conditional to the always-promote block.

### What needs to change technically

**Backend — `configVersion.publish.service.ts`:**
Move all register settings fields out of the `sourceTemplateVersionId` conditional block and into the always-promote section. The pattern is established by `scoringFormula` and `responseActionMode`: read the field from `snapshot.register`, write it to the `Register` row unconditionally. Only `linkedTemplateVersionId` remains inside the conditional.

**Backend — `registers.service.ts` (publish schema):**
No structural changes needed to the schema. All fields are already in `ConfigSnapshotRegisterSettings`.

**Frontend — `RegisterSettingsTab.tsx` and related components:**
All fields that currently fire `PATCH /registers/:registerId` directly in draft mode must instead route through `updateDraftConfig`. The `handleFormBlur` guard pattern already does this for `reviewCommentMode` and `reviewAttestationText`. Extend the same pattern to `name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, and `reviewStatusPosition`.

**Frontend — TypeScript types:**
No type changes needed. `ConfigSnapshotRegisterSettings` already includes all fields.

**Frontend — non-draft mode:**
Outside draft mode, the existing direct-write path (`PATCH /registers/:registerId`) remains correct. When no draft is active, there is nothing to stage; edits should apply immediately.

### Fields that need special handling

`responseActionMode` — already handled correctly. The data migration and impact analysis remain as-is. No change needed.

All other fields — straightforward value promotion. Read from snapshot, write to `Register` row. No migration, no impact analysis.

---

## Deferred Items

The following were identified during this investigation and are out of scope for v1.27.0. The PM should capture them as backlog items.

**`createRegisterFromTemplate` data fidelity bug.** The `tx.register.create` call in `createRegisterFromTemplate` omits `reviewCommentMode`, `scoringFormula`, and `responseActionMode`. Registers created from templates that encode non-default values for these fields silently start with wrong values. This is a pre-existing bug unrelated to the draft unification work.

**`compareRegisterToTemplate` comparison gap.** The `registerSettingsKeys` array in `compareRegisterToTemplate` omits the same three fields. A template update that only changes these fields shows "no differences" in the Compare modal even though the register is genuinely out of sync. Actively misleading.

**Template drift banner.** The backend already returns `linkedTemplate.isLatest` on the register response. The UI surfaces this only via the `TemplateLinkPanel` orange badge, visible only on the configuration screen. Admins who work primarily in the risks list will not see it. A persistent banner on the settings screen (or on the register list) requires only a frontend change — no backend work.

**`linkedTemplateVersionId` policy decision.** When a linked register publishes a manual draft, `linkedTemplateVersionId` is not updated (it only advances when a template-origin draft is published). Whether this is the correct policy — remain linked at the same version, or unlink automatically when the admin diverges — has never been explicitly decided. The PM should document the intended behaviour.

**Active template-update notification infrastructure.** There is no push or email notification when a template is updated. Building this requires an in-app notification system that does not yet exist. The correct minimum-viable approach is the drift banner above. Full notification infrastructure is a separate capability decision for a future release.
