import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateNextReviewDate,
  calculateRiskScore
} from "../src/services/scoring.service.ts";
import { formatRiskId } from "../src/utils/riskId.ts";
import { updateRiskSchema } from "../src/validators/risks.schemas.ts";

test("risk ID formatting follows prefix and zero-padding settings", () => {
  assert.equal(
    formatRiskId(1, {
      riskIdPrefix: null,
      riskIdZeroPaddingEnabled: false,
      riskIdZeroPaddingWidth: 4
    }),
    "1"
  );
  assert.equal(
    formatRiskId(42, {
      riskIdPrefix: "RISK",
      riskIdZeroPaddingEnabled: false,
      riskIdZeroPaddingWidth: 4
    }),
    "RISK-42"
  );
  assert.equal(
    formatRiskId(42, {
      riskIdPrefix: null,
      riskIdZeroPaddingEnabled: true,
      riskIdZeroPaddingWidth: 4
    }),
    "0042"
  );
  assert.equal(
    formatRiskId(1, {
      riskIdPrefix: "SEC",
      riskIdZeroPaddingEnabled: true,
      riskIdZeroPaddingWidth: 4
    }),
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
