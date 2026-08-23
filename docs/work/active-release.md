# Active Release

Status: proposed
Version: TBD

## Release goal

Fix the split register-settings draft path that the abandoned v1.27.0 release exposed, and clear the
remaining v1.27.0 fallout and template-fidelity bugs alongside it. Register settings are currently
served by two competing write paths — some fields travel through the config draft and are promoted on
publish, others are written straight to the `Register` row and bypass the draft entirely. SPIKE-008
established that this split cannot be repaired field by field: v1.27.0 tried exactly that and each
special case produced a new regression, which is why it was abandoned. This release moves every
register settings field onto the always-promote path, so the draft becomes the single truth in draft
mode, and takes with it the four defects that sit in the same blast radius: a crash and a data-fidelity
gap in `createRegisterFromTemplate`, a Compare modal that reports "no differences" when three real
fields differ, and a seed file still writing a column v1.27.0 added and the revert removed. It closes
with the template-drift banner, which makes drift visible to Register Admins who never open the
configuration screen and carries the help content explaining what publishing a manual draft does and
does not do to a template link. Delivering this unblocks PM8-CORE, which has been held since v1.19.0.

**Sequencing.** Backend takes the four bugs first — BUG-058 and BUG-060 in a single pass because they
sit in the same function, then BUG-061, then BUG-059 — before starting the DRAFT-UNIFIED publish-service
change, so the small confirmed fixes land clean and are not entangled with the refactor. Frontend runs
in parallel: DRAFT-UNIFIED handler changes first, then UI-024. The Principal Architect writes the
architecture doc in parallel and blocks nobody. The Test Engineer verifies once backend and frontend
are both complete.

## Selected work items

Full acceptance criteria for every item are in `docs/work/backlog.yml`. Do not restate them here — read
them there.

### DRAFT-UNIFIED — Implement unified draft system for all register settings

- Source request: none (extracted from the abandoned v1.27.0 release; provenance is SPIKE-008)
- Type: refactor · Priority: high · Status: ready
- Suggested agents: principal-architect, backend-developer, frontend-developer, test-engineer

Backend: in `backend/src/services/configVersion.publish.service.ts`, move every register settings field
out of the `sourceTemplateVersionId` conditional and into the always-promote block. Only
`linkedTemplateVersionId` remains inside the conditional. The fields to move are `name`, `description`,
`riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`,
`reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`
and `reviewStatusPosition`. `responseActionMode` is already handled correctly; `scoringFormula`,
`reviewCommentMode` and `reviewAttestationText` must be confirmed as always-promote rather than assumed.

Frontend: in `frontend/src/features/configuration/RegisterSettingsTab.tsx`, update every field
blur/change handler so that in draft mode it calls `updateDraftConfig` instead of
`PATCH /registers/:registerId`. The `reviewCommentMode` and `reviewAttestationText` handlers are the
reference pattern — extend it to the rest.

Architecture: the Principal Architect writes the unified draft standard into
`docs/architecture/register-config-draft-system.md` as the rule for all current and future register
settings fields. Docs only — no code changes from the architect.

### BUG-058 — createRegisterFromTemplate crashes with a missing `createdBy` relation

- Source request: REQ-088
- Type: bug · Priority: critical · Status: ready
- Suggested agents: backend-developer, test-engineer

`tx.register.create()` in `backend/src/services/registers.service.ts` (around line 700) passes the
`createdByUserId` / `updatedByUserId` scalars without the required `createdBy` relation, and Prisma
rejects the call outright. Replace with `createdBy: { connect: { id: userId } }` and the equivalent for
`updatedBy`, matching the pattern the other register creates in that file already use.

### BUG-060 — createRegisterFromTemplate does not copy three template fields

- Source request: REQ-091
- Type: bug · Priority: high · Status: ready · Depends on: BUG-058
- Suggested agents: backend-developer, test-engineer

The same `tx.register.create()` call omits `reviewCommentMode`, `scoringFormula` and
`responseActionMode`, so a register created from a template that sets any of them silently starts on
the schema defaults with no error raised. Read the values from the template's config snapshot and pass
them through. The dependency on BUG-058 is soft: fix both in one pass.

