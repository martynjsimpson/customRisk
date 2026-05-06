import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { getRiskReviewStatus, isRiskOverdue } from "../src/services/risks.service.ts";
import { listRisksQuerySchema } from "../src/validators/risks.schemas.ts";

test("risk list route is mounted under register risk collection", async () => {
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/risks.controller.ts", import.meta.url), "utf8");

  assert.match(routes, /"\/:registerId\/risks"/);
  assert.match(routes, /listRisksQuerySchema/);
  assert.match(routes, /requireRegisterAccess\(\)/);
  assert.match(controller, /listRisks\(actorOrThrow\(request\), request\.params\.registerId, request\.query\)/);
});

test("risk list query parses boolean strings explicitly", () => {
  assert.equal(listRisksQuerySchema.parse({ includeClosed: "false" }).includeClosed, false);
  assert.equal(listRisksQuerySchema.parse({ includeClosed: "true" }).includeClosed, true);
  assert.equal(listRisksQuerySchema.parse({ overdue: "false" }).overdue, false);
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

test("risk update route uses risk edit permission and audited service", async () => {
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/risks.controller.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  assert.match(routes, /router\.patch\(\n\s+"\/:registerId\/risks\/:riskId"/);
  assert.match(routes, /requireRiskEdit\(\)/);
  assert.match(routes, /body: updateRiskSchema/);
  assert.match(controller, /updateRisk\(\n\s+actorOrThrow\(request\)/);
  assert.match(service, /Risk Owners cannot edit Created Date/);
  assert.match(service, /action: auditActions\.riskUpdated/);
  assert.match(service, /fieldChanges: buildRiskUpdateFieldChanges/);
});

test("risk delete route requires system admin and writes snapshot", async () => {
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/risks.controller.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  assert.match(routes, /router\.delete\(\n\s+"\/:registerId\/risks\/:riskId"/);
  assert.match(routes, /body: deleteRiskSchema/);
  assert.match(routes, /requireSystemAdmin/);
  assert.match(controller, /deleteRisk\(\n\s+actorOrThrow\(request\)/);
  assert.match(service, /action: auditActions\.riskDeleted/);
  assert.match(service, /auditRiskSnapshot\.create/);
  assert.match(service, /await tx\.risk\.delete/);
});

test("risk export route is mounted before risk detail and audited", async () => {
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/risks.controller.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/export.service.ts", import.meta.url), "utf8");

  assert.ok(routes.indexOf('"/:registerId/risks/export"') < routes.indexOf('"/:registerId/risks/:riskId"'));
  assert.match(routes, /requireExportAccess\(\)/);
  assert.match(controller, /Content-Disposition/);
  assert.match(service, /exportJob\.create/);
  assert.match(service, /action: auditActions\.riskExportGenerated/);
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

test("risk overdue helper follows operational overdue rules", () => {
  const today = new Date("2026-05-05T00:00:00.000Z");

  assert.equal(
    isRiskOverdue({
      reviewsEnabled: true,
      nextReviewDate: new Date("2026-05-01T00:00:00.000Z"),
      state: "OPEN",
      today
    }),
    true
  );
  assert.equal(
    isRiskOverdue({
      reviewsEnabled: true,
      nextReviewDate: new Date("2026-05-01T00:00:00.000Z"),
      state: "CLOSED",
      today
    }),
    false
  );
  assert.equal(
    isRiskOverdue({
      reviewsEnabled: false,
      nextReviewDate: new Date("2026-05-01T00:00:00.000Z"),
      state: "OPEN",
      today
    }),
    false
  );
});

test("review filters and register counts use shared overdue rules", async () => {
  const riskService = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");
  const registerService = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");
  const reviewStatusService = await readFile(new URL("../src/services/reviewStatus.service.ts", import.meta.url), "utf8");

  assert.match(reviewStatusService, /dueSoonWindowDays = 30/);
  assert.match(riskService, /query\.overdue/);
  assert.match(riskService, /where\.id = "__no_risks_when_reviews_disabled__"/);
  assert.match(riskService, /isRiskOverdue/);
  assert.match(registerService, /state: \{ not: "CLOSED" \}/);
  assert.match(registerService, /register: \{ reviewsEnabled: true \}/);
});
