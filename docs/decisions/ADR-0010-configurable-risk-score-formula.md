# ADR-0010 — Configurable Risk Score Formula Engine

**Status:** Accepted
**Date:** 2026-06-20
**Feature:** PM6-SCORING

---

## Context

Risk scores have always been hardcoded as `likelihood.numericValue * impact.numericValue` inside
`scoring.service.ts`. Register Admins have no way to define an alternative calculation.

A separate formula evaluator (`formulaEvaluator.service.ts`) already exists and is used by
calculated custom fields (PM5-05). That evaluator supports arithmetic operators, parentheses, math
functions, numeric literals, `{field:uuid}` custom-field references, and the built-in variables
`{likelihood}`, `{impact}`, and `{score}` via `FormulaContext`. It is a full recursive-descent
parser with clear separation between tokenisation, parsing, and evaluation.

A future release (PM6-CORE) will introduce inherent/residual scoring, which will require the same
formula engine applied to two distinct score slots per risk. The architecture must accommodate this
without rework.

---

## Decision

Extend the existing `formulaEvaluator.service.ts` to serve the register-level scoring formula by
introducing a simpler, canonical variable syntax (`likelihood`, `impact`, and custom field short
keys) alongside a dedicated `ScoringFormulaContext`. The formula string is stored in the config
snapshot (and reflected into a new column on the `Register` table). Recalculation is triggered
inside the existing `publishDraft` transaction in `configVersion.service.ts`, modelled after the
existing `recalculateRiskLevels` call.

The existing `{likelihood}`, `{impact}` built-in references in the evaluator already resolve
correctly via `FormulaContext`. The scoring formula uses the same syntax, so no new token types
are needed. A dedicated `validateScoringFormula` helper (thin wrapper around the existing
`validateFormula`) limits the allowed variable set to scoring-legal variables, rejecting
`{score}` (to prevent circular references) and `{field:uuid}` references (not applicable at the
register level; custom fields are referenced by their `fieldKey` instead — see design document).

---

## Consequences

**Positive:**
- No new parsing or evaluation infrastructure. The existing battle-tested parser handles all
  formula syntax.
- Inherent/residual scoring (PM6-CORE) reuses the same evaluator with a different context object;
  no structural change needed.
- Formula is stored in the snapshot, so config version history captures formula changes alongside
  all other config changes.
- `likelihood * impact` as the default means existing registers produce identical scores after
  migration.

**Negative / Trade-offs:**
- `formulaEvaluator.service.ts` was written for calculated custom fields and uses `{likelihood}`,
  `{impact}` as curly-brace built-ins. The scoring formula uses the same syntax, which is
  consistent but means the UI must surface the exact token syntax to the user, not plain
  identifier names.
- Bulk recalculation runs inside the publish transaction. For registers with large numbers of
  risks this extends the transaction duration. This is acceptable for v1.17.0 (same pattern as
  `recalculateRiskLevels`) and can be moved to a background job in a future release if needed.

---

## Alternatives Considered

**Store formula on `Register` table only, not in the snapshot.**
Rejected. The snapshot must be self-contained so that published config versions are auditable and
reproducible. The formula belongs in the snapshot alongside `likelihoodValues`, `impactValues`,
and matrix cells.

**Introduce a new plain-identifier syntax (`likelihood`, `impact`) instead of `{likelihood}`.**
Rejected. The existing evaluator already handles `{likelihood}` and `{impact}`. Introducing a
second syntax would require forking the tokeniser, creating two incompatible formula dialects in
the same codebase. Consistency with the existing PM5-05 formula syntax is preferable.

**Evaluate asynchronously outside the transaction.**
Rejected for this release. The synchronous in-transaction pattern is already established by
`recalculateRiskLevels`. Async evaluation adds complexity (partial state, retry logic) that is
not warranted at current scale.
