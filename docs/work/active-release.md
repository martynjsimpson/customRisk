# Active Release

Status: ready-for-release
Version: v1.27.0

## Release goal

Close the remaining PRD 10.1 gaps in the risk review feature and surface review history in the UI. No new review rule engine, no Risk Response Reviews — this is a completeness pass on what the product already ships. One PA-approved schema change unblocks the rest of the work.

## Selected work items

### PM8-CORE — Risk review completeness: comment mode, attestation text UI, review history panel

Status: done
done_in: v1.27.0
Source: REQ-005
Capability: advanced-reviews
Suggested agents: principal-architect, backend-developer, frontend-developer, test-engineer

**Scope:**

1. Add `ReviewCommentMode` enum (DISABLED / OPTIONAL / MANDATORY) to the Prisma schema with a migration. Add `reviewCommentMode ReviewCommentMode @default(OPTIONAL) @map("review_comment_mode")` to the `Register` model. This schema change is approved by the PA in `docs/spikes/SPIKE-006.md` — the backend developer may proceed with the migration without further PA consultation. PA's only role in this release is creating the schema migration.

2. Expose `reviewCommentMode` on the register API response shape.

3. Enforce `reviewCommentMode` in `completeRiskReview` (backend service):
   - DISABLED: reject any request body that includes a comment (return 400 VALIDATION_ERROR)
   - MANDATORY: require a non-empty comment or return 400 VALIDATION_ERROR
   - OPTIONAL: existing behaviour, no change

4. Add `reviewCommentMode` Select control (dropdown) and `reviewAttestationText` Textarea to the Reviews fieldset in `RegisterSettingsTab`. The backend already persists `reviewAttestationText` — this is a missing UI surface only. Invalidate the `["register", registerId]` query after saving either field so `ReviewModal` picks up the updated values on next open.

5. Conditionally show or hide the comment textarea in `ReviewModal` based on the register's `reviewCommentMode`. Disable the Complete Review button when mode is MANDATORY and the comment field is empty.

6. Add or verify a review history panel in the risk detail view. **Important:** `UI-018` (v1.14.0) claims to have paginated a "Review History table" in the risk detail modal, but `SPIKE-006` could not find a rendering component. Before building, the frontend developer must audit `RiskDetailModal.tsx` and the `listRiskReviews` usage in `risks.api.ts`. If a review history panel already exists, verify it shows reviewer name, date/time, comment (when present), and calculated next review date. If it does not exist, build it using data from `GET /api/v1/registers/:registerId/risks/:riskId/reviews` (endpoint is implemented and working).

**Acceptance criteria:**

- A Register Admin can set reviewCommentMode (Disabled / Optional / Mandatory) via the Reviews section of register settings.
- When Disabled: comment textarea is not shown in ReviewModal; backend rejects any request body with a comment field.
- When Mandatory: Complete Review button is disabled until a non-empty comment is entered; backend returns 400 if comment is absent or blank.
- When Optional: existing behaviour is unchanged.
- A Register Admin can edit the attestation text via register settings. The next completed review shows the updated text. Previously completed reviews retain the text that was active at their time.
- The risk detail view shows a review history section with reviewer name, date/time, comment (if present), and calculated next review date for each past review.
- All existing review tests pass.
- New backend tests cover each reviewCommentMode enforcement path.
- Help content in `frontend/public/help/en/` updated to describe reviewCommentMode options and attestation text configuration.

## Required agents

- **principal-architect** — schema migration only (ReviewCommentMode enum + Register column). No other PA involvement required; PA's output unblocks backend-developer.
- **backend-developer** — expose reviewCommentMode on API response; enforce in completeRiskReview; new backend tests.
- **frontend-developer** — RegisterSettingsTab UI (comment mode Select + attestation text Textarea); ReviewModal conditional rendering; review history panel audit/build; help content update.
- **test-engineer** — verify acceptance criteria; update frontend tests for comment mode conditional rendering and review history panel.

**Sequencing:** PA creates schema migration first. Backend developer may begin enforcement work once migration is in place. Frontend developer can begin RegisterSettingsTab and ReviewModal work in parallel with backend once the API shape for reviewCommentMode is confirmed.

## Decisions

**Decision:** reviewCommentMode UI control → Select (dropdown) within the Reviews fieldset in RegisterSettingsTab, consistent with other configuration selects in the app.

**Decision:** reviewAttestationText UI control → Textarea, appropriate for multi-line attestation text.

**Decision:** review history panel — frontend developer must audit whether UI-018 (v1.14.0) already produced a rendered review history list in RiskDetailModal before building from scratch. Build only if absent.

## Test / sign-off

- [x] reviewCommentMode can be set and persisted via register settings UI.
- [x] DISABLED mode: comment textarea hidden in ReviewModal; backend rejects any comment body field.
- [x] MANDATORY mode: Complete Review button disabled until non-empty comment entered; backend validates server-side.
- [x] OPTIONAL mode: existing review flow unchanged.
- [x] Attestation text editable via register settings; next review reflects change; prior reviews unaffected.
- [x] Review history visible in risk detail view with required fields (reviewer, date/time, comment, next review date).
- [x] Existing review tests still pass.
- [x] Help content updated.

