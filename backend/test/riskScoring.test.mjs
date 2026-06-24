/**
 * Risk scoring and ID formatting unit tests.
 *
 * Covers calculateRiskScore (matrix lookup), calculateNextReviewDate
 * (interval arithmetic), formatRiskId (prefix and zero-padding), and
 * the updateRiskSchema validator. These functions are pure or near-pure
 * and tested without a database connection.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  calculateNextReviewDate,
  calculateRiskScore
} from "../src/services/scoring.service.ts";
import { evaluateFormula } from "../src/services/formulaEvaluator.service.ts";
import { formatRiskId } from "../src/utils/riskId.ts";
import { updateRiskSchema } from "../src/validators/risks.schemas.ts";

test("risk ID formatting follows prefix and zero-padding settings", () => {
  assert.equal(
    formatRiskId(1, { riskIdPrefix: null, riskIdZeroPaddingEnabled: false, riskIdZeroPaddingWidth: 4 }),
    "1"
  );
  assert.equal(
    formatRiskId(42, { riskIdPrefix: "RISK", riskIdZeroPaddingEnabled: false, riskIdZeroPaddingWidth: 4 }),
    "RISK-42"
  );
  assert.equal(
    formatRiskId(42, { riskIdPrefix: null, riskIdZeroPaddingEnabled: true, riskIdZeroPaddingWidth: 4 }),
    "0042"
  );
  assert.equal(
    formatRiskId(1, { riskIdPrefix: "SEC", riskIdZeroPaddingEnabled: true, riskIdZeroPaddingWidth: 4 }),
    "SEC-0001"
  );
});

test("risk score is calculated from likelihood times impact", () => {
  assert.equal(calculateRiskScore(3, 5).toString(), "15");
});

test("updateRiskSchema strips riskScore and riskLevelId — calculated fields cannot be set by users", () => {
  const parsed = updateRiskSchema.parse({
    title: "Test risk",
    riskScore: 99,
    riskLevelId: "00000000-0000-0000-0000-000000000001"
  });

  assert.equal("riskScore" in parsed, false, "riskScore must not be present in parsed output");
  assert.equal("riskLevelId" in parsed, false, "riskLevelId must not be present in parsed output");
  assert.equal(parsed.title, "Test risk");
});

test("resolveRiskScoring reads scoringFormula from register and uses evaluateFormula", async () => {
  const scoring = await readFile(new URL("../src/services/scoring.service.ts", import.meta.url), "utf8");

  // Must fetch scoringFormula from the register row
  assert.match(scoring, /scoringFormula/);
  // Must call evaluateFormula with the effective formula and context
  assert.match(scoring, /evaluateFormula\(effectiveFormula, ctx\)/);
  // Must default to likelihood * impact when formula is empty
  assert.match(scoring, /\{likelihood\} \* \{impact\}/);
});

test("resolveRiskScoring in risks.service passes riskId on update", async () => {
  // MAINT-018: update logic lives in risks.mutation.service.ts.
  const service = await readFile(new URL("../src/services/risks.mutation.service.ts", import.meta.url), "utf8");

  // updateRisk must pass riskId as the third argument to resolveRiskScoring
  assert.match(service, /resolveRiskScoring\(\s*\{[^}]*registerId[^}]*\},\s*tx,\s*riskId\s*\)/);
});

test("non-default formula addition produces likelihood + impact, not likelihood * impact", () => {
  const ctx = { likelihood: 3, impact: 5, score: null, fieldValues: {} };

  const addResult = evaluateFormula("{likelihood} + {impact}", ctx);
  assert.equal(addResult, 8, "addition formula should return 3 + 5 = 8");

  const mulResult = evaluateFormula("{likelihood} * {impact}", ctx);
  assert.equal(mulResult, 15, "default multiply formula should return 3 * 5 = 15");

  // The two formulas must produce different results to confirm the formula is actually respected
  assert.notEqual(addResult, mulResult, "different formulas must produce different scores");
});

test("next review date follows register review settings", () => {
  assert.equal(
    calculateNextReviewDate({
      reviewsEnabled: false,
      baseDate: new Date("2026-05-04T00:00:00.000Z"),
      defaultReviewFrequencyMonths: 12
    }),
    null
  );
  assert.equal(
    calculateNextReviewDate({
      reviewsEnabled: true,
      baseDate: new Date("2026-05-04T00:00:00.000Z"),
      defaultReviewFrequencyMonths: 12
    })?.toISOString(),
    "2027-05-04T00:00:00.000Z"
  );
});
