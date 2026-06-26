# Active Release

Status: proposed
Version: TBD

> **Note for Release Manager:** Do not use v1.27.0 as the version number. That version was started during the abandoned release and must be skipped. Use v1.28.0 (or whatever the next correct semver increment is from the current main branch tag).

## Release goal

Implement the unified draft system for all register settings, fixing the root architectural cause of the v1.27.0 regressions and unblocking PM8-CORE. Alongside, fix two related createRegisterFromTemplate bugs, the Template Compare modal field gap, and the broken seed file. Add the template drift banner on the register settings page to complete the template-drift story.

## Selected work items

### DRAFT-UNIFIED — Implement unified draft system for all register settings

Status: proposed
Source: extracted from abandoned v1.27.0 (SPIKE-008)
Capability: config-lifecycle-templates
Suggested agents: principal-architect, backend-developer, frontend-developer, test-engineer

**Scope:**

All register settings must travel through the draft system in draft mode and be promoted unconditionally on publish. The `sourceTemplateVersionId` conditional in `configVersion.publish.service.ts` must apply only to `linkedTemplateVersionId`; all other register settings fields move to the always-promote block.

1. **Principal Architect** — write or update architecture documentation (suggested location: `docs/architecture/register-config-draft-system.md`, which already exists on the release branch being merged to main) to codify the unified draft standard as the rule for all current and future register settings fields. This is a docs-only task; no code changes for PA.

2. **Backend developer** — in `configVersion.publish.service.ts`, move all register settings fields out of the `sourceTemplateVersionId` conditional block into the always-promote section. Fields to move: `name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `defaultNewRiskState`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`. `responseActionMode` is already correctly handled. `scoringFormula` and `reviewCommentMode` and `reviewAttestationText` should also be verified as always-promote.

3. **Frontend developer** — in `RegisterSettingsTab.tsx`, update all field blur/change handlers so that in draft mode they call `updateDraftConfig` rather than `PATCH /registers/:registerId`. The direct-write path (`PATCH /registers/:registerId`) is correct and must be preserved for non-draft mode. The pattern for `reviewCommentMode` and `reviewAttestationText` (established in the abandoned v1.27.0 work) is the reference — extend it to all other settings fields.

4. **Test engineer** — verify all acceptance criteria; add tests covering the always-promote path for at least three previously Category B fields; confirm no Category B regressions remain.

**Acceptance criteria:** See `docs/work/backlog.yml` item DRAFT-UNIFIED.

---

### BUG-058 — Fix createRegisterFromTemplate Prisma crash

Status: proposed
Source: REQ-088
Capability: config-lifecycle-templates
Suggested agents: backend-developer, test-engineer

**Scope:** In `registers.service.ts` around line 700, `tx.register.create()` is called with `createdByUserId`/`updatedByUserId` scalar fields but without the required `createdBy` relation, causing a hard PrismaClientValidationError. Replace with `createdBy: { connect: { id: userId } }` (and equivalently for `updatedBy`) matching the pattern used by other register creates in the codebase.

**Sequencing:** Fix this before BUG-060 — both are in the same function and should be addressed in a single pass.

**Acceptance criteria:** See `docs/work/backlog.yml` item BUG-058.

---

### BUG-060 — Fix createRegisterFromTemplate — does not copy reviewCommentMode, scoringFormula, responseActionMode

Status: proposed
Source: REQ-091
Capability: config-lifecycle-templates
Suggested agents: backend-developer, test-engineer

**Scope:** In the same `tx.register.create()` call fixed in BUG-058, add `reviewCommentMode`, `scoringFormula`, and `responseActionMode` so registers created from templates inherit the template's values for these fields rather than silently defaulting.

**Sequencing:** Fix in the same pass as BUG-058.

**Acceptance criteria:** See `docs/work/backlog.yml` item BUG-060.

---

### BUG-061 — Fix Template Compare modal — empty diff for reviewCommentMode, scoringFormula, responseActionMode

