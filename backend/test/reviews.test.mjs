/**
 * Risk review route, schema, and service tests.
 *
 * Verifies that review routes are mounted before risk detail routes (ordering
 * matters for Express matching), that the create review schema validates
 * correctly, and that the service updates nextReviewDate and emits the
 * correct audit event on review creation.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { createRiskReviewSchema } from "../src/validators/risks.schemas.ts";

test("risk review routes are mounted before risk detail with view and edit permissions", async () => {
  const routes = await readFile(new URL("../src/routes/risks.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/reviews.controller.ts", import.meta.url), "utf8");

  assert.ok(
    routes.indexOf('"/:registerId/risks/:riskId/reviews"') <
      routes.indexOf('"/:registerId/risks/:riskId"')
  );
  assert.match(routes, /router\.get\(\s*"\/:registerId\/risks\/:riskId\/reviews"/);
  assert.match(routes, /requireRiskView\(\)/);
  assert.match(routes, /router\.post\(\s*"\/:registerId\/risks\/:riskId\/reviews"/);
  assert.match(routes, /body: createRiskReviewSchema/);
  assert.match(routes, /requireRiskEdit\(\)/);
  assert.match(controller, /listRiskReviews\(\n\s+actorOrThrow\(request\)/);
  assert.match(controller, /completeRiskReview\(\n\s+actorOrThrow\(request\)/);
});

test("risk review schema requires explicit confirmation and supports optional comment", () => {
  assert.deepEqual(createRiskReviewSchema.parse({ confirmed: true }), { confirmed: true });
  assert.deepEqual(createRiskReviewSchema.parse({ confirmed: true, comment: " Reviewed " }), {
    confirmed: true,
    comment: "Reviewed"
  });
  assert.throws(() => createRiskReviewSchema.parse({ confirmed: false }));
});

test("listRiskReviews enforces a hard cap of 100 records ordered by date descending", async () => {
  const service = await readFile(new URL("../src/services/reviews.service.ts", import.meta.url), "utf8");

  // The cap constant must be declared and set to 100
  assert.match(service, /RISK_REVIEW_HISTORY_CAP\s*=\s*100/);

  // listRiskReviews must include both take and orderBy in its query
  const fnStart = service.indexOf("export async function listRiskReviews");
  const fnEnd = service.indexOf("\nexport async function", fnStart + 1);
  const fnBody = service.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

  assert.match(fnBody, /take:\s*RISK_REVIEW_HISTORY_CAP/);
  assert.match(fnBody, /orderBy:\s*\{\s*reviewedAt:\s*"desc"/);
});

test("risk review creates a single RISK_REVIEWED audit event with next-review-date field change embedded", async () => {
  const service = await readFile(new URL("../src/services/reviews.service.ts", import.meta.url), "utf8");
  const actions = await readFile(new URL("../src/audit/auditActions.ts", import.meta.url), "utf8");

  assert.match(service, /reviewAttestationText/);
  assert.match(service, /attestationText: risk\.register\.reviewAttestationText/);
  assert.match(service, /lastReviewedAt: reviewedAt/);
  assert.match(service, /lastReviewedByUserId: actor\.id/);
  assert.match(service, /nextReviewDate: calculatedNextReviewDate/);
  assert.match(service, /action: auditActions\.riskReviewed/);
  assert.match(service, /objectType: "RISK_REVIEW"/);
  // Next-review-date detail is embedded in the RISK_REVIEWED event, not a separate event
  assert.doesNotMatch(service, /action: auditActions\.nextReviewDateUpdated/);
  assert.match(service, /fieldChanges/);
  assert.match(service, /fieldName: "nextReviewDate"/);
  assert.match(actions, /riskReviewed: "RISK_REVIEWED"/);
  assert.match(actions, /nextReviewDateUpdated: "NEXT_REVIEW_DATE_UPDATED"/);
});
