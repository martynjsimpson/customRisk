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

import { updateDraftBodySchema } from "../src/validators/configVersion.schemas.ts";
import { importBodySchema } from "../src/validators/configExportImport.schemas.ts";

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

test("publishDraft advances linkedTemplateVersionId only for template-originated drafts", async () => {
  // MAINT-018: publishConfigVersion lives in configVersion.publish.service.ts.
  //
  // DRAFT-UNIFIED note: this test previously also asserted that register settings (e.g.
  // allowViewerExport) were applied "only for template-originated drafts". That is no longer
  // true — under the unified draft standard (docs/architecture/register-config-draft-system.md
  // section 5) every ConfigSnapshotRegisterSettings field is promoted unconditionally regardless
  // of draft origin. linkedTemplateVersionId is the only field still gated on
  // draft.sourceTemplateVersionId. The always-promote / conditional-isolation assertions live in
  // the DRAFT-UNIFIED tests above; this test is scoped to linkedTemplateVersionId only.
  const service = await readFile(new URL("../src/services/configVersion.publish.service.ts", import.meta.url), "utf8");

  // sourceTemplateVersionId drives linkedTemplateVersionId
  assert.match(service, /draft\.sourceTemplateVersionId/);

  // linkedTemplateVersionId is set inside the register update, from the draft's template origin
  assert.match(service, /linkedTemplateVersionId: draft\.sourceTemplateVersionId/);
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

// ─── DRAFT-UNIFIED: the unified draft standard (docs/architecture/register-config-draft-system.md
// section 5) — every ConfigSnapshotRegisterSettings field is promoted unconditionally on publish,
// regardless of whether the draft originated from a template. linkedTemplateVersionId is the only
// field that stays inside the sourceTemplateVersionId conditional. ────────────────────────────────

// Extracts the `await tx.register.update({ ... });` call body from configVersion.publish.service.ts
// so assertions below are on the code's actual shape, not on comment text (a comment can be
// reworded without changing behaviour, so a regression guard must not depend on it).
function extractRegisterUpdateCall(serviceSource) {
  const match = serviceSource.match(/await tx\.register\.update\(\{[\s\S]*?\n {4}\}\);/);
  assert.ok(match, "Expected to find the tx.register.update(...) call in publishDraft");
  return match[0];
}

// Isolates the `...(draft.sourceTemplateVersionId ? { ... } : {}),` spread within the update
// call body, returning { conditionalSegment, outsideConditional }.
function splitTemplateConditional(updateCallBody) {
  const condStart = updateCallBody.indexOf("...(draft.sourceTemplateVersionId");
  assert.ok(condStart !== -1, "Expected the sourceTemplateVersionId conditional spread in the update call");

  const closeMarker = ": {}),";
  const closeIdx = updateCallBody.indexOf(closeMarker, condStart);
  assert.ok(closeIdx !== -1, "Expected the sourceTemplateVersionId conditional to close with ': {}),'");

  const condEnd = closeIdx + closeMarker.length;
  return {
    conditionalSegment: updateCallBody.slice(condStart, condEnd),
    outsideConditional: updateCallBody.slice(0, condStart) + updateCallBody.slice(condEnd)
  };
}

const ALWAYS_PROMOTED_REGISTER_SETTINGS_FIELDS = [
  "name",
  "description",
  "riskIdPrefix",
  "riskIdZeroPaddingEnabled",
  "riskIdZeroPaddingWidth",
  "defaultNewRiskState",
  "reviewsEnabled",
  "defaultReviewFrequencyMonths",
  "reviewAttestationText",
  "allowViewerExport",
  "customFieldValidationEnabled",
  "reviewStatusPosition",
  "scoringFormula"
];

test("publishDraft promotes every always-promote register setting unconditionally — not inside the sourceTemplateVersionId block (DRAFT-UNIFIED, BUG-FIX)", async () => {
  // MAINT-018: publishConfigVersion lives in configVersion.publish.service.ts.
  const service = await readFile(
    new URL("../src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );

  const updateCall = extractRegisterUpdateCall(service);
  const { conditionalSegment, outsideConditional } = splitTemplateConditional(updateCall);

  // Every field in ConfigSnapshotRegisterSettings (other than the legacy-snapshot-guarded
  // responseActionMode and the linkedTemplateVersionId exception) must be assigned outside the
  // sourceTemplateVersionId conditional, and must NOT appear inside it — a field placed inside
  // the conditional is silently discarded on a manual draft publish (section 9 of the doc).
  for (const field of ALWAYS_PROMOTED_REGISTER_SETTINGS_FIELDS) {
    const fieldAssignment = new RegExp(`\\b${field}:`);
    assert.match(
      outsideConditional,
      fieldAssignment,
      `${field} must be assigned unconditionally in tx.register.update outside the sourceTemplateVersionId block`
    );
    assert.doesNotMatch(
      conditionalSegment,
      fieldAssignment,
      `${field} must NOT be inside the sourceTemplateVersionId conditional — that would make it template-origin-only again`
    );
  }

  // scoringFormula specifically, still assigned from the snapshot with the documented fallback.
  assert.match(
    outsideConditional,
    /scoringFormula:\s*regSettings\.scoringFormula\s*\?\?\s*""/,
    "scoringFormula must be assigned from regSettings.scoringFormula ?? \"\""
  );

  // responseActionMode keeps its own legacy-snapshot guard (snapshotMode !== undefined) — this is
  // NOT the template-origin conditional, so it must sit outside it and must never appear inside it.
  assert.match(
    outsideConditional,
    /\.\.\.\(snapshotMode !== undefined \? \{ responseActionMode:/,
    "responseActionMode must be promoted via its own legacy-snapshot guard, outside the template conditional"
  );
  assert.doesNotMatch(
    conditionalSegment,
    /responseActionMode/,
    "responseActionMode must not be gated on sourceTemplateVersionId"
  );
});

test("publishDraft's sourceTemplateVersionId conditional contains linkedTemplateVersionId and nothing else (DRAFT-UNIFIED)", async () => {
  const service = await readFile(
    new URL("../src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );

  const updateCall = extractRegisterUpdateCall(service);
  const { conditionalSegment } = splitTemplateConditional(updateCall);

  // The one exception: linkedTemplateVersionId is not a settings field, it is the register's
  // template sync point, and must remain conditional on the draft's template origin.
  assert.match(
    conditionalSegment,
    /linkedTemplateVersionId:\s*draft\.sourceTemplateVersionId/,
    "linkedTemplateVersionId must be set from draft.sourceTemplateVersionId inside the conditional"
  );

  // No other register-settings field may share the conditional.
  for (const field of ALWAYS_PROMOTED_REGISTER_SETTINGS_FIELDS) {
    assert.doesNotMatch(
      conditionalSegment,
      new RegExp(`\\b${field}:`),
      `${field} must not share the sourceTemplateVersionId conditional with linkedTemplateVersionId`
    );
  }
});

test("publishDraft promotes the same always-promote fields regardless of draft origin — parity between manual and template-origin drafts (DRAFT-UNIFIED)", async () => {
  // The always-promote block is a single, unconditional block of assignments in the `data`
  // object of tx.register.update — it does not read draft.sourceTemplateVersionId at all, so
  // its behaviour cannot differ between a manually-created draft and a template-origin draft.
  // This is the parity guarantee the unified standard exists to provide (section 5.1: the bug
  // this replaced was exactly a field that behaved differently based on draft origin).
  const service = await readFile(
    new URL("../src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );

  const updateCall = extractRegisterUpdateCall(service);
  const { conditionalSegment, outsideConditional } = splitTemplateConditional(updateCall);

  // None of the always-promoted fields reference draft.sourceTemplateVersionId anywhere in
  // their assignment (i.e. they are not wrapped in a per-field ternary keyed on draft origin).
  for (const field of ALWAYS_PROMOTED_REGISTER_SETTINGS_FIELDS) {
    const fieldLineMatch = outsideConditional.match(new RegExp(`${field}:[^\\n]*`));
    assert.ok(fieldLineMatch, `Expected to find the ${field} assignment line`);
    assert.doesNotMatch(
      fieldLineMatch[0],
      /sourceTemplateVersionId/,
      `${field}'s assignment must not itself branch on draft.sourceTemplateVersionId`
    );
  }

  // And the only field that does branch on origin is confined to the conditional segment
  // asserted in the previous test — linkedTemplateVersionId.
  assert.match(conditionalSegment, /sourceTemplateVersionId/);
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

// ─── DRAFT-UNIFIED: register-name-collision blocker ───────────────────────────

test("analyseImpact blocks publish on a register-name collision, and publishDraft returns a handled 422 (not a raw Prisma error)", async () => {
  const service = await readFile(
    new URL("../src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );

  // The collision check runs inside analyseImpact, using the draft's staged name (falling back
  // to the live register name when the draft doesn't touch it), and excludes the register itself.
  assert.match(service, /const draftName = \(snapshot\.register\.name \?\? register\.name\)\.trim\(\)/);
  assert.match(
    service,
    /prisma\.register\.findFirst\(\{\s*where:\s*\{\s*name:\s*draftName,\s*id:\s*\{\s*not:\s*registerId\s*\}/,
    "Expected the name-collision lookup to exclude the register being published"
  );
  assert.match(
    service,
    /blockers\.push\(`Register name "\$\{draftName\}" is already in use by another register`\)/,
    "Expected a blocker naming the collision"
  );

  // publishDraft rejects with a handled 422 when analyseImpact returns any blocker — it does not
  // let a Prisma P2002 (or any other raw DB error) escape as an unhandled 500. Per section 9 of
  // the doc, publishDraft has no try/catch of its own, so any DB-constraint failure on a promoted
  // field (like the globally-unique Register.name) MUST be caught here as a blocker, not relied
  // on to throw at the tx.register.update call.
  assert.match(service, /if \(!impact\.canPublish\) \{/);
  assert.match(service, /throw new ApiError\(\s*422,\s*"UNPROCESSABLE"/);

  // publishDraft has no error-mapping call of its own around the transaction — confirming the
  // documented reliance on analyseImpact catching DB-constraint failures up front, rather than a
  // try/catch + mapPrismaError(...) around the tx.register.update call.
  assert.doesNotMatch(
    service,
    /mapPrismaError\(/,
    "publishDraft must not rely on a mapPrismaError(...) call — constraint failures must be caught by analyseImpact instead"
  );
});

// ─── BUG-058 / BUG-060: createRegisterFromTemplate — createdBy/updatedBy, scoringFormula,
// responseActionMode ─────────────────────────────────────────────────────────────────────────

test("createRegisterFromTemplate copies scoringFormula and responseActionMode from the template snapshot and sets createdBy/updatedBy via connect relations (BUG-058/BUG-060)", async () => {
  const service = await readFile(
    new URL("../src/services/registers.service.ts", import.meta.url),
    "utf8"
  );

  const fnStart = service.indexOf("export async function createRegisterFromTemplate");
  assert.ok(fnStart !== -1, "Expected createRegisterFromTemplate to be exported from registers.service.ts");

  const createCallStart = service.indexOf("tx.register.create(", fnStart);
  assert.ok(createCallStart !== -1, "Expected a tx.register.create(...) call inside createRegisterFromTemplate");

  // Grab the create({...}) call body for scoped assertions.
  const createCallMatch = service
    .slice(createCallStart)
    .match(/tx\.register\.create\(\{[\s\S]*?\n {6}\}\);/);
  assert.ok(createCallMatch, "Expected to isolate the tx.register.create({...}) call body");
  const createCall = createCallMatch[0];

  // createdBy/updatedBy are Prisma connect relations to the actor, not raw FK columns — this is
  // what previously threw PrismaClientValidationError.
  assert.match(createCall, /createdBy:\s*\{\s*connect:\s*\{\s*id:\s*actorId\s*\}\s*\}/);
  assert.match(createCall, /updatedBy:\s*\{\s*connect:\s*\{\s*id:\s*actorId\s*\}\s*\}/);

  // scoringFormula and responseActionMode come from the template snapshot's register settings,
  // not from the Register model's schema defaults ("" / SIMPLE).
  assert.match(createCall, /scoringFormula:\s*regSettings\.scoringFormula/);
  assert.match(createCall, /responseActionMode:\s*regSettings\.responseActionMode/);
});

// ─── BUG-061: compareRegisterToTemplate — scoringFormula / responseActionMode diff coverage ───

test("compareRegisterToTemplate's registerSettingsKeys includes scoringFormula and responseActionMode (BUG-061)", async () => {
  const service = await readFile(
    new URL("../src/services/template.service.ts", import.meta.url),
    "utf8"
  );

  const fnStart = service.indexOf("export async function compareRegisterToTemplate");
  assert.ok(fnStart !== -1, "Expected compareRegisterToTemplate to be exported from template.service.ts");

  const keysStart = service.indexOf("registerSettingsKeys", fnStart);
  assert.ok(keysStart !== -1, "Expected a registerSettingsKeys array inside compareRegisterToTemplate");

  const keysArrayMatch = service.slice(keysStart).match(/\[[\s\S]*?\];/);
  assert.ok(keysArrayMatch, "Expected to isolate the registerSettingsKeys array literal");
  const keysArray = keysArrayMatch[0];

  assert.match(keysArray, /"scoringFormula"/, "scoringFormula must be compared between register and template");
  assert.match(keysArray, /"responseActionMode"/, "responseActionMode must be compared between register and template");

  // A register diverging in exactly one key produces one named diff entry — the comparison loop
  // pushes the key itself (not a derived label) onto registerSettings, so the frontend Compare
  // modal renders the field name directly (see frontend/test for the rendered-modal assertion).
  assert.match(service, /if \(regVal !== tplVal\) \{\s*registerSettings\.push\(key\);/);
});

// ─── DRAFT-UNIFIED: Zod schema gaps closed ─────────────────────────────────────────────────────

test("updateDraftBodySchema accepts register.name and does not silently strip it (schema gap closed)", () => {
  // Before this fix, snapshotRegisterSettingsSchema had no `name` key, so Zod (which strips
  // unknown keys) silently dropped it from the PATCH body — updateDraft never saw it, the
  // response was 200, and the value reverted on refresh. This is a pure schema-level assertion:
  // no DB is needed to prove the field survives validation.
  const result = updateDraftBodySchema.parse({ register: { name: "Renamed Register" } });
  assert.equal(result.register?.name, "Renamed Register");
});

test("updateDraftBodySchema's riskIdPrefix pattern matches the direct-write path (schema gap closed)", () => {
  assert.throws(() => updateDraftBodySchema.parse({ register: { riskIdPrefix: "bad prefix!" } }));

  const result = updateDraftBodySchema.parse({ register: { riskIdPrefix: "RISK-1" } });
  assert.equal(result.register?.riskIdPrefix, "RISK-1");
});

test("updateDraftBodySchema's defaultNewRiskState is a closed enum, not an open string (schema gap closed)", () => {
  const result = updateDraftBodySchema.parse({ register: { defaultNewRiskState: "OPEN" } });
  assert.equal(result.register?.defaultNewRiskState, "OPEN");

  assert.throws(() => updateDraftBodySchema.parse({ register: { defaultNewRiskState: "NOT_A_STATE" } }));
});

function minimalImportConfig(registerOverrides = {}) {
  return {
    config: {
      register: {
        name: "Imported Register",
        riskIdZeroPaddingEnabled: false,
        riskIdZeroPaddingWidth: 4,
        defaultNewRiskState: "OPEN",
        reviewsEnabled: true,
        defaultReviewFrequencyMonths: 12,
        reviewAttestationText: "",
        allowViewerExport: false,
        customFieldValidationEnabled: true,
        ...registerOverrides
      },
      customFields: [],
      likelihoodValues: [],
      impactValues: [],
      riskLevels: [],
      matrixCells: [],
      responseStrategies: []
    }
  };
}

test("configExportImport defaultNewRiskState is a closed enum on import — previously any string was accepted (schema gap closed)", () => {
  const accepted = importBodySchema.parse(minimalImportConfig({ defaultNewRiskState: "OPEN" }));
  assert.equal(accepted.config.register.defaultNewRiskState, "OPEN");

  assert.throws(
    () => importBodySchema.parse(minimalImportConfig({ defaultNewRiskState: "NOT_A_STATE" })),
    "Importing an arbitrary string for defaultNewRiskState must be rejected"
  );
});
