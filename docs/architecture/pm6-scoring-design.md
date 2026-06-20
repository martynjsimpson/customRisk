# PM6-SCORING: Configurable Risk Score Formula Engine — Technical Design

**Status:** Approved for implementation (v1.17.0)
**Owner:** Principal Architect
**ADR:** ADR-0010

---

## 1. Schema Change

### 1a. New column on `Register`

Add a `scoringFormula` field to the `Register` model in `backend/prisma/schema.prisma`:

```
scoringFormula  String  @default("") @map("scoring_formula") @db.Text
```

The default is `""` (empty string). An empty formula means "use the system default", which is
`{likelihood} * {impact}`. This avoids a nullable column and keeps the migration non-breaking.
Existing registers behave identically to today.

**Migration:** A single Prisma migration adds the column. No data backfill is needed. Existing
registers with `""` will have `{likelihood} * {impact}` applied by the service layer at
evaluation time.

### 1b. Config snapshot extension

Add `scoringFormula: string` to `ConfigSnapshotRegisterSettings` in
`backend/src/types/configSnapshot.ts`:

```typescript
export interface ConfigSnapshotRegisterSettings {
  // ... existing fields ...
  scoringFormula: string;   // "" means use default: {likelihood} * {impact}
}
```

The `buildSnapshotFromRelationalTables` function in `configVersion.service.ts` must include this
field in its `register` select and mapping. The `normalizeSnapshot` helper must set
`scoringFormula: snapshot.register.scoringFormula ?? ""` to handle existing snapshots that
predate this field.

### 1c. Draft patch

`UpdateDraftBody` (in `backend/src/validators/configVersion.schemas.ts`) already allows patching
`register` as a partial object. `scoringFormula` must be added to the `register` sub-schema so
it can be saved to the draft. No new endpoint is needed.

---

## 2. Formula Evaluator

`backend/src/services/formulaEvaluator.service.ts` already exists and is fully capable. It must
not be modified for this feature — it is used as-is.

The existing public API:

```typescript
evaluateFormula(formula: string, ctx: FormulaContext): number
validateFormula(formula: string): { valid: boolean; error?: string }
```

`FormulaContext` already carries `likelihood`, `impact`, and `fieldValues`. This is exactly what
the scoring engine needs.

### New function: `validateScoringFormula`

Add a **new exported function** to `formulaEvaluator.service.ts`:

```typescript
export function validateScoringFormula(
  formula: string,
  availableFieldKeys: string[]   // field definition IDs for numeric custom fields in this register
): { valid: boolean; error?: string }
```

This function:

1. Calls the existing `validateFormula` internally with a context where all `availableFieldKeys`
   resolve to `0`, `likelihood = 0`, `impact = 0`.
2. Before calling `validateFormula`, scans the formula for `{score}` — if found, returns
   `{ valid: false, error: "The {score} variable cannot be used in a scoring formula (circular reference)" }`.
3. The formula may reference `{likelihood}`, `{impact}`, numeric literals, arithmetic operators,
   parentheses, and `{field:uuid}` references where the UUID is the ID of a `NUMBER` or
   `CALCULATED` type `CustomFieldDefinition` belonging to this register.

The purpose of this wrapper is to give a clear error message specific to the scoring context
rather than the generic validator's output.

---

## 3. Variable Binding

At evaluation time the `ScoringFormulaContext` passed to `evaluateFormula` is:

```typescript
{
  likelihood: number,   // LikelihoodValue.numericValue for this risk (as JS number)
  impact: number,       // ImpactValue.numericValue for this risk (as JS number)
  score: null,          // always null — {score} is invalid in a scoring formula
  fieldValues: Record<string, number | null>
    // key = CustomFieldDefinition.id (UUID)
    // value = RiskCustomFieldValue.numberValue for NUMBER fields,
    //         or parsed float of RiskCustomFieldValue.textValue for CALCULATED fields
    //         null if no value recorded for this risk
}
```

### How field values are resolved for a risk during bulk recalculation

