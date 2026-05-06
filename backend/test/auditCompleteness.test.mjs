import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("hard-delete snapshot preserves required risk context before deletion", async () => {
  const riskService = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");
  const snapshotBuilder = await readFile(new URL("../src/audit/snapshotBuilder.ts", import.meta.url), "utf8");

  assert.match(riskService, /buildRiskDeleteSnapshot\(risk, actor, input\.deletionReason\)/);
  assert.match(riskService, /action: auditActions\.riskDeleted/);
  assert.match(riskService, /auditRiskSnapshot\.create/);
  assert.ok(riskService.indexOf("auditRiskSnapshot.create") < riskService.indexOf("risk.delete"));

  for (const requiredKey of [
    "risk",
    "register",
    "owner",
    "scoring",
    "response",
    "customFields",
    "reviews",
    "systemMetadata",
    "deletion"
  ]) {
    assert.match(snapshotBuilder, new RegExp(`${requiredKey}:`));
  }

  for (const requiredField of [
    "displayRiskId",
    "riskSequence",
    "createdDate",
    "likelihood",
    "impact",
    "riskScore",
    "riskLevel",
    "lastReviewedAt",
    "nextReviewDate",
    "systemCreatedBy",
    "systemUpdatedBy",
    "deletedAt",
    "reason"
  ]) {
    assert.match(snapshotBuilder, new RegExp(`${requiredField}:`));
  }
});

test("key MVP mutating workflows write audit events and field changes where required", async () => {
  const users = await readFile(new URL("../src/services/users.service.ts", import.meta.url), "utf8");
  const registers = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");
  const risks = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");
  const reviews = await readFile(new URL("../src/services/reviews.service.ts", import.meta.url), "utf8");
  const customFields = await readFile(new URL("../src/services/customFields.service.ts", import.meta.url), "utf8");
  const scoring = await readFile(new URL("../src/services/scoringConfig.service.ts", import.meta.url), "utf8");
  const exports = await readFile(new URL("../src/services/export.service.ts", import.meta.url), "utf8");

  assert.match(users, /action: auditActions\.userCreated/);
  assert.match(users, /action: auditActions\.userUpdated/);
  assert.match(users, /action: auditActions\.systemAdminGranted/);
  assert.match(users, /action: auditActions\.systemAdminRemoved/);
  assert.match(users, /fieldChanges/);

  assert.match(registers, /action: auditActions\.registerCreated/);
  assert.match(registers, /action: auditActions\.registerSettingsUpdated/);
  assert.match(registers, /fieldChanges: buildFieldChanges\(existing, updated/);
  assert.match(registers, /auditActions\.registerAdminAdded/);
  assert.match(registers, /auditActions\.registerViewerRemoved/);

  assert.match(risks, /action: auditActions\.riskCreated/);
  assert.match(risks, /action: auditActions\.riskUpdated/);
  assert.match(risks, /fieldChanges: buildRiskUpdateFieldChanges\(existing, updated\)/);
  assert.match(risks, /action: auditActions\.riskDeleted/);

  assert.match(reviews, /action: auditActions\.riskReviewed/);
  assert.match(reviews, /action: auditActions\.nextReviewDateUpdated/);
  assert.match(reviews, /fieldChanges/);

  assert.match(customFields, /auditActions\.customFieldCreated/);
  assert.match(customFields, /auditActions\.customFieldUpdated/);
  assert.match(customFields, /auditActions\.customFieldOptionDeactivated/);
  assert.match(customFields, /fieldChanges/);

  assert.match(scoring, /auditActions\.likelihoodValueCreated/);
  assert.match(scoring, /auditActions\.impactValueUpdated/);
  assert.match(scoring, /auditActions\.riskLevelDeactivated/);
  assert.match(scoring, /auditActions\.riskMatrixUpdated/);
  assert.match(scoring, /fieldChanges/);

  assert.match(exports, /action: auditActions\.riskExportGenerated/);
});

test("audit routes and redaction protect sensitive audit evidence", async () => {
  const auditRoutes = await readFile(new URL("../src/routes/audit.routes.ts", import.meta.url), "utf8");
  const registerRoutes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const riskRoutes = await readFile(new URL("../src/routes/risks.routes.ts", import.meta.url), "utf8");
  const auditRead = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");
  const auditWriter = await readFile(new URL("../src/audit/auditWriter.ts", import.meta.url), "utf8");

  assert.match(auditRoutes, /requireSystemAdmin/);
  assert.match(auditRoutes, /events\/:auditEventId\/snapshot/);
  assert.match(registerRoutes, /"\/:registerId\/audit"/);
  assert.match(registerRoutes, /requireRegisterManagement\(\)/);
  assert.match(riskRoutes, /"\/:registerId\/risks\/:riskId\/audit"/);
  assert.match(riskRoutes, /requireRiskView\(\)/);
  assert.match(auditRead, /canViewRisk/);
  assert.match(auditRead, /canManageRegister/);
  assert.match(auditRead, /System Admin permission is required/);

  for (const secretField of [
    "password",
    "passwordHash",
    "accessToken",
    "refreshToken",
    "refreshTokenHash",
    "jwt",
    "bearerToken",
    "apiKey",
    "apiKeyHash",
    "secret",
    "cookie",
    "authorization"
  ]) {
    assert.match(auditWriter, new RegExp(`"${secretField}"`));
  }

  assert.match(auditWriter, /"\[REDACTED\]"/);
  assert.match(auditRead, /fieldChanges: event\.fieldChanges/);
  assert.match(auditRead, /hasSnapshot: Boolean\(event\.riskSnapshot\)/);
});