### BUG-061 — Template Compare modal reports an empty diff for three fields

- Source request: REQ-092
- Type: bug · Priority: high · Status: ready
- Suggested agents: backend-developer, test-engineer

`compareRegisterToTemplate` omits `reviewCommentMode`, `scoringFormula` and `responseActionMode` from
its `registerSettingsKeys` array, so a template that differs only in those fields shows "no differences"
while the register is genuinely out of sync. Add the three keys, then confirm the modal renders the diff
correctly — the array change alone is not evidence the user-facing symptom is gone.

### BUG-059 — Prisma seed file writes a column the schema no longer has

- Source request: REQ-090
- Type: bug · Priority: high · Status: ready
- Suggested agents: backend-developer

Root cause is confirmed, not suspected. `backend/prisma/seed.ts:548` writes `reviewCommentMode` in
`prisma.register.upsert()`, and the `review_comment_mode` column was removed when v1.27.0 was reverted;
`prisma migrate deploy` reports all 19 migrations applied and none pending, so the schema is right and
seed.ts is stale. The System Admin upsert succeeds first, so the failure lands mid-way through the
demo-register loop and leaves a partially populated database. Remove the reference, sweep the file for
other v1.27.0 remnants, and verify a clean full run rather than merely an error-free exit.

### UI-024 — Surface the template-drift banner on the register settings page

- Source request: REQ-093
- Type: improvement · Priority: medium · Status: ready
- Suggested agents: frontend-developer, test-engineer

When `linkedTemplate.isLatest` is `false`, show a banner on the register settings page with a
call-to-action leading to the template comparison. The backend already returns `linkedTemplate.isLatest`
on the register response, so there is no backend work. This item also carries the REQ-093 help content:
publishing a manual draft does **not** unlink a register from its template.

## Decisions

1. **The unified draft path is the standard, not a one-off fix.** Every register settings field is
   promoted unconditionally on publish. Only `linkedTemplateVersionId` stays inside the
   `sourceTemplateVersionId` conditional. Any settings field added in future follows this rule, and the
   architecture doc exists so nobody has to rediscover it.
2. **The direct-write path stays.** `PATCH /registers/:registerId` is correct behaviour outside draft
   mode and is not removed or deprecated in this release. Only the draft-mode branch changes.
3. **Publishing a manual draft does not unlink a register from its template** (REQ-093). The register
   stays linked at its current template version and drifts visibly. Backend behaviour is already
   correct — this decision produces help content, not code.
4. **The drift banner ships on the register settings page only.** It is not added to the register list
   page in this release.
5. **The banner's call-to-action links to the register's configuration page**, where the Template
   Compare modal already lives, rather than deep-linking the modal directly. Fewer assumptions about
   modal routing, and the existing `TemplateLinkPanel` badge remains the entry point it always was.
6. **BUG-058 and BUG-060 are fixed in one pass.** They are two independent defects in one function;
   splitting them into two changes buys nothing and risks a second regression window.
7. **BUG-059 is a known fix, not an investigation.** Its confidence was raised to high on the human's
   2026-08-23 reproduction. The condition of done is a clean, complete, idempotent seed run producing
   the MAINT-014 demo data — not the absence of a stack trace.
8. **`docs/architecture/register-config-draft-system.md` currently exists only on the
   `release/v1.27.0` branch.** The Principal Architect brings it onto the release branch and updates it
   for the unified standard, rather than writing a new document beside it.
9. **v1.27.0 is a burned version number.** That release was abandoned and reverted, was never tagged,
   and its `release/v1.27.0` branch still exists both locally and on `origin`. The version for this
   release is assigned by `/work-release`, but it must skip 1.27.0 — reusing it would collide with an
   existing branch name and with an abandonment already recorded in main's history.

## Decisions needed

None blocking implementation. Two items remain with the human per the manifest's `human_owns`:
approving this release scope, and verifying the build before release.

## Out of scope

