# Active Release

Version: v1.28.0
Status: testing
Branch: release/custom-risk-1.28.0 (cut from main @ 8fc908e)

## Release goal

Fix the split register-settings draft path that the abandoned v1.27.0 release exposed, and clear the remaining v1.27.0 fallout and template-fidelity bugs alongside it. Register settings are currently served by two competing write paths — some fields travel through the config draft and are promoted on publish, others are written straight to the `Register` row and bypass the draft entirely. SPIKE-008 established that this split cannot be repaired field by field: v1.27.0 tried exactly that, each special case produced a new regression, and the release was abandoned. This release moves every register settings field onto the always-promote path so the draft becomes the single truth in draft mode, and takes with it the four defects in the same blast radius — a crash and a data-fidelity gap in `createRegisterFromTemplate`, a Compare modal reporting "no differences" when three real fields differ, and a seed file still writing a column the v1.27.0 revert removed — closing with the template-drift banner that makes drift visible to Register Admins who never open the configuration screen. Delivering this unblocks PM8-CORE, held since v1.19.0.

Sequencing: backend takes the four bugs first — BUG-058 and BUG-060 in a single pass because they sit in the same function, then BUG-061, then BUG-059 — before starting the DRAFT-UNIFIED publish-service change, so the small confirmed fixes land clean and are not entangled with the refactor. Frontend runs in parallel: DRAFT-UNIFIED handler changes first, then UI-024. The Principal Architect writes the architecture doc in parallel and blocks nobody. The Test Engineer verifies once backend and frontend are both complete.

## Selected work items

### DRAFT-UNIFIED — Implement unified draft system for all register settings

Source: none — extracted from the abandoned v1.27.0 release; provenance is SPIKE-008
Type: refactor | Priority: high | Status: ready

Backend: in `backend/src/services/configVersion.publish.service.ts`, move every register settings field out of the `sourceTemplateVersionId` conditional and into the always-promote block. Only `linkedTemplateVersionId` remains inside the conditional. The fields to move are `name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled` and `reviewStatusPosition`. `responseActionMode` is already handled correctly; `scoringFormula`, `reviewCommentMode` and `reviewAttestationText` must be confirmed as always-promote rather than assumed.

Frontend: in `frontend/src/features/configuration/RegisterSettingsTab.tsx`, update every field blur/change handler so that in draft mode it calls `updateDraftConfig` instead of `PATCH /registers/:registerId`. The `reviewCommentMode` and `reviewAttestationText` handlers are the reference pattern — extend it to the rest.

Architecture: the unified draft standard is written into `docs/architecture/register-config-draft-system.md` as the rule for all current and future register settings fields. Docs only — no code changes from the architect.

Full acceptance criteria: `docs/work/backlog.yml`, item DRAFT-UNIFIED.

### BUG-058 — createRegisterFromTemplate crashes with a missing createdBy relation

Source: REQ-088
Type: bug | Priority: critical | Status: ready

`tx.register.create()` in `backend/src/services/registers.service.ts` (around line 700) passes the `createdByUserId` / `updatedByUserId` scalars without the required `createdBy` relation, and Prisma rejects the call outright. Replace with `createdBy: { connect: { id: userId } }` and the equivalent for `updatedBy`, matching the pattern the other register creates in that file already use.

Full acceptance criteria: `docs/work/backlog.yml`, item BUG-058.

### BUG-060 — createRegisterFromTemplate does not copy three template fields

Source: REQ-091
Type: bug | Priority: high | Status: ready

The same `tx.register.create()` call omits `reviewCommentMode`, `scoringFormula` and `responseActionMode`, so a register created from a template that sets any of them silently starts on the schema defaults with no error raised. Read the values from the template's config snapshot and pass them through. Depends on BUG-058, but softly — fix both in one pass.

Full acceptance criteria: `docs/work/backlog.yml`, item BUG-060.

### BUG-061 — Template Compare modal reports an empty diff for three fields

Source: REQ-092
Type: bug | Priority: high | Status: ready

`compareRegisterToTemplate` omits `reviewCommentMode`, `scoringFormula` and `responseActionMode` from its `registerSettingsKeys` array, so a template differing only in those fields shows "no differences" while the register is genuinely out of sync. Add the three keys, then confirm the modal renders the diff correctly — the array change alone is not evidence the user-facing symptom is gone.

Full acceptance criteria: `docs/work/backlog.yml`, item BUG-061.

### BUG-059 — Prisma seed file writes a column the schema no longer has

Source: REQ-090
Type: bug | Priority: high | Status: ready