**Implementation pass:** complete — v1.27.0
**Regression test pass:** complete — 239 tests, 0 failures, typecheck clean
**Documentation pass:** complete — help content updated in `frontend/public/help/en/registers.md`

## Blockers

None — all clear.

## Verification feedback

**Verification feedback [1]:** reviewCommentMode dropdown does not appear to be saving. User suspects it is not part of the draft config on the server — when config is published it gets overridden. This issue has occurred before with other register settings.
**Investigation (round 1):** Bug confirmed at two layers in the backend. (1) `updateRegisterSchema` did not include `reviewCommentMode` or `reviewAttestationText`. (2) `updateRegister` service did not write either field to the DB. Fixed in commit 4c71132.
**Verification feedback [2]:** Still not saving after app restart. HAR confirms: user flow goes through config-version draft/publish (POST /config-versions/draft → POST /config-versions/draft/publish). No PATCH to /registers/:registerId in HAR at all. GET /registers/:registerId returns `reviewCommentMode: "OPTIONAL"` throughout.
**Investigation (round 2):** Root cause is in the frontend draft-mode save path. `RegisterSettingsTab` hides the Save button in draft mode (`!draftConfigMode` guard, line 268) and the blur-autosave also only fires outside draft mode (line 156). So when `draftConfigMode && hasDraft`, there is no save path for `reviewCommentMode` or `reviewAttestationText` — the user can edit them in the form but they can never be submitted. Additionally, `reviewCommentMode` is absent from `buildSnapshotFromRelationalTables` in `configVersion.draft.service.ts` (lines 46–109), so it is also missing from the config snapshot and would not survive a template-draft publish even if saved. `reviewAttestationText` is in the snapshot but has the same missing save-path problem in draft mode.
**Ruling:** in scope — gap against acceptance criteria for both fields.
**Fix (partial):** Backend added `reviewCommentMode` to config snapshot pipeline (draft build, normalise, template publish write-back, export, import). Frontend added `updateDraftReviewFieldsMutation` with `handleReviewCommentModeChange` and `handleReviewAttestationTextBlur` handlers that call `updateDraftConfig` when `draftConfigMode && hasDraft`. 241 tests passing, typecheck clean. Fixed in commits af0c027 + ca60855.

**Verification feedback [3]:** After PA architectural review (SPIKE-008), a deeper root cause was identified. PA review also surfaced that the fix in feedback [2] introduced a regression — other settings (e.g. register name) stopped updating, caused by the dual-path frontend mutation. User also noted settings are not being greyed out correctly when no draft exists, and controls that were working are now broken.

**Investigation (round 3):** Root cause confirmed via SPIKE-008 — the `sourceTemplateVersionId` conditional in `configVersion.publish.service.ts` is the true cause. For manual drafts (no `sourceTemplateVersionId`), the publish flow intentionally does not write Category A snapshot fields back to the `Register` row, to avoid overwriting direct edits made via `PATCH /registers/:registerId` while a draft was open. However, `reviewCommentMode` and `reviewAttestationText` have no direct-edit path in draft mode — they are supposed to save only via the draft. So the "protection" is a silent no-op for these two fields: the snapshot value is staged, publish succeeds, nothing changes. The fix in feedback [2] attempted to compensate via a dual-path frontend mutation, which caused the observed regression in other settings.

**Ruling:** The correct fix is narrow and backend-only: move `reviewCommentMode` and `reviewAttestationText` out of the `sourceTemplateVersionId` conditional in `publishDraft` so they are always promoted on publish. The dual-path frontend mutation added in feedback [2] must be removed — it is the wrong pattern and caused the regression.

**SPIKE-008 recommendations and their v1.27.0 status:**
- **[Fix — DONE in this release]** Promote `reviewCommentMode` and `reviewAttestationText` unconditionally on publish — fixed in commit 6d4bb76.
- **[Fix — DONE in this release]** Remove `reviewCommentMode` and `reviewAttestationText` from the direct-register mutation in draft mode — fixed in commit 6d4bb76.
- **[Fix — DEFERRED TO PM]** `createRegisterFromTemplate` silently ignores `reviewCommentMode`, `scoringFormula`, and `responseActionMode` — registers created from templates start with wrong defaults for these fields. See SPIKE-008 Finding 8.
- **[Fix — DEFERRED TO PM]** Template Compare modal reports no differences when only `reviewCommentMode`, `scoringFormula`, or `responseActionMode` differ — diff is empty even though register is out of sync. Actively misleading. See SPIKE-008 Finding 9.
- **[Fix — DEFERRED TO PM]** Surface a "template has updates" banner on the register settings screen when `linkedTemplate.isLatest === false` — backend data is already available; UI-only change. See SPIKE-008 Finding 10.
- **[Fix — DEFERRED TO PM]** Codify the two-class publish model (always-promote vs template-origin-only) in architecture docs and PR template checklist — SPIKE-008 written; PR template update deferred.
- **[Design decision needed — DEFERRED TO PM]** Policy for `linkedTemplateVersionId` when a linked register publishes a manual draft — currently remains linked at same version. Is this deliberate? Needs explicit product decision.
- **[Future — DEFERRED TO PM]** Active notification infrastructure for template version advances — requires in-app notification system not yet built.
- **[Future — DEFERRED TO PM]** Extend always-promote to `reviewsEnabled`/`defaultReviewFrequencyMonths` if review impact analysis is ever built.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
