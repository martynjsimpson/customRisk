/**
 * Formula evaluator unit tests.
 *
 * Covers arithmetic, field references, score/likelihood/impact variables,
 * error handling for invalid expressions, and the validateFormula helper.
 * These tests drive formulaEvaluator.service.ts directly without a database.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateFormula, validateFormula, FormulaEvaluationError } from "../src/services/formulaEvaluator.service.ts";

const ctx = (extras = {}) => ({
  fieldValues: { "00000000-0000-0000-0000-000000000001": 10, "00000000-0000-0000-0000-000000000002": 4 },
  score: 40,
  likelihood: 5,
  impact: 8,
  ...extras
});

test("evaluates simple arithmetic", () => {
  assert.equal(evaluateFormula("2 + 3", ctx()), 5);
  assert.equal(evaluateFormula("10 - 4", ctx()), 6);
  assert.equal(evaluateFormula("3 * 4", ctx()), 12);
  assert.equal(evaluateFormula("15 / 3", ctx()), 5);
});

test("respects operator precedence", () => {
  assert.equal(evaluateFormula("2 + 3 * 4", ctx()), 14);
  assert.equal(evaluateFormula("(2 + 3) * 4", ctx()), 20);
});

test("evaluates field references", () => {
  assert.equal(evaluateFormula("{field:00000000-0000-0000-0000-000000000001}", ctx()), 10);
  assert.equal(evaluateFormula("{field:00000000-0000-0000-0000-000000000001} + {field:00000000-0000-0000-0000-000000000002}", ctx()), 14);
});

test("evaluates built-in references", () => {
  assert.equal(evaluateFormula("{score}", ctx()), 40);
  assert.equal(evaluateFormula("{likelihood} * {impact}", ctx()), 40);
  assert.equal(evaluateFormula("{score} / {likelihood}", ctx()), 8);
});

test("evaluates math functions", () => {
  assert.equal(evaluateFormula("round(3.7)", ctx()), 4);
  assert.equal(evaluateFormula("ceil(3.1)", ctx()), 4);
  assert.equal(evaluateFormula("floor(3.9)", ctx()), 3);
  assert.equal(evaluateFormula("abs(-5)", ctx()), 5);
  assert.equal(evaluateFormula("min(3, 7)", ctx()), 3);
  assert.equal(evaluateFormula("max(3, 7)", ctx()), 7);
});

test("handles unary negation", () => {
  assert.equal(evaluateFormula("-5 + 10", ctx()), 5);
  assert.equal(evaluateFormula("-(3 + 2)", ctx()), -5);
});

test("null field values default to 0", () => {
  const nullCtx = { fieldValues: { "00000000-0000-0000-0000-000000000001": null }, score: null, likelihood: null, impact: null };
  assert.equal(evaluateFormula("{field:00000000-0000-0000-0000-000000000001} + 1", nullCtx), 1);
  assert.equal(evaluateFormula("{score} + 5", nullCtx), 5);
});

test("throws on division by zero", () => {
  assert.throws(() => evaluateFormula("10 / 0", ctx()), FormulaEvaluationError);
});

test("throws on unknown field", () => {
  assert.throws(() => evaluateFormula("{field:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa}", ctx()), FormulaEvaluationError);
});

test("throws on syntax error", () => {
  assert.throws(() => evaluateFormula("2 + + 3", ctx()), FormulaEvaluationError);
  assert.throws(() => evaluateFormula("foo(1)", ctx()), FormulaEvaluationError);
});

test("validateFormula approves valid formulas", () => {
  assert.equal(validateFormula("{field:00000000-0000-0000-0000-000000000001} * 2").valid, true);
  assert.equal(validateFormula("round({score} / 10)").valid, true);
  assert.equal(validateFormula("42").valid, true);
});

test("validateFormula rejects invalid formulas", () => {
  const result = validateFormula("2 ++");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("CALCULATED field evaluation is wired into risk create/update", async () => {
  const { readFile } = await import("node:fs/promises");
  const risksService = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  assert.match(risksService, /evaluateAndStoreCalculatedFields/);
  assert.match(risksService, /formulaEvaluator\.service/);
  // Called after multi-select entries on both create and update paths
  assert.ok(risksService.match(/evaluateAndStoreCalculatedFields/g)?.length ?? 0 >= 2);
});
