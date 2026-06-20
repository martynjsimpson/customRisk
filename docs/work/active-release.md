# Active Release

Status: in-progress
Version: v1.17.0

## Release goal

Deliver a configurable risk score formula engine. Replace the hardcoded Likelihood × Impact formula with a per-register formula that Register Admins can define, validate, and publish. Scores recalculate immediately across all risks in the register when a formula change is published. The engine must be architected for reuse by inherent and residual scoring in a future release.

## Selected work items

### PM6-SCORING — Implement configurable risk score formula engine
Source: REQ-004
Capability: advanced-scoring
Status: proposed

**Problem:** Risk scores are hardcoded to Likelihood × Impact. Registers cannot use any other formula regardless of their methodology. This is a fundamental gap in the product's configurability promise.

**Acceptance criteria:**
- Register Admins can define a custom scoring formula in register configuration using canonical variable names for Likelihood and Impact (regardless of their configured display names), numeric custom fields, numeric constants, and arithmetic operators (+, -, *, /, parentheses).
- The formula uses canonical variable names (e.g. `likelihood`, `impact`) so renaming L/I display labels does not break the formula.
- The formula is validated — syntax and type check — before it can be saved in draft AND before it can be published. Invalid formulas are rejected with a clear error message.
- When a config version containing a formula change is published, all risk scores in the register recalculate immediately.
- Existing registers default to the Likelihood × Impact formula and are unaffected unless a Register Admin explicitly changes it.
- The matrix and risk level assignment continue to work correctly (formula always references L and I).
- The formula engine is architected to support reuse for inherent and residual scoring (PM6-CORE) without rework.
- Score recalculation triggered by publish is auditable.
- No regression to existing scoring, matrix, or risk level behaviour.

**Key files:** `backend/src/services/scoring.service.ts`, `backend/src/services/formulaEvaluator.service.ts`, `backend/src/services/matrix.service.ts`, `frontend/src/features/configuration/ScoringConfigurationPanel.tsx`

**Tests:** `backend/test/riskScoring.test.mjs`, `frontend/test/configuration.test.mjs`

---

## Required agents

- **principal-architect** — must go first: defines the formula storage model (schema change), evaluates whether `formulaEvaluator.service.ts` can serve as the scoring formula engine or whether a separate evaluator is needed, confirms the architecture supports inherent/residual reuse, and defines which fields are available as formula variables.
- **backend-developer** — formula validation endpoint, bulk recalculation on publish, scoring service changes, audit integration.
- **frontend-developer** — formula editor UI in ScoringConfigurationPanel, validation feedback, config publish flow changes.
- **test-engineer** — formula validation, recalculation, matrix behaviour after formula change.

**Sequencing:** PA must complete the architecture review and schema design before backend-developer or frontend-developer begin implementation. PA output is a gate, not a parallel step.

## Decisions

- **Formula recalculation on publish** → immediate, across all risks in the register. Not lazy.
- **Formula variable names** → canonical names (`likelihood`, `impact`) are used in formulas, not display names. Renaming L/I labels in configuration does not affect the formula.
- **Formula inputs** → Likelihood and Impact are always the primary inputs. Numeric custom fields and constants are also valid. The formula is not required to be valid without L and I — this is by design since the matrix depends on L/I being in the formula.
- **Formula validation** → validated on save (draft) and enforced on publish. Invalid formulas block publishing.
- **Inherent/residual mode** → explicitly out of scope for this release. PM6-CORE (inherent/residual) is deferred until PM7-CORE (child actions) is complete.

## Test / sign-off

- [ ] PA architecture sign-off received before implementation begins
- [ ] Formula validation rejects invalid syntax with clear error message
- [ ] Formula validation rejects type errors (e.g. non-numeric field reference)
- [ ] Existing default formula (likelihood × impact) continues to work unchanged
- [ ] Score recalculation fires immediately on publish for all risks in the register
- [ ] Matrix and risk level assignment unaffected by formula change (where formula uses L and I)
- [ ] Recalculation event is captured in audit log
- [ ] No regression to existing scoring, matrix, or risk level tests
- [ ] Full CI pass

## Blockers

None.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