Root cause is confirmed, not suspected. `backend/prisma/seed.ts:548` writes `reviewCommentMode` in `prisma.register.upsert()`, and the `review_comment_mode` column was removed when v1.27.0 was reverted; `prisma migrate deploy` reports all 19 migrations applied and none pending, so the schema is right and seed.ts is stale. The System Admin upsert succeeds first, so the failure lands mid-way through the demo-register loop and leaves a partially populated database. Remove the reference, sweep the file for other v1.27.0 remnants, and verify a clean full run rather than merely an error-free exit.

Full acceptance criteria: `docs/work/backlog.yml`, item BUG-059.

### UI-024 — Surface the template-drift banner on the register settings page

Source: REQ-093
Type: improvement | Priority: medium | Status: ready

When `linkedTemplate.isLatest` is `false`, show a banner on the register settings page with a call-to-action leading to the template comparison. The backend already returns `linkedTemplate.isLatest` on the register response, so there is no backend work. This item also carries the REQ-093 help content: publishing a manual draft does **not** unlink a register from its template.

Full acceptance criteria: `docs/work/backlog.yml`, item UI-024.

## Decisions

1. The unified draft path is the standard, not a one-off fix. Every register settings field is promoted unconditionally on publish, and only `linkedTemplateVersionId` stays inside the `sourceTemplateVersionId` conditional. Any settings field added in future follows this rule; the architecture doc exists so nobody has to rediscover it.
2. The direct-write path stays. `PATCH /registers/:registerId` is correct behaviour outside draft mode and is not removed or deprecated. Only the draft-mode branch changes.
3. Publishing a manual draft does not unlink a register from its template (REQ-093). The register stays linked at its current template version and drifts visibly. Backend behaviour is already correct — this decision produces help content, not code.
4. The drift banner ships on the register settings page only. It is not added to the register list page in this release.
5. The banner's call-to-action links to the register's configuration page, where the Template Compare modal already lives, rather than deep-linking the modal directly. Fewer assumptions about modal routing, and the existing `TemplateLinkPanel` badge remains the entry point it always was.
6. BUG-058 and BUG-060 are fixed in one pass. They are two independent defects in one function; splitting them buys nothing and opens a second regression window.
7. BUG-059 is a known fix, not an investigation. Confidence was raised to high on the human's 2026-08-23 reproduction. The condition of done is a clean, complete, idempotent seed run producing the MAINT-014 demo data — not the absence of a stack trace.
8. `docs/architecture/register-config-draft-system.md` currently exists only on the `release/v1.27.0` branch. The Principal Architect brings it onto the release branch and updates it for the unified standard, rather than writing a new document beside it.
9. v1.27.0 is a burned version number. That release was abandoned and reverted, was never tagged, and its `release/v1.27.0` branch still exists both locally and on `origin`. The version for this release is assigned by `/work-release`, but it must skip 1.27.0 — reusing it would collide with an existing branch name and with an abandonment already recorded in main's history.

## Decisions needed

None blocking implementation. Verifying the build before release remains with the human per the manifest's `human_owns`.

## Out of scope

- PM8-CORE does not ship in this release. DRAFT-UNIFIED is its named prerequisite and clears it, but review comment mode, the attestation text UI and the review history panel are follow-on work.
- The config draft system's feature flag is untouched. This release changes what travels through the draft, not whether draft config is gated at all.
- Notification infrastructure. The drift banner is an in-page alert only; no push, email or digest delivery is added.

## Required agents

- **principal-architect** — writes the unified draft standard into `docs/architecture/register-config-draft-system.md` for DRAFT-UNIFIED, and reviews the backend publish-service change before it merges. This release trips the `consult_before` trigger "a new cross-cutting pattern or architectural concern": the always-promote rule is exactly that, and it lands in a core service. Architect output blocks nobody from starting.
- **backend-developer** — BUG-058 and BUG-060 (single pass), BUG-061, BUG-059, and the DRAFT-UNIFIED publish-service change.
- **frontend-developer** — DRAFT-UNIFIED draft-mode handlers in `RegisterSettingsTab.tsx`; UI-024 banner and help content.
- **test-engineer** — verification across all six items, including the manual E2E runs called out below.

## Verification bar

`docs/operations/e2e-testing.md` is the project's testing policy document, and it states the E2E suite is **not** run in CI — it is run manually by the Test Engineer when a change affects existing E2E coverage. A green CI run is therefore not sufficient evidence where an item says so below.

