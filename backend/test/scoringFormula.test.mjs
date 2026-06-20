/**
 * Tests for PM6-SCORING: validateScoringFormula
 *
 * Tests the new validateScoringFormula function added to formulaEvaluator.service.ts.
 * Integration tests for recalculateRiskScores and the validate-formula endpoint are
 * in configVersion.test.mjs and riskScoring.test.mjs respectively.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { validateScoringFormula } from "../src/services/formulaEvaluator.service.ts";

const FIELD_A = "00000000-0000-0000-0000-000000000001";
const FIELD_B = "00000000-0000-0000-0000-000000000002";

// ─── Empty formula ────────────────────────────────────────────────────────────

test("validateScoringFormula: empty string is valid (means use default)", () => {
  const result = validateScoringFormula("", []);
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

// ─── Valid formulas ───────────────────────────────────────────────────────────

test("validateScoringFormula: default formula {likelihood} * {impact} is valid", () => {
  const result = validateScoringFormula("{likelihood} * {impact}", []);
  assert.equal(result.valid, true);
});

test("validateScoringFormula: arithmetic on built-ins is valid", () => {
  const result = validateScoringFormula("{likelihood} + {impact}", []);
  assert.equal(result.valid, true);
});

test("validateScoringFormula: formula using known field key is valid", () => {
  const result = validateScoringFormula(`{field:${FIELD_A}} * {likelihood}`, [FIELD_A, FIELD_B]);
  assert.equal(result.valid, true);
});

test("validateScoringFormula: formula using math functions is valid", () => {
  const result = validateScoringFormula("round({likelihood} * {impact})", []);
  assert.equal(result.valid, true);
});

test("validateScoringFormula: numeric literal formula is valid", () => {
  const result = validateScoringFormula("5", []);
  assert.equal(result.valid, true);
});

// ─── {score} circular reference ───────────────────────────────────────────────

test("validateScoringFormula: {score} reference is rejected (circular)", () => {
  const result = validateScoringFormula("{score}", []);
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes("circular"), `Expected circular error, got: ${result.error}`);
});

test("validateScoringFormula: {score} in expression is rejected", () => {
  const result = validateScoringFormula("{score} * {likelihood}", []);
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes("{score}"), `Expected {score} mention, got: ${result.error}`);
});

test("validateScoringFormula: case-insensitive {SCORE} is rejected", () => {
  const result = validateScoringFormula("{SCORE} + 1", []);
  assert.equal(result.valid, false);
});

// ─── Invalid syntax ───────────────────────────────────────────────────────────

test("validateScoringFormula: garbled syntax returns invalid", () => {
  const result = validateScoringFormula("likelihood ** impact", []);
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateScoringFormula: unmatched parenthesis returns invalid", () => {
  const result = validateScoringFormula("({likelihood} * {impact}", []);
  assert.equal(result.valid, false);
});

test("validateScoringFormula: unknown variable returns invalid", () => {
  const result = validateScoringFormula("{field:00000000-0000-0000-0000-999999999999}", []);
  assert.equal(result.valid, false);
});

// ─── Field keys ───────────────────────────────────────────────────────────────

test("validateScoringFormula: formula referencing field not in availableFieldKeys is invalid", () => {
  // FIELD_A not in available keys
  const result = validateScoringFormula(`{field:${FIELD_A}}`, [FIELD_B]);
  assert.equal(result.valid, false);
});

test("validateScoringFormula: availableFieldKeys are case-insensitively matched", () => {
  const upperKey = FIELD_A.toUpperCase();
  const result = validateScoringFormula(`{field:${upperKey}}`, [FIELD_A]);
  assert.equal(result.valid, true);
});