When recalculating all risks in a register after publish:

1. Fetch all `CustomFieldDefinition` records in the register where `fieldType` is `NUMBER` or
   `CALCULATED` and `isActive` is `true`.
2. Fetch all `RiskCustomFieldValue` records for the register where
   `customFieldDefinitionId IN (ids from step 1)`.
3. Build an in-memory map: `Map<riskId, Map<fieldDefinitionId, number | null>>`.
4. For each risk, construct its `FormulaContext` from the map.

This means two queries plus a flat traversal — no per-risk database queries during the loop.

---

## 4. Recalculation on Publish

### Call site

`backend/src/services/configVersion.service.ts`, inside the `publishDraft` function, **after**
the existing `recalculateRiskLevels` call and **before** the `register.update` that promotes the
draft to current. The existing `recalculateRiskLevels` may change `riskLevelId` values; the score
recalculation must come after so both changes are applied in a single transaction pass.

### New function: `recalculateRiskScores`

Create this function in **`backend/src/services/scoring.service.ts`** (alongside the existing
`resolveRiskScoring` and `calculateRiskScore`):

```typescript
export async function recalculateRiskScores(
  actor: AuthenticatedActor,
  registerId: string,
  formula: string,       // "" means use default
  tx: Prisma.TransactionClient
): Promise<number>       // returns count of risks updated
```

Internal logic:

1. Resolve the effective formula: if `formula === ""` use `"{likelihood} * {impact}"`.
2. Validate the effective formula via `validateScoringFormula`. If invalid, throw an internal
   error (this should never happen at publish time because the draft save also validates).
3. Fetch all non-CLOSED risks for the register including their `likelihoodValue.numericValue`
   and `impactValue.numericValue`. Use a single query with `include`:
   ```
   risks = tx.risk.findMany({
     where: { registerId, state: { not: "CLOSED" } },
     select: {
       id: true, displayRiskId: true, riskScore: true,
       likelihoodValue: { select: { numericValue: true } },
       impactValue: { select: { numericValue: true } }
     }
   })
   ```
4. Fetch numeric custom field values (two queries, as described in section 3).
5. For each risk, evaluate the formula. Compare to the stored `riskScore`.
6. If different, update `Risk.riskScore` and emit an audit event with action
   `auditActions.riskUpdated`, summary `"Risk score recalculated due to scoring formula change"`,
   and a `fieldChanges` entry for `riskScore` (field label `"Risk score"`, value type `NUMBER`,
   previous = old decimal as string, new = new decimal as string).
7. Return the count of updated risks.

### Wiring in `publishDraft`

After the existing `recalculateRiskLevels` call, add:

```typescript
const scoreFormula = snapshot.register.scoringFormula ?? "";
const scoresUpdated = await recalculateRiskScores(
  { id: actorId, name: actorName, email: actorEmail, isSystemAdmin: true, isActive: true },
  registerId,
  scoreFormula,
  tx
);
```

Pass `scoresUpdated` into the existing `configPublished` audit event's `metadataJson` alongside
`affectedRisks` and `warningCount`.

### Impact analysis gate

In `analyseImpact`, add a formula validation check:

- Read `snapshot.register.scoringFormula`.
- If non-empty, call `validateScoringFormula`. If invalid, push a blocker:
  `"Scoring formula is invalid: <error message>"`.

This ensures publish is blocked if the stored formula is malformed.

---

## 5. Audit

No new audit object type or action is required. Use the existing `riskUpdated` action (same as
`recalculateRiskLevels`). The distinguishing text is in the `summary` field:
`"Risk score recalculated due to scoring formula change"`.

The `configPublished` event's `metadataJson` is extended with `scoresRecalculated: number` (count
of risks whose score changed). This gives audit readers a top-level signal that a formula change
took effect.

---

## 6. Inherent/Residual Reuse (PM6-CORE path)

When PM6-CORE introduces inherent and residual scoring:

- `recalculateRiskScores` becomes the foundation. PM6-CORE will call it twice (or a parameterised
  variant) — once for the inherent formula and once for the residual formula.
