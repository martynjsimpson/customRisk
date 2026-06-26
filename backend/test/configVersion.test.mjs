/**
 * Config version (Phase 4 draft config) tests.
 *
 * Verifies that all Phase 4 route groups — config versions, config
 * export/import, and register templates — are gated behind the
 * requireFeature('draftConfig') middleware, and that recalculation
 * endpoints and scoring formula validation are correctly wired.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("all Phase 4 route groups are gated by requireFeature('draftConfig')", async () => {
  const registerRoutes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const indexRoutes = await readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8");

  // Each Phase 4 sub-router mount in registers.routes.ts is wrapped with requireFeature
  assert.match(registerRoutes, /requireFeature\("draftConfig"\), createConfigVersionSubRouter\(\)/);
  assert.match(registerRoutes, /requireFeature\("draftConfig"\), createConfigExportImportSubRouter\(\)/);
  assert.match(registerRoutes, /requireFeature\("draftConfig"\), createRegisterTemplateSubRouter\(\)/);

  // Global template router is also gated
  assert.match(indexRoutes, /requireFeature\("draftConfig"\), createTemplateRouter\(\)/);
});

test("config version routes all enforce requireRegisterManagement", async () => {
  const configVersionRoutes = await readFile(new URL("../src/routes/configVersion.routes.ts", import.meta.url), "utf8");

  // After BUG-054, the /:registerId/config-versions prefix is stripped from the sub-router.
  // Paths are relative and inherited from the mount point in registers.routes.ts.
  assert.match(configVersionRoutes, /\/status/);
  assert.match(configVersionRoutes, /\/draft\/impact/);
  assert.match(configVersionRoutes, /\/draft\/publish/);

  // Every exposed route requires management access — count occurrences
  const managementCount = (configVersionRoutes.match(/requireRegisterManagement\(\)/g) ?? []).length;
  assert.ok(managementCount >= 7, `Expected at least 7 requireRegisterManagement() calls, got ${managementCount}`);
});

test("global template routes require System Admin; register-scoped compare and apply require register management", async () => {
  const templateRoutes = await readFile(new URL("../src/routes/template.routes.ts", import.meta.url), "utf8");

  // Global routes (list, get, create, patch, deactivate, publish version) are System Admin only
  assert.match(templateRoutes, /requireSystemAdmin/);

  // Register-scoped create-from-register is System Admin; after BUG-054 the prefix is
  // stripped from the sub-router, so the path in template.routes.ts is just /from-register.
  assert.match(templateRoutes, /\/from-register/);

  // createRegisterFromTemplateSubRouter is exported and mounted at /from-template in
  // registers.routes.ts; the sub-router itself uses "/" so no /from-template literal here.
  assert.match(templateRoutes, /createRegisterFromTemplateSubRouter/);

  // Compare and apply paths are now relative (prefix stripped after BUG-054)
  assert.match(templateRoutes, /\/compare\/:templateVersionId/);
  assert.match(templateRoutes, /\/apply\/:templateVersionId/);
  assert.match(templateRoutes, /requireRegisterManagement\(\)/);
});

test("config version service enforces single-draft constraint and no-draft guard", async () => {
  // MAINT-018: configVersion.service.ts is now a facade; draft lifecycle lives in
  // configVersion.draft.service.ts and configVersion.publish.service.ts.
  const draftService = await readFile(new URL("../src/services/configVersion.draft.service.ts", import.meta.url), "utf8");
  const publishService = await readFile(new URL("../src/services/configVersion.publish.service.ts", import.meta.url), "utf8");
  const combined = draftService + "\n" + publishService;

  // createDraft rejects with 409 when a draft already exists
  assert.match(draftService, /draftConfigVersionId !== null/);
  assert.match(draftService, /A draft configuration already exists for this register/);
  assert.match(draftService, /409/);

  // updateDraft, discardDraft, analyseImpact, publishDraft reject with 404 when no draft
  const noDraftGuardCount = (combined.match(/No draft configuration exists for this register/g) ?? []).length;
  assert.ok(noDraftGuardCount >= 3, `Expected at least 3 no-draft guard messages, got ${noDraftGuardCount}`);
});

test("config version service writes audit events for all draft lifecycle operations", async () => {
  // MAINT-018: draft lifecycle events live in configVersion.draft.service.ts;
  // analyseImpact and publish events live in configVersion.publish.service.ts.
  const draftService = await readFile(new URL("../src/services/configVersion.draft.service.ts", import.meta.url), "utf8");
  const publishService = await readFile(new URL("../src/services/configVersion.publish.service.ts", import.meta.url), "utf8");
  const service = draftService + "\n" + publishService;

  assert.match(service, /action: auditActions\.configDraftCreated/);
  assert.match(service, /action: auditActions\.configDraftUpdated/);
  assert.match(service, /action: auditActions\.configDraftDiscarded/);
  assert.match(service, /action: auditActions\.configImpactAnalysed/);
  assert.match(service, /action: auditActions\.configPublished/);

  // All audit events use CONFIG_VERSION object type
  const configVersionObjectCount = (service.match(/objectType: "CONFIG_VERSION"/g) ?? []).length;
  assert.ok(configVersionObjectCount >= 5, `Expected at least 5 CONFIG_VERSION audit events, got ${configVersionObjectCount}`);
});

test("publish runs impact check before mutating and uses a transaction", async () => {
  // MAINT-018: publishConfigVersion lives in configVersion.publish.service.ts.
  const service = await readFile(new URL("../src/services/configVersion.publish.service.ts", import.meta.url), "utf8");

  // Impact analysis is called inside publishDraft
  assert.match(service, /analyseImpact\(registerId/);
  assert.match(service, /Cannot publish:/);
  assert.match(service, /impact\.canPublish/);

  // Publish is wrapped in a transaction
  assert.match(service, /prisma\.\$transaction/);

  // Draft is promoted to current and marked PUBLISHED within the transaction
  assert.match(service, /currentConfigVersionId: draft\.id/);
  assert.match(service, /draftConfigVersionId: null/);
  assert.match(service, /status: ConfigVersionStatus\.PUBLISHED/);
  assert.match(service, /publishedAt: new Date\(\)/);
});

test("publish calls evaluateAndStoreCalculatedFields for each non-CLOSED risk in the register", async () => {
  // MAINT-018: publishConfigVersion lives in configVersion.publish.service.ts;
  // evaluateAndStoreCalculatedFields is now imported from risks.calculatedFields.service (not risks.service).
  const service = await readFile(new URL("../src/services/configVersion.publish.service.ts", import.meta.url), "utf8");

  // evaluateAndStoreCalculatedFields is imported from risks.calculatedFields.service
  assert.match(service, /import.*evaluateAndStoreCalculatedFields.*from.*risks\.calculatedFields\.service/);

  // Non-CLOSED risks are fetched using a state: { not: "CLOSED" } filter
  assert.match(service, /state:\s*\{\s*not:\s*["']CLOSED["']\s*\}/);

  // evaluateAndStoreCalculatedFields is called inside the loop for each risk
  assert.match(service, /evaluateAndStoreCalculatedFields\(risk\.id,\s*registerId,\s*tx\)/);

  // The recalculation happens after custom field definition upserts (comment present)
  assert.match(service, /Recalculate CALCULATED custom fields for all non-CLOSED risks/);
});

test("impact analysis checks structural blockers and warns about deactivated config items", async () => {
  // MAINT-018: analyseImpact lives in configVersion.publish.service.ts.
  const service = await readFile(new URL("../src/services/configVersion.publish.service.ts", import.meta.url), "utf8");

  // Structural blockers for empty active collections
  assert.match(service, /Draft must have at least one active likelihood value/);
  assert.match(service, /Draft must have at least one active impact value/);
  assert.match(service, /Draft must have at least one active risk level/);
  assert.match(service, /Draft must have at least one active response strategy/);

  // Matrix referential integrity check
  assert.match(service, /Matrix cell references likelihood ID/);
  assert.match(service, /Matrix cell references impact ID/);
  assert.match(service, /Matrix cell references risk level ID/);

  // Warnings for items being deactivated
  assert.match(service, /is active but will be deactivated by the draft/);

  // canPublish derived from blockers
  assert.match(service, /canPublish: blockers\.length === 0/);
});

test("export service uses published snapshot when available and falls back to live tables", async () => {
  const service = await readFile(new URL("../src/services/configExport.service.ts", import.meta.url), "utf8");

  assert.match(service, /currentConfigVersion/);
  assert.match(service, /snapshotJson as unknown as RegisterConfigSnapshot/);
  assert.match(service, /buildSnapshotFromLiveTables/);
  assert.match(service, /action: auditActions\.registerConfigExported/);
  assert.match(service, /schemaVersion: "1\.0"/);
  assert.match(service, /exportedAt/);
});

test("import service validates payload, rejects if draft exists, and creates a DRAFT version", async () => {
  const service = await readFile(new URL("../src/services/configImport.service.ts", import.meta.url), "utf8");

  // 409 guard for existing draft
  assert.match(service, /draftConfigVersionId !== null/);
  assert.match(service, /Discard or publish the existing draft before importing/);

  // Zod validation applied to incoming payload
  assert.match(service, /importBodySchema\.safeParse/);
  assert.match(service, /VALIDATION_ERROR/);

  // Creates a DRAFT version inside a transaction
  assert.match(service, /status: "DRAFT"/);
  assert.match(service, /prisma\.\$transaction/);
  assert.match(service, /draftConfigVersionId: newVersion\.id/);

  assert.match(service, /action: auditActions\.registerConfigImported/);
});

test("template service enforces unique name constraint and writes correct audit events", async () => {
  const service = await readFile(new URL("../src/services/template.service.ts", import.meta.url), "utf8");

  // Unique name 409
  assert.match(service, /A template with this name already exists/);
  assert.match(service, /P2002/);

  // Audit events for all template operations
  assert.match(service, /action: auditActions\.templateCreated/);
  assert.match(service, /action: auditActions\.templateUpdated/);
  assert.match(service, /action: auditActions\.templateDeleted/);

  // Template CRUD uses REGISTER_TEMPLATE object type for audit
  assert.match(service, /objectType: "REGISTER_TEMPLATE"/);

  // New template immediately gets a published version 1
  assert.match(service, /versionNumber: 1/);
  assert.match(service, /status: "PUBLISHED"/);
});

test("create register from template reassigns new UUIDs to all config rows", async () => {
  const registersService = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");

  // Uses the template's published snapshot
  assert.match(registersService, /templateVersionId/);
  assert.match(registersService, /snapshotJson/);

  // ID remapping: creates rows without explicit IDs (Prisma auto-generates new UUIDs)
  // and builds Maps to translate old template IDs to new register-scoped IDs
  assert.match(registersService, /likelihoodIdMap/);
  assert.match(registersService, /impactIdMap/);
  assert.match(registersService, /riskLevelIdMap/);

  // Rejects DRAFT or inactive template
  assert.match(registersService, /Cannot create a register from a DRAFT template version/);
  assert.match(registersService, /Cannot create a register from an inactive template/);

  // Audit event for this operation
  assert.match(registersService, /auditActions\.registerCreatedFromTemplate/);
});

test("config snapshot type covers all seven required sections", async () => {
  const snapshot = await readFile(new URL("../src/types/configSnapshot.ts", import.meta.url), "utf8");

  for (const section of [
    "register",
    "customFields",
    "likelihoodValues",
    "impactValues",
    "riskLevels",
    "matrixCells",
    "responseStrategies"
  ]) {
    assert.match(snapshot, new RegExp(`${section}:`));
  }

  // numericValue is serialised as string to preserve precision
  assert.match(snapshot, /numericValue: string/);

  // Register settings include reviews and attestation fields
  assert.match(snapshot, /reviewsEnabled/);
  assert.match(snapshot, /reviewAttestationText/);
  assert.match(snapshot, /allowViewerExport/);

  // reviewStatusPosition is part of the snapshot register settings
  assert.match(snapshot, /reviewStatusPosition/);
});

// ─── BUG-050: CALCULATED field formula round-trip ────────────────────────────

test("BUG-050: ConfigSnapshotCustomField type includes formula field", async () => {
  const snapshot = await readFile(new URL("../src/types/configSnapshot.ts", import.meta.url), "utf8");

  // The type must carry formula so CALCULATED fields survive publish
  assert.match(snapshot, /formula\?:\s*string\s*\|\s*null/);
});

test("BUG-050: snapshotCustomFieldSchema includes formula", async () => {
  const schemas = await readFile(new URL("../src/validators/configVersion.schemas.ts", import.meta.url), "utf8");

  // Zod schema must accept formula so incoming snapshots are not rejected
  assert.match(schemas, /formula:\s*z\.string\(\)/);
});

test("BUG-050: configVersion service writes formula when building draft snapshot and on publish", async () => {
  // MAINT-018: draft snapshot logic lives in configVersion.draft.service.ts;
  // publish path logic lives in configVersion.publish.service.ts.
  const draftService = await readFile(new URL("../src/services/configVersion.draft.service.ts", import.meta.url), "utf8");
  const publishService = await readFile(new URL("../src/services/configVersion.publish.service.ts", import.meta.url), "utf8");

  // formula is mapped when constructing the initial draft snapshot (createDraft / buildSnapshotFromLiveTables)
  const draftFormulaCount = (draftService.match(/formula:\s*f\.formula\s*\?\?\s*null/g) ?? []).length;
  assert.ok(draftFormulaCount >= 1, `Expected at least 1 formula mapping in draft snapshot builder, got ${draftFormulaCount}`);

  // formula is written in the publish path (writing custom fields back to DB rows)
  const publishFormulaCount = (publishService.match(/formula:\s*cf\.formula\s*\?\?\s*null/g) ?? []).length;
  assert.ok(publishFormulaCount >= 2, `Expected at least 2 formula writes in publish path, got ${publishFormulaCount}`);
});

test("Phase 4 audit actions are defined in auditActions for all thirteen new events", async () => {
  const actions = await readFile(new URL("../src/audit/auditActions.ts", import.meta.url), "utf8");

  for (const action of [
    "configDraftCreated",
    "configDraftUpdated",
    "configPublished",
    "configDraftDiscarded",
    "configImpactAnalysed",
    "registerConfigExported",
    "registerConfigImported",
    "templateCreated",
    "templateUpdated",
    "templateDeleted",
    "registerCreatedFromTemplate",
    "registerUnlinkedFromTemplate"
  ]) {
    assert.match(actions, new RegExp(`${action}:`));
  }
});

test("applyTemplateUpdateToDraft stores sourceTemplateVersionId on the draft, not on the register", async () => {
  const service = await readFile(new URL("../src/services/template.service.ts", import.meta.url), "utf8");

  // sourceTemplateVersionId is set on the draft config version
  assert.match(service, /sourceTemplateVersionId: templateVersionId/);

  // linkedTemplateVersionId is NOT updated on the register inside applyTemplateUpdateToDraft
  // (it is advanced by publishDraft when the draft is published)
  const applyFnStart = service.indexOf("export async function applyTemplateUpdateToDraft");
  const applyFnEnd = service.indexOf("\nexport async function", applyFnStart + 1);
  const applyFnBody = service.slice(applyFnStart, applyFnEnd === -1 ? undefined : applyFnEnd);
  assert.ok(
    !applyFnBody.includes("linkedTemplateVersionId: templateVersionId"),
    "applyTemplateUpdateToDraft must not advance linkedTemplateVersionId directly — that is publishDraft's responsibility"
  );
});

test("publishDraft recalculates risk levels for all open risks against the new matrix", async () => {
  // MAINT-018: publishConfigVersion lives in configVersion.publish.service.ts.
  const configVersionService = await readFile(
    new URL("../src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );
  const matrixService = await readFile(
    new URL("../src/services/matrix.service.ts", import.meta.url),
    "utf8"
  );

  // recalculateRiskLevels is exported from matrix.service so publishDraft can call it
  assert.match(matrixService, /export async function recalculateRiskLevels/);

  // publishDraft imports and calls recalculateRiskLevels inside the transaction
  assert.match(configVersionService, /recalculateRiskLevels/);
  assert.match(configVersionService, /import.*recalculateRiskLevels.*matrix\.service/);

  // The call passes the new matrix cells from the snapshot
  assert.match(configVersionService, /snapshot\.matrixCells/);
});

test("publishDraft advances linkedTemplateVersionId and applies register settings only for template-originated drafts", async () => {
  // MAINT-018: publishConfigVersion lives in configVersion.publish.service.ts.
  const service = await readFile(new URL("../src/services/configVersion.publish.service.ts", import.meta.url), "utf8");

  // sourceTemplateVersionId presence drives both behaviours
  assert.match(service, /draft\.sourceTemplateVersionId/);

  // linkedTemplateVersionId is set inside the register update
  assert.match(service, /linkedTemplateVersionId: draft\.sourceTemplateVersionId/);

  // Register settings are spread from the snapshot inside the template-origin conditional
  assert.match(service, /allowViewerExport: regSettings\.allowViewerExport/);
});

test("unlinkRegisterFromTemplate service writes audit event and route is System Admin + feature-flag gated", async () => {
  const service = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");

  // Service function exists and guards against missing link
  assert.match(service, /export async function unlinkRegisterFromTemplate/);
  assert.match(service, /Register is not linked to a template/);
  assert.match(service, /linkedTemplateVersionId: null/);
  assert.match(service, /action: auditActions\.registerUnlinkedFromTemplate/);

  // Route requires both the feature flag and system admin
  assert.match(routes, /requireFeature\("draftConfig"\)/);
  assert.match(routes, /requireSystemAdmin/);
  assert.match(routes, /template-link/);
});

test("register linked_template_version_id is included in registerSelect and mapped in decorateRegister", async () => {
  const service = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");

  // registerSelect includes the nested linkedTemplateVersion
  assert.match(service, /linkedTemplateVersion:/);

  // decorateRegister maps it to a clean linkedTemplate shape
  assert.match(service, /linkedTemplate:/);
  assert.match(service, /templateId:/);
  assert.match(service, /linkedVersionNumber:/);
  assert.match(service, /isLatest:/);
});

// ─── PM6-SCORING: publishDraft calls recalculateRiskScores ────────────────────

test("publishDraft calls recalculateRiskScores after recalculateRiskLevels (PM6-SCORING)", async () => {
  // MAINT-018: publishConfigVersion lives in configVersion.publish.service.ts.
  const service = await readFile(
    new URL("../src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );
  const scoringService = await readFile(
    new URL("../src/services/scoring.service.ts", import.meta.url),
    "utf8"
  );

  // recalculateRiskScores is exported from scoring.service
  assert.match(scoringService, /export async function recalculateRiskScores/);

  // configVersion.publish.service imports recalculateRiskScores
  assert.match(service, /import.*recalculateRiskScores.*scoring\.service/);

  // publishDraft calls recalculateRiskScores inside the transaction
  assert.match(service, /recalculateRiskScores/);

  // The scoring formula is read from the snapshot
  assert.match(service, /scoringFormula/);
});

test("publishDraft writes scoringFormula to register.update unconditionally — not inside sourceTemplateVersionId block (BUG-FIX)", async () => {
  // MAINT-018: publishConfigVersion lives in configVersion.publish.service.ts.
  const service = await readFile(
    new URL("../src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );

  // Locate the register.update call inside publishConfigVersion (publishDraft).
  // The fix places scoringFormula AFTER the sourceTemplateVersionId spread, at the
  // top level of the data object, so that it is always written regardless of whether
  // the draft originated from a template.
  //
  // Strategy: find the comment that was added to document the fix, then assert that
  // scoringFormula assignment follows it directly.
  const fixComment = "Always promote scoringFormula from the published snapshot";
  assert.ok(
    service.includes(fixComment),
    "Expected the unconditional scoringFormula comment to be present in publishConfigVersion"
  );

  // The scoringFormula assignment must appear AFTER the closing of the
  // sourceTemplateVersionId conditional block (i.e. after `: {}),`).
  const templateBlockClose = ": {}),";
  const templateBlockCloseIdx = service.indexOf(templateBlockClose);
  assert.ok(templateBlockCloseIdx !== -1, "Expected to find the sourceTemplateVersionId else-branch close");

  const fixIdx = service.indexOf(fixComment);
  assert.ok(
    fixIdx > templateBlockCloseIdx,
    "scoringFormula comment must appear AFTER the sourceTemplateVersionId conditional block closes, not inside it"
  );

  // Also assert the actual assignment is present after the comment.
  const afterComment = service.slice(fixIdx);
  assert.match(
    afterComment,
    /scoringFormula:\s*regSettings\.scoringFormula\s*\?\?\s*""/,
    "scoringFormula must be assigned from regSettings.scoringFormula ?? \"\" after the comment"
  );
});

test("validate-formula route is exposed under config-versions (PM6-SCORING)", async () => {
  const routes = await readFile(
    new URL("../src/routes/configVersion.routes.ts", import.meta.url),
    "utf8"
  );

  // Endpoint path exists
  assert.match(routes, /validate-formula/);

  // Route is POST (formula sent in body, not query string)
  // The path and method may span lines, so check them independently
  assert.ok(
    routes.includes("router.post("),
    "Expected router.post( to be present in configVersion routes"
  );
});

// ─── PM6-SCORING: recalculateRiskScores audit coverage ────────────────────────

test("recalculateRiskScores emits riskUpdated audit events for changed scores (PM6-SCORING)", async () => {
  const service = await readFile(
    new URL("../src/services/scoring.service.ts", import.meta.url),
    "utf8"
  );

  // Audit action used is riskUpdated
  assert.match(service, /auditActions\.riskUpdated/);

  // recordAuditEvent is called inside recalculateRiskScores
  assert.match(service, /recordAuditEvent/);

  // Audit event summarises the reason
  assert.match(service, /scoring formula/);

  // The audit event records the score field change
  assert.match(service, /fieldName: "riskScore"/);

  // Only audit when the score actually changed (not unconditionally)
  assert.match(service, /newScoreDecimal\.equals\(oldScore\)/);
});