- **PM8-CORE does not ship in this release.** DRAFT-UNIFIED is its named prerequisite and clears it, but
  review comment mode, the attestation text UI and the review history panel are follow-on work.
- **The config draft system's feature flag is untouched.** This release changes what travels through the
  draft, not whether draft config is gated at all.
- **Notification infrastructure.** The drift banner is an in-page alert only. No push, email or digest
  delivery is added.

## Required agents

- **principal-architect** — writes the unified draft standard into
  `docs/architecture/register-config-draft-system.md` (DRAFT-UNIFIED). Also triggers the
  `consult_before` rule for "a new cross-cutting pattern or architectural concern": the always-promote
  rule is exactly that, and it touches a core service. PA reviews the backend publish-service change
  before it merges. PA output does not block backend or frontend from starting.
- **backend-developer** — BUG-058 + BUG-060 (single pass), BUG-061, BUG-059, and the DRAFT-UNIFIED
  publish-service change.
- **frontend-developer** — DRAFT-UNIFIED draft-mode handlers in `RegisterSettingsTab.tsx`; UI-024 banner
  and help content.
- **test-engineer** — verification across all six items, including the manual E2E run required below.

## Verification bar

Per `docs/operations/e2e-testing.md`, the E2E suite is **not** run in CI on this project — it is run
manually by the Test Engineer when a change affects existing E2E coverage. A green CI run is therefore
not sufficient evidence for the items marked below.

**DRAFT-UNIFIED**
- Publishing a manual draft persists every register settings field: `name`, `description`,
  `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`,
  `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`,
  `reviewStatusPosition`, `reviewCommentMode`, `reviewAttestationText`.
- Publishing a template-origin draft still updates `linkedTemplateVersionId` correctly.
- Non-draft mode still saves immediately via `PATCH /registers/:registerId` — no regression.
- New tests cover the always-promote path for at least three fields that were previously direct-write.
- All existing config lifecycle tests pass.
- **Mandatory manual E2E run** — this changes configuration publish behaviour. Test Engineer runs the
  Playwright suite and records the result.

**BUG-058**
- Creating a register from a template completes without a `PrismaClientValidationError`.
- The created register has correct `createdBy` and `updatedBy` relations.
- A backend test covers the create-from-template happy path.

**BUG-060**
- A register created from a template with a non-default `scoringFormula` uses that formula.
- A register created from a template with `responseActionMode: CHILD_RECORDS` starts in
  `CHILD_RECORDS`, not `SIMPLE`.
- A register created from a template inherits the template's `reviewCommentMode`.
- Backend tests cover all three fields.

**BUG-061**
- A template differing only in `reviewCommentMode`, `scoringFormula` or `responseActionMode` produces a
  correct, non-empty diff in the Compare modal — confirmed against the rendered modal, not only the
  comparison function.
- No regression to diff display for other fields.

**BUG-059**
- `npm run seed:admin` completes without errors.
- `npm run db:setup` completes without errors against a clean database.
- Running the seed twice in succession succeeds both times (idempotency).
- The seeded database contains the MAINT-014 demo data — custom fields, response action child records,
  a custom formula, completed reviews — verified by inspection, not inferred from a zero exit code.
- No references to `reviewCommentMode`, `review_comment_mode` or `ReviewCommentMode` remain anywhere in
  `backend/prisma/seed.ts`.
- `backend/test/seed.test.mjs` passes.

**UI-024**
- The banner appears when `linkedTemplate.isLatest` is `false`.
- The banner is absent when `linkedTemplate.isLatest` is `true` and when the register has no linked
  template.
- The call-to-action navigates to the register configuration page.
- The existing `TemplateLinkPanel` orange badge still works — no regression.
- Help content in `frontend/public/help/en/` describes the drift banner and states explicitly that
  publishing a manual draft does not unlink the register from its template.
- **Mandatory** — banner and call-to-action each carry a `data-testid` following the kebab-case
  convention in `docs/operations/e2e-testing.md`. This is a project selector standard, not a preference.

**Release-wide**
- Architecture documentation codifies the unified draft standard.
- Changelog entry written (`release.changelog: required` in the manifest).

## Blockers

None.