Status: proposed
Source: REQ-092
Capability: config-lifecycle-templates
Suggested agents: backend-developer, test-engineer

**Scope:** Add `reviewCommentMode`, `scoringFormula`, and `responseActionMode` to the `registerSettingsKeys` array in `compareRegisterToTemplate`. One-line fix; verify the Compare modal shows correct diffs after the change.

**Acceptance criteria:** See `docs/work/backlog.yml` item BUG-061.

---

### BUG-059 — Fix broken Prisma seed file

Status: proposed
Source: REQ-090
Capability: build-toolchain
Suggested agents: backend-developer

**Scope:** Identify and remove any `ReviewCommentMode` references or other v1.27.0 artefacts from `backend/prisma/seed.ts` so the seed runs cleanly against the current schema. Verify `npx prisma db seed` completes without errors and produces the expected demo data from the MAINT-014 refresh.

**Acceptance criteria:** See `docs/work/backlog.yml` item BUG-059.

---

### UI-024 — Surface template-drift banner on register settings page

Status: proposed
Source: extracted from abandoned v1.27.0 (SPIKE-008 deferred items)
Capability: config-lifecycle-templates
Suggested agents: frontend-developer, test-engineer

**Scope:** When `linkedTemplate.isLatest` is `false`, show a visible banner or alert on the register settings page. The banner should include a call-to-action linking to the Template Compare modal (or configuration page). The backend already returns `linkedTemplate.isLatest` on the register response — no backend change needed.

**Decision:** Drift banner placement → **register settings page only**. Do not add to the register list page in this release.

**Decision:** Help content must be updated to explain the template-drift banner and to state explicitly that publishing a manual draft does NOT unlink the register from its template — the register remains linked at the same template version, and the drift banner will appear if the template advances further (REQ-093 policy decision).

**Acceptance criteria:** See `docs/work/backlog.yml` item UI-024.

---

## Required agents

- **principal-architect** — DRAFT-UNIFIED architecture docs only. No code changes. PA output (architecture doc) does not block other agents — backend and frontend can begin in parallel.
- **backend-developer** — DRAFT-UNIFIED backend (publish service changes); BUG-058 + BUG-060 (single pass in createRegisterFromTemplate); BUG-061 (compareRegisterToTemplate); BUG-059 (seed cleanup).
- **frontend-developer** — DRAFT-UNIFIED frontend (RegisterSettingsTab draft-mode handlers); UI-024 (drift banner on settings page + help content).
- **test-engineer** — verify all acceptance criteria across all six work items.

## Sequencing

1. Backend developer starts with BUG-058 + BUG-060 (single pass, same function), then BUG-061, then BUG-059, then DRAFT-UNIFIED backend changes.
2. Frontend developer works in parallel: DRAFT-UNIFIED frontend changes first, then UI-024.
3. Principal Architect produces the architecture doc in parallel — no blocking dependency.
4. Test engineer verifies once backend and frontend work is complete.

## Blockers

None — all clear.

## Test / sign-off

- [ ] Publishing a manual draft correctly persists all register settings fields (name, description, riskIdPrefix, reviewsEnabled, allowViewerExport, reviewCommentMode, scoringFormula, reviewAttestationText, and others).
- [ ] Non-draft mode direct-write path continues to work correctly.
- [ ] Creating a register from a template no longer throws a PrismaClientValidationError.
- [ ] A register created from a template inherits the template's reviewCommentMode, scoringFormula, and responseActionMode values.
- [ ] Template Compare modal shows a correct diff when only reviewCommentMode, scoringFormula, or responseActionMode differ.
- [ ] `npx prisma db seed` runs to completion without errors.
- [ ] Template drift banner appears on the register settings page when linkedTemplate.isLatest is false.
- [ ] Template drift banner is absent when linkedTemplate.isLatest is true or register has no linked template.
- [ ] Help content updated to describe the drift banner and the manual-draft-does-not-unlink policy.
- [ ] Architecture documentation codifies the unified draft standard.
- [ ] All existing config lifecycle tests pass.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