**DRAFT-UNIFIED**
- Publishing a manual draft persists every register settings field: `name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`, `reviewCommentMode`, `reviewAttestationText`.
- Publishing a template-origin draft still updates `linkedTemplateVersionId` correctly.
- Non-draft mode still saves immediately via `PATCH /registers/:registerId` — no regression.
- New tests cover the always-promote path for at least three fields that were previously direct-write.
- All existing config lifecycle tests pass.
- Architecture documentation codifies the unified draft standard.
- Mandatory manual E2E run — this changes configuration publish behaviour. Test Engineer runs the Playwright suite and records the result.

**BUG-058**
- Creating a register from a template completes without a `PrismaClientValidationError`.
- The created register has correct `createdBy` and `updatedBy` relations.
- A backend test covers the create-from-template happy path.

**BUG-060**
- A register created from a template with a non-default `scoringFormula` uses that formula.
- A register created from a template with `responseActionMode: CHILD_RECORDS` starts in `CHILD_RECORDS`, not `SIMPLE`.
- A register created from a template inherits the template's `reviewCommentMode`.
- Backend tests cover all three fields.

**BUG-061**
- A template differing only in `reviewCommentMode`, `scoringFormula` or `responseActionMode` produces a correct, non-empty diff in the Compare modal — confirmed against the rendered modal, not only the comparison function.
- No regression to diff display for other fields.

**BUG-059**
- `npm run seed:admin` completes without errors.
- `npm run db:setup` completes without errors against a clean database.
- Running the seed twice in succession succeeds both times (idempotency).
- The seeded database contains the MAINT-014 demo data — custom fields, response action child records, a custom formula, completed reviews — verified by inspection, not inferred from a zero exit code.
- No references to `reviewCommentMode`, `review_comment_mode` or `ReviewCommentMode` remain anywhere in `backend/prisma/seed.ts`.
- `backend/test/seed.test.mjs` passes.

**UI-024**
- The banner appears when `linkedTemplate.isLatest` is `false`.
- The banner is absent when `linkedTemplate.isLatest` is `true` and when the register has no linked template.
- The call-to-action navigates to the register configuration page.
- The existing `TemplateLinkPanel` orange badge still works — no regression.
- Help content in `frontend/public/help/en/` describes the drift banner and states explicitly that publishing a manual draft does not unlink the register from its template.
- Mandatory — banner and call-to-action each carry a `data-testid` following the kebab-case convention in `docs/operations/e2e-testing.md`. This is a project selector standard, not a preference.

## Deferred items for PM

Raised during the v1.28.0 release session. Each is a fact about the codebase that the release
scope does not match; none was absorbed into this release.

1. **`reviewCommentMode` does not exist in this codebase.** Verified on `release/custom-risk-1.28.0`:
   the field appears nowhere in `schema.prisma`, `ConfigSnapshotRegisterSettings`, the Zod schemas,
   the backend services or the frontend. It was reverted with v1.27.0 and returns with PM8-CORE, which
   this release puts out of scope. Three sets of acceptance criteria in `backlog.yml` name it and cannot
   be met literally: **BUG-060** and **BUG-061** each list it as one of three fields (only
   `scoringFormula` and `responseActionMode` are real), and **DRAFT-UNIFIED** lists it among the
   promoted fields (12, not 13). Delivered without it. The criteria need correcting.
2. **BUG-059's recorded root cause is stale.** `backend/prisma/seed.ts` contains no reference to
   `reviewCommentMode` in any spelling, and the register upsert at line 548 does not write it. Commit
   `c4b3dc7` ("fix: seed script failures") has since touched the file. The item was delivered against its
   acceptance bar — a clean, idempotent seed producing MAINT-014 data — rather than against the
   described fix.
3. **BUG-061 names the wrong file.** `compareRegisterToTemplate` and its `registerSettingsKeys` array
   live in `backend/src/services/template.service.ts` (lines 303 and 342), not `registers.service.ts`.
4. **Decision 8's premise is wrong.** `docs/architecture/register-config-draft-system.md` is not
   confined to the `release/v1.27.0` branch — it is already on `main` at commit `4fc0070`. No harm done;
   the architect updated the existing file, which is what the decision intended.
5. **`RegisterSettingsTab` renders only 9 of the register settings fields.** `defaultNewRiskState`,
   `reviewAttestationText` and `reviewStatusPosition` have no control in that tab at all. Adding them is
   out of scope here — this release routes the handlers that exist — but the unified draft standard now
   assumes every settings field is editable through the draft, so the gap is worth a request.
6. **REQ-094 to REQ-097 were captured into `requests.md` mid-release** (Dependabot bumps). Committed on
   the release branch as intake only; they are not v1.28.0 scope.

## Blockers

None.
