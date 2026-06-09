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

  assert.match(configVersionRoutes, /config-versions\/status/);
  assert.match(configVersionRoutes, /config-versions\/draft\/impact/);
  assert.match(configVersionRoutes, /config-versions\/draft\/publish/);

  // Every exposed route requires management access — count occurrences
  const managementCount = (configVersionRoutes.match(/requireRegisterManagement\(\)/g) ?? []).length;
  assert.ok(managementCount >= 7, `Expected at least 7 requireRegisterManagement() calls, got ${managementCount}`);
});

test("global template routes require System Admin; register-scoped compare and apply require register management", async () => {
  const templateRoutes = await readFile(new URL("../src/routes/template.routes.ts", import.meta.url), "utf8");

  // Global routes (list, get, create, patch, deactivate, publish version) are System Admin only
  assert.match(templateRoutes, /requireSystemAdmin/);

  // Register-scoped create-from-register and create-template-from-register are also System Admin
  assert.match(templateRoutes, /templates\/from-register/);
  assert.match(templateRoutes, /from-template/);

  // Compare and apply are register management
  assert.match(templateRoutes, /templates\/compare\/:templateVersionId/);
  assert.match(templateRoutes, /templates\/apply\/:templateVersionId/);
  assert.match(templateRoutes, /requireRegisterManagement\(\)/);
});

test("config version service enforces single-draft constraint and no-draft guard", async () => {
  const service = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  // createDraft rejects with 409 when a draft already exists
  assert.match(service, /draftConfigVersionId !== null/);
  assert.match(service, /A draft configuration already exists for this register/);
  assert.match(service, /409/);

  // updateDraft, discardDraft, analyseImpact, publishDraft reject with 404 when no draft
  const noDraftGuardCount = (service.match(/No draft configuration exists for this register/g) ?? []).length;
  assert.ok(noDraftGuardCount >= 3, `Expected at least 3 no-draft guard messages, got ${noDraftGuardCount}`);
});

test("config version service writes audit events for all draft lifecycle operations", async () => {
  const service = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

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
  const service = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

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

test("impact analysis checks structural blockers and warns about deactivated config items", async () => {
  const service = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

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
  const configVersionService = await readFile(
    new URL("../src/services/configVersion.service.ts", import.meta.url),
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
  const service = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

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