- The `FormulaContext` interface already has `score?: number | null`. PM6-CORE can bind the
  inherent score into `score` when evaluating the residual formula (if the product decides
  residual can depend on inherent).
- The `validateScoringFormula` wrapper will need to accept a `scopeLabel` parameter
  (`"inherent"` or `"residual"`) and adjust its `{score}` circular-reference check accordingly.
- The config snapshot will need two formula fields: `inherentScoringFormula` and
  `residualScoringFormula`. This is a straightforward additive snapshot extension.
- No changes to the parser or evaluator are needed.

The one refactor that PM6-CORE should plan for: `recalculateRiskScores` should accept a
`scoreFieldName: "riskScore" | "inherentScore" | "residualScore"` parameter so the same loop
body writes to the correct `Risk` column. For v1.17.0, this parameter is omitted and the
function always writes `riskScore`.

---

## 7. Frontend Contract

### API changes (existing endpoints, new fields only)

**GET `/api/v1/registers/:id/config/status`** and **GET `/api/v1/registers/:id/config/versions`**

The `snapshotJson` object now includes `register.scoringFormula: string`. The frontend must read
this field from the draft snapshot to populate the formula editor.

**PATCH `/api/v1/registers/:id/config/draft`**

The `register` body field already accepts partial updates. The frontend sends:
```json
{ "register": { "scoringFormula": "{likelihood} * {impact}" } }
```

**GET `/api/v1/registers/:id/config/analyse-impact`** (POST in implementation)

The response already includes `blockers: string[]`. A formula validation failure appears there.
No shape change needed.

**GET `/api/v1/registers/:id`** (register detail)

The `scoringFormula` field from the `Register` table should be included in the register response
so the frontend can display the currently active formula (from the live register, not the draft).
The backend developer must add `scoringFormula` to the register select in the registers router.

### No new endpoints

All communication goes through the existing draft patch and config status endpoints. No new
routes are needed.

### Available variables for the formula editor UI

The frontend formula editor must show the user what variables they can use. The backend should
expose this in the existing register config response or as a fixed set documented here:

- `{likelihood}` — the numeric value of the selected likelihood
- `{impact}` — the numeric value of the selected impact
- `{field:<uuid>}` — a NUMBER or CALCULATED custom field, where `<uuid>` is the field's
  definition ID

The frontend fetches the list of numeric custom fields from the existing
`GET /api/v1/registers/:id/fields` endpoint (or equivalent) to build the variable picker.

---

## File Change Summary for Implementers

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add `scoringFormula String @default("") @map("scoring_formula") @db.Text` to `Register` model |
| `backend/prisma/migrations/` | New migration created by `prisma migrate dev` |
| `backend/src/types/configSnapshot.ts` | Add `scoringFormula: string` to `ConfigSnapshotRegisterSettings` |
| `backend/src/services/configVersion.service.ts` | `normalizeSnapshot`: default `scoringFormula` to `""`. `buildSnapshotFromRelationalTables`: include `scoringFormula` in select and mapping. `analyseImpact`: validate formula, add as blocker if invalid. `publishDraft`: call `recalculateRiskScores` after `recalculateRiskLevels`; extend `metadataJson` with `scoresRecalculated` |
| `backend/src/services/formulaEvaluator.service.ts` | Add exported `validateScoringFormula` function |
| `backend/src/services/scoring.service.ts` | Add exported `recalculateRiskScores` function |
| `backend/src/validators/configVersion.schemas.ts` | Add `scoringFormula: z.string().optional()` to the `register` sub-schema in `UpdateDraftBody` |
| `backend/src/routes/registers.ts` (or equivalent) | Include `scoringFormula` in the register response select |
| `frontend/src/features/configuration/ScoringConfigurationPanel.tsx` | Add a "Formula" tab containing the formula editor component |
| `shared/src/types/index.ts` | Extend relevant shared register/config types with `scoringFormula` if they are consumed by the frontend |
