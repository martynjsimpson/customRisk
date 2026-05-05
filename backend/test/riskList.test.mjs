import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { getRiskReviewStatus } from "../src/services/risks.service.ts";

test("risk list route is mounted under register risk collection", async () => {
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/risks.controller.ts", import.meta.url), "utf8");

  assert.match(routes, /"\/:registerId\/risks"/);
  assert.match(routes, /listRisksQuerySchema/);
  assert.match(routes, /requireRegisterAccess\(\)/);
  assert.match(controller, /listRisks\(actorOrThrow\(request\), request\.params\.registerId, request\.query\)/);
});

test("risk create route is mounted under register risk collection", async () => {
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/risks.controller.ts", import.meta.url), "utf8");

  assert.match(routes, /router\.post\(\n\s+"\/:registerId\/risks"/);
  assert.match(routes, /body: createRiskSchema/);
  assert.match(controller, /createRisk\(actorOrThrow\(request\), request\.params\.registerId, request\.body\)/);
});

test("risk detail route uses risk view permission and controller", async () => {
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/risks.controller.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  assert.match(routes, /"\/:registerId\/risks\/:riskId"/);
  assert.match(routes, /requireRiskView\(\)/);
  assert.match(controller, /getRiskDetail\(actorOrThrow\(request\), request\.params\.registerId, request\.params\.riskId\)/);
  assert.match(service, /customFieldValues:\s*\{\n\s*include:/);
  assert.match(service, /reviewStatus: getRiskReviewStatus/);
});

test("risk review status follows MVP display rules", () => {
  const today = new Date("2026-05-05T00:00:00.000Z");

  assert.equal(
    getRiskReviewStatus({
      reviewsEnabled: false,
      lastReviewedAt: null,
      nextReviewDate: null,
      today
    }),
    "NOT_REQUIRED"
  );
  assert.equal(
    getRiskReviewStatus({
      reviewsEnabled: true,
      lastReviewedAt: null,
      nextReviewDate: new Date("2026-05-01T00:00:00.000Z"),
      today
    }),
    "NOT_REVIEWED"
  );
  assert.equal(
    getRiskReviewStatus({
      reviewsEnabled: true,
      lastReviewedAt: new Date("2026-04-01T00:00:00.000Z"),
      nextReviewDate: new Date("2026-05-01T00:00:00.000Z"),
      today
    }),
    "OVERDUE"
  );
  assert.equal(
    getRiskReviewStatus({
      reviewsEnabled: true,
      lastReviewedAt: new Date("2026-04-01T00:00:00.000Z"),
      nextReviewDate: new Date("2026-05-30T00:00:00.000Z"),
      today
    }),
    "DUE_SOON"
  );
  assert.equal(
    getRiskReviewStatus({
      reviewsEnabled: true,
      lastReviewedAt: new Date("2026-04-01T00:00:00.000Z"),
      nextReviewDate: new Date("2026-07-01T00:00:00.000Z"),
      today
    }),
    "NOT_DUE"
  );
});
