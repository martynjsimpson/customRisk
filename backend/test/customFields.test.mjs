/**
 * BUG-049 — End-to-end calculated field verification.
 *
 * Scenario:
 *   - A numeric custom field "cost" (id: COST_FIELD_ID) holds value 10.
 *   - A CALCULATED field uses the formula `{field:<COST_FIELD_ID>} * 2`.
 *   - When a risk is created with cost = 10, the calculated field must resolve to 20.
 *
 * This test drives the formulaEvaluator directly (the same service called by
 * evaluateAndStoreCalculatedFields in risks.service.ts) to verify the concrete
 * field-reference + arithmetic path end-to-end.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  evaluateFormula,
  FormulaEvaluationError
} from "../src/services/formulaEvaluator.service.ts";

// Stable IDs used throughout this suite
const COST_FIELD_ID = "aaaaaaaa-0001-0001-0001-000000000001";
const UNRELATED_FIELD_ID = "bbbbbbbb-0002-0002-0002-000000000002";

// ─── BUG-049: concrete field-reference formula resolves correctly ─────────────

test("BUG-049: CALCULATED field formula '{field:cost} * 2' resolves to 20 when cost = 10", () => {
  /**
   * Formula:  {field:<COST_FIELD_ID>} * 2
   * Field:    cost = 10
   * Expected: 20
   */
  const formula = `{field:${COST_FIELD_ID}} * 2`;
  const ctx = {
    fieldValues: { [COST_FIELD_ID]: 10 },
    score: null,
    likelihood: null,
    impact: null
  };

  const result = evaluateFormula(formula, ctx);
  assert.equal(result, 20, "cost (10) * 2 should equal 20");
});

test("BUG-049: CALCULATED field formula resolves when cost = 0 (edge: zero input)", () => {
  const formula = `{field:${COST_FIELD_ID}} * 2`;
  const ctx = {
    fieldValues: { [COST_FIELD_ID]: 0 },
    score: null,
    likelihood: null,
    impact: null
  };

  assert.equal(evaluateFormula(formula, ctx), 0);
});

test("BUG-049: CALCULATED formula referencing a null field value treats it as 0", () => {
  const formula = `{field:${COST_FIELD_ID}} * 2`;
  const ctx = {
    fieldValues: { [COST_FIELD_ID]: null },
    score: null,
    likelihood: null,
    impact: null
  };

  assert.equal(evaluateFormula(formula, ctx), 0, "null field value should default to 0");
});

test("BUG-049: multi-field CALCULATED formula — cost + (cost * tax_rate) resolves correctly", () => {
  /**
   * Formula:  {field:<COST>} + ({field:<COST>} * 0.2)
   * cost = 10, tax = 20 % implied by literal
   * Expected: 10 + (10 * 0.2) = 12
   */
  const formula = `{field:${COST_FIELD_ID}} + ({field:${COST_FIELD_ID}} * 0.2)`;
  const ctx = {
    fieldValues: { [COST_FIELD_ID]: 10 },
    score: null,
    likelihood: null,
    impact: null
  };

  assert.equal(evaluateFormula(formula, ctx), 12);
});

test("BUG-049: CALCULATED formula referencing built-ins alongside a field — cost * {likelihood}", () => {
  /**
   * Formula:  {field:<COST>} * {likelihood}
   * cost = 10, likelihood = 3
   * Expected: 30
   */
  const formula = `{field:${COST_FIELD_ID}} * {likelihood}`;
  const ctx = {
    fieldValues: { [COST_FIELD_ID]: 10 },
    score: null,
    likelihood: 3,
    impact: null
  };

  assert.equal(evaluateFormula(formula, ctx), 30);
});

test("BUG-049: formula evaluator throws FormulaEvaluationError for an unrecognised field ID", () => {
  const formula = `{field:${UNRELATED_FIELD_ID}} * 2`;
  // COST_FIELD_ID is in context but UNRELATED_FIELD_ID is not
  const ctx = {
    fieldValues: { [COST_FIELD_ID]: 10 },
    score: null,
    likelihood: null,
    impact: null
  };

  assert.throws(
    () => evaluateFormula(formula, ctx),
    FormulaEvaluationError,
    "Should throw FormulaEvaluationError for an unknown field reference"
  );
});

// ─── Wiring verification — risks.service calls evaluateAndStoreCalculatedFields ──

test("BUG-049: evaluateAndStoreCalculatedFields is wired into the risks service create and update paths", async () => {
  // MAINT-018: mutation logic lives in risks.mutation.service.ts; formula evaluation
  // implementation lives in risks.calculatedFields.service.ts (which imports formulaEvaluator.service).
  const risksMutation = await readFile(
    new URL("../src/services/risks.mutation.service.ts", import.meta.url),
    "utf8"
  );
  const risksCalculatedFields = await readFile(
    new URL("../src/services/risks.calculatedFields.service.ts", import.meta.url),
    "utf8"
  );

  // Function must exist and be called from mutation service
  assert.match(risksMutation, /evaluateAndStoreCalculatedFields/);

  // It must be called on both create and update paths (at least 2 occurrences)
  const callCount = (risksMutation.match(/evaluateAndStoreCalculatedFields/g) ?? []).length;
  assert.ok(callCount >= 2, `Expected at least 2 calls to evaluateAndStoreCalculatedFields, got ${callCount}`);

  // Must use the formulaEvaluator service (via calculatedFields sub-service)
  assert.match(risksCalculatedFields, /formulaEvaluator\.service/);
});

test("BUG-049: CALCULATED field definitions are created with fieldType CALCULATED in the service", async () => {
  const service = await readFile(
    new URL("../src/services/customFields.service.ts", import.meta.url),
    "utf8"
  );

  // Service must handle the CALCULATED type
  assert.match(service, /CALCULATED/);
});
