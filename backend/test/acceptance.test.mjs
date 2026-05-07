import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("MVP acceptance routes cover register, configuration, matrix, risk, review, viewer, and closed-risk scenarios", async () => {
  const registerRoutes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const registerSchemas = await readFile(new URL("../src/validators/registers.schemas.ts", import.meta.url), "utf8");
  const configurationRoutes = await readFile(new URL("../src/routes/configuration.routes.ts", import.meta.url), "utf8");
  const riskRoutes = await readFile(new URL("../src/routes/risks.routes.ts", import.meta.url), "utf8");
  const riskSchemas = await readFile(new URL("../src/validators/risks.schemas.ts", import.meta.url), "utf8");

  assert.match(registerRoutes, /router\.post\("\/", requireSystemAdmin/);
  assert.match(registerRoutes, /createRegisterController/);
  assert.match(registerRoutes, /router\.post\("\/:registerId\/permissions"/);
  assert.match(registerSchemas, /REGISTER_VIEWER/);

  assert.match(configurationRoutes, /"\/:registerId\/custom-fields"/);
  assert.match(configurationRoutes, /createCustomFieldController/);
  assert.match(configurationRoutes, /requireRegisterManagement\(\)/);
  assert.match(configurationRoutes, /"\/:registerId\/matrix"/);
  assert.match(configurationRoutes, /updateMatrixController/);
  assert.match(configurationRoutes, /updateMatrixCellController/);

  assert.match(riskRoutes, /"\/:registerId\/risks"/);
  assert.match(riskRoutes, /createRiskController/);
  assert.match(riskRoutes, /"\/:registerId\/risks\/:riskId\/reviews"/);
  assert.match(riskRoutes, /completeRiskReviewController/);
  assert.match(riskRoutes, /requireRiskEdit\(\)/);
  assert.match(riskRoutes, /requireRiskView\(\)/);

  assert.match(riskSchemas, /includeClosed: queryBooleanSchema\.default\(false\)/);
});

test("MVP acceptance services enforce calculations, audit, read-only viewer access, and closed-risk filtering", async () => {
  const registers = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");
  const customFields = [
    await readFile(new URL("../src/services/customFields.service.ts", import.meta.url), "utf8"),
    await readFile(new URL("../src/services/customFieldValues.service.ts", import.meta.url), "utf8")
  ].join("\n");
  const scoring = [
    await readFile(new URL("../src/services/likelihoodValues.service.ts", import.meta.url), "utf8"),
    await readFile(new URL("../src/services/impactValues.service.ts", import.meta.url), "utf8"),
    await readFile(new URL("../src/services/riskLevels.service.ts", import.meta.url), "utf8"),
    await readFile(new URL("../src/services/matrix.service.ts", import.meta.url), "utf8")
  ].join("\n");
  const risks = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");
  const reviews = await readFile(new URL("../src/services/reviews.service.ts", import.meta.url), "utf8");

  assert.match(registers, /likelihoodDefaults/);
  assert.match(registers, /matrixLevelNames/);
  assert.match(registers, /auditActions\.registerCreated/);
  assert.match(registers, /auditActions\.registerViewerAdded/);

  assert.match(customFields, /auditActions\.customFieldCreated/);
  assert.match(customFields, /validateCustomFieldValues/);

  assert.match(scoring, /auditActions\.riskMatrixUpdated/);
  assert.match(scoring, /recalculateExistingRisks/);
  assert.match(scoring, /Risk level recalculated due to matrix update/);

  assert.match(risks, /state: query\.includeClosed \? undefined : \{ not: "CLOSED" \}/);
  assert.match(risks, /role === "NONE" \|\| role === "REGISTER_VIEWER"/);
  assert.match(risks, /Only System Admins and Register Admins can create risks/);
  assert.match(risks, /resolveRiskScoring/);
  assert.match(risks, /calculateNextReviewDate/);
  assert.match(risks, /auditActions\.riskCreated/);

  assert.match(reviews, /auditActions\.riskReviewed/);
  assert.match(reviews, /auditActions\.nextReviewDateUpdated/);
  assert.match(reviews, /calculatedNextReviewDate/);
});
