import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

test("schema defines ResponseActionMode and ResponseActionStatus enums", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

  assert.match(schema, /enum ResponseActionMode/);
  assert.match(schema, /SIMPLE/);
  assert.match(schema, /CHILD_RECORDS/);

  assert.match(schema, /enum ResponseActionStatus/);
  assert.match(schema, /PLANNED/);
  assert.match(schema, /IN_PROGRESS/);
  assert.match(schema, /IMPLEMENTED/);
  assert.match(schema, /DEFERRED/);
  assert.match(schema, /CANCELLED/);
});

test("schema adds responseActionMode field to Register model", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.match(schema, /responseActionMode\s+ResponseActionMode\s+@default\(SIMPLE\)/);
});

test("schema defines ResponseAction model with correct fields", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

  assert.match(schema, /model ResponseAction/);
  assert.match(schema, /response\s+String\s+@db\.Text/);
  assert.match(schema, /status\s+ResponseActionStatus\s+@default\(PLANNED\)/);
  assert.match(schema, /ownerPersonId\s+String\?/);
  assert.match(schema, /ownerUserId\s+String\?/);
  assert.match(schema, /isDeleted\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /deletedAt\s+DateTime\?/);
  assert.match(schema, /deletedByUserId\s+String\?/);
  assert.match(schema, /@@map\("response_action"\)/);
});

test("schema defines RiskResponseAction link model with correct fields", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

  assert.match(schema, /model RiskResponseAction/);
  assert.match(schema, /riskId\s+String/);
  assert.match(schema, /registerId\s+String/);
  assert.match(schema, /responseActionId\s+String/);
  assert.match(schema, /displayOrder\s+Int\s+@default\(0\)/);
  assert.match(schema, /@@unique\(\[riskId, responseActionId\]\)/);
  assert.match(schema, /@@map\("risk_response_action"\)/);
});

test("schema adds AuditObjectType values RESPONSE_ACTION and RISK_RESPONSE_ACTION", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.match(schema, /RESPONSE_ACTION\b/);
  assert.match(schema, /RISK_RESPONSE_ACTION\b/);
});

test("schema adds back-relations on PersonReference, User, Risk, and Register", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

  assert.match(schema, /responseActionOwners\s+ResponseAction\[\]\s+@relation\("ResponseActionOwnerPerson"\)/);
  assert.match(schema, /responseActionsOwned\s+ResponseAction\[\]\s+@relation\("ResponseActionOwnerUser"\)/);
  assert.match(schema, /responseActionsCreated\s+ResponseAction\[\]\s+@relation\("ResponseActionCreatedBy"\)/);
  assert.match(schema, /responseActionsUpdated\s+ResponseAction\[\]\s+@relation\("ResponseActionUpdatedBy"\)/);
  assert.match(schema, /responseActionsDeleted\s+ResponseAction\[\]\s+@relation\("ResponseActionDeletedBy"\)/);
  assert.match(schema, /riskResponseActionLinksCreated\s+RiskResponseAction\[\]\s+@relation\("RiskResponseActionCreatedBy"\)/);
  assert.match(schema, /responseActionLinks\s+RiskResponseAction\[\]\s+@relation\("RiskResponseActions"\)/);
  assert.match(schema, /responseActionLinks\s+RiskResponseAction\[\]\s+@relation\("RegisterResponseActions"\)/);
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

test("EffectiveRegisterRole includes RESPONSE_ACTION_OWNER between NONE and RISK_OWNER", async () => {
  const { highestRole, roleAtLeast } = await import("../src/permissions/effectiveRole.ts");

  // Rank ordering
  assert.equal(highestRole(["NONE", "RESPONSE_ACTION_OWNER"]), "RESPONSE_ACTION_OWNER");
  assert.equal(highestRole(["RESPONSE_ACTION_OWNER", "RISK_OWNER"]), "RISK_OWNER");
  assert.equal(highestRole(["RESPONSE_ACTION_OWNER", "REGISTER_VIEWER"]), "REGISTER_VIEWER");

  // roleAtLeast
  assert.equal(roleAtLeast("RESPONSE_ACTION_OWNER", "NONE"), true);
  assert.equal(roleAtLeast("RESPONSE_ACTION_OWNER", "RESPONSE_ACTION_OWNER"), true);
  assert.equal(roleAtLeast("RESPONSE_ACTION_OWNER", "RISK_OWNER"), false);
  assert.equal(roleAtLeast("NONE", "RESPONSE_ACTION_OWNER"), false);
});

test("getEffectiveRegisterRole checks action ownership in registerAccess", async () => {
  const source = await readFile(new URL("../src/permissions/registerAccess.ts", import.meta.url), "utf8");

  assert.match(source, /riskResponseAction\.findFirst/);
  assert.match(source, /responseAction:\s*\{/);
  assert.match(source, /ownerUserId: actor\.id/);
  assert.match(source, /isDeleted: false/);
  assert.match(source, /RESPONSE_ACTION_OWNER/);
});

test("listAccessibleRegisterIds includes registers where actor owns action links", async () => {
  const source = await readFile(new URL("../src/permissions/registerAccess.ts", import.meta.url), "utf8");

  assert.match(source, /riskResponseAction\.findMany/);
  assert.match(source, /ownedActionLinks/);
});

test("canViewRisk includes Response Action Owner check", async () => {
  const source = await readFile(new URL("../src/permissions/riskAccess.ts", import.meta.url), "utf8");

  assert.match(source, /riskResponseAction\.findFirst/);
  assert.match(source, /ownsLinkedAction/);
  assert.match(source, /return ownsLinkedAction !== null/);
});

test("actionAccess.ts defines canViewAction, canEditAction, canDeleteAction", async () => {
  const source = await readFile(new URL("../src/permissions/actionAccess.ts", import.meta.url), "utf8");

  assert.match(source, /export async function canViewAction/);
  assert.match(source, /export async function canEditAction/);
  assert.match(source, /export async function canDeleteAction/);
});

test("canDeleteAction only allows System Admin and Register Admin", async () => {
  const source = await readFile(new URL("../src/permissions/actionAccess.ts", import.meta.url), "utf8");

  // Should check for REGISTER_ADMIN role only (no RISK_OWNER or RESPONSE_ACTION_OWNER)
  assert.match(source, /role === "REGISTER_ADMIN"/);
});

test("requirePermission.ts exports requireActionView and requireActionOwner", async () => {
  const source = await readFile(new URL("../src/middleware/requirePermission.ts", import.meta.url), "utf8");

  assert.match(source, /export function requireActionView/);
  assert.match(source, /export function requireActionOwner/);
  assert.match(source, /canViewAction/);
  assert.match(source, /canEditAction/);
});

// ---------------------------------------------------------------------------
// Audit constants
// ---------------------------------------------------------------------------

test("auditActions includes all four response action events", async () => {
  const { auditActions } = await import("../src/audit/auditActions.ts");

  assert.equal(auditActions.responseActionCreated, "RESPONSE_ACTION_CREATED");
  assert.equal(auditActions.responseActionUpdated, "RESPONSE_ACTION_UPDATED");
  assert.equal(auditActions.responseActionDeleted, "RESPONSE_ACTION_DELETED");
  assert.equal(auditActions.responseActionMigrated, "RESPONSE_ACTION_MIGRATED");
});

// ---------------------------------------------------------------------------
// Response Actions service
// ---------------------------------------------------------------------------

test("responseActions service exports all CRUD functions", async () => {
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.match(source, /export async function listActions/);
  assert.match(source, /export async function getAction/);
  assert.match(source, /export async function createAction/);
  assert.match(source, /export async function updateAction/);
  assert.match(source, /export async function deleteAction/);
});

test("responseActions service guards on CHILD_RECORDS mode", async () => {
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.match(source, /assertRegisterChildRecordsMode/);
  assert.match(source, /CHILD_RECORDS/);
  assert.match(source, /INVALID_MODE/);
});

test("responseActions service emits audit events for all mutations", async () => {
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.match(source, /auditActions\.responseActionCreated/);
  assert.match(source, /auditActions\.responseActionUpdated/);
  assert.match(source, /auditActions\.responseActionDeleted/);
});

test("responseActions service enforces field restrictions for Response Action Owners", async () => {
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.match(source, /isResponseActionOwnerOnly/);
  assert.match(source, /Response Action Owners may not change the owner field/);
});

test("responseActions service soft-deletes with isDeleted, deletedAt, deletedByUserId", async () => {
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.match(source, /isDeleted: true/);
  assert.match(source, /deletedAt: new Date\(\)/);
  assert.match(source, /deletedByUserId: actor\.id/);
});

// ---------------------------------------------------------------------------
// registers.service.ts — migration logic (guard + delegation)
// ---------------------------------------------------------------------------

test("registers service imports and delegates to migrateSimpleResponseActionsToChildRecords", async () => {
  const source = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");

  // The function was moved to responseActions.service; registers.service imports and calls it
  assert.match(source, /migrateSimpleResponseActionsToChildRecords/);
  assert.match(source, /FOR UPDATE/);
});

test("registers service blocks direct-PATCH revert from CHILD_RECORDS to SIMPLE", async () => {
  const source = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");

  assert.match(source, /INVALID_OPERATION/);
  assert.match(source, /Cannot revert from Child Records mode to Simple mode/);
});

// ---------------------------------------------------------------------------
// responseActions.service.ts — migration helpers (ADR-0011 amendments A & B)
// ---------------------------------------------------------------------------

test("responseActions service exports migrateSimpleResponseActionsToChildRecords", async () => {
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.match(source, /export async function migrateSimpleResponseActionsToChildRecords/);
  assert.match(source, /auditActions\.responseActionMigrated/);
  assert.match(source, /Response action migrated from simple field during mode switch/);
});

test("responseActions service exports migrateChildRecordsToSimple", async () => {
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.match(source, /export async function migrateChildRecordsToSimple/);
});

test("responseActions service uses REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS impact code", async () => {
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.match(source, /REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS/);
});

test("responseActions service migrateChildRecordsToSimple queries use r.is_active, not r.is_deleted", async () => {
  // Regression: queries previously used r.is_deleted = false (wrong column); corrected to r.is_active = true
  const source = await readFile(new URL("../src/services/responseActions.service.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /r\.is_deleted/, "r.is_deleted is not a column on the risk table — must use r.is_active");
  assert.match(source, /r\.is_active\s*=\s*true/, "migrateChildRecordsToSimple must filter on r.is_active = true");
});

// ---------------------------------------------------------------------------
// configVersion.service.ts — analyseImpact structured entries (ADR-0011 amendments)
// ---------------------------------------------------------------------------

test("configVersion service analyseImpact returns impactEntries array", async () => {
  const source = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  assert.match(source, /export async function analyseImpact/);
  assert.match(source, /impactEntries/);
});

test("configVersion service analyseImpact emits REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS code", async () => {
  const source = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  assert.match(source, /REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS/);
});

test("configVersion service analyseImpact emits REVERT_MODE_WILL_MIGRATE code", async () => {
  const source = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  assert.match(source, /REVERT_MODE_WILL_MIGRATE/);
});

test("configVersion service analyseImpact feasibility query uses r.is_active, not r.is_deleted", async () => {
  // Regression: query previously used r.is_deleted = false (wrong column); corrected to r.is_active = true
  const source = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /r\.is_deleted/, "r.is_deleted is not a column on the risk table — must use r.is_active");
  assert.match(source, /r\.is_active\s*=\s*true/, "analyseImpact feasibility query must filter on r.is_active = true");
});

test("registers service includes responseActionMode in registerSelect", async () => {
  const source = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");

  assert.match(source, /responseActionMode: true/);
});

test("registers schema accepts responseActionMode field", async () => {
  const source = await readFile(new URL("../src/validators/registers.schemas.ts", import.meta.url), "utf8");

  assert.match(source, /responseActionMode/);
  assert.match(source, /SIMPLE.*CHILD_RECORDS|CHILD_RECORDS.*SIMPLE/);
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

test("responseActions routes file defines all five endpoints", async () => {
  const source = await readFile(new URL("../src/routes/responseActions.routes.ts", import.meta.url), "utf8");

  assert.match(source, /router\.get\(\s*"\/:registerId\/risks\/:riskId\/actions"/);
  assert.match(source, /router\.post\(\s*"\/:registerId\/risks\/:riskId\/actions"/);
  assert.match(source, /router\.get\(\s*"\/:registerId\/risks\/:riskId\/actions\/:actionId"/);
  assert.match(source, /router\.patch\(\s*"\/:registerId\/risks\/:riskId\/actions\/:actionId"/);
  assert.match(source, /router\.delete\(\s*"\/:registerId\/risks\/:riskId\/actions\/:actionId"/);
});

test("responseActions routes are mounted in the main router", async () => {
  const source = await readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8");

  assert.match(source, /createResponseActionsSubRouter/);
  assert.match(source, /\/registers.*createResponseActionsSubRouter/);
});

test("DELETE action route uses requireActionView middleware (not requireActionOwner)", async () => {
  const source = await readFile(new URL("../src/routes/responseActions.routes.ts", import.meta.url), "utf8");

  // Delete uses requireActionView to allow SA and RA through (canDeleteAction enforced in service)
  const deleteSection = source.slice(source.indexOf("router.delete"));
  assert.match(deleteSection, /requireActionView/);
});

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

test("shared types include ResponseAction, ResponseActionMode, ResponseActionStatus, ResponseActionOwner", async () => {
  const source = await readFile(new URL("../../shared/src/types/index.ts", import.meta.url), "utf8");

  assert.match(source, /ResponseActionStatus/);
  assert.match(source, /ResponseActionMode/);
  assert.match(source, /ResponseActionOwner/);
  assert.match(source, /ResponseAction/);
});

// ---------------------------------------------------------------------------
// registerConfig service
// ---------------------------------------------------------------------------

test("registerConfig service exports isFieldVisibleToResponseActionOwner", async () => {
  const source = await readFile(new URL("../src/services/registerConfig.service.ts", import.meta.url), "utf8");

  assert.match(source, /export function isFieldVisibleToResponseActionOwner/);
  assert.match(source, /visibleToRiskResponseOwners/);
});

test("registerConfig service includes responseActionMode in registerConfigSelect so risk-form-config returns it", async () => {
  const source = await readFile(new URL("../src/services/registerConfig.service.ts", import.meta.url), "utf8");

  // registerConfigSelect must opt in to responseActionMode
  assert.match(source, /responseActionMode:\s*true/);
  // getRiskFormConfig must spread the register object (which carries responseActionMode) into its return value
  assert.match(source, /\.\.\.register/);
});

// ---------------------------------------------------------------------------
// Risk GET — mode-aware extension
// ---------------------------------------------------------------------------

test("getRiskDetail includes responseActionMode in response", async () => {
  const source = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  assert.match(source, /responseActionMode: risk\.register\.responseActionMode/);
});

test("getRiskDetail filters fields for RESPONSE_ACTION_OWNER in child records mode", async () => {
  const source = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  assert.match(source, /isResponseActionOwnerOnly/);
  assert.match(source, /isFieldVisibleToResponseActionOwner/);
  assert.match(source, /RESPONSE_ACTION_OWNER/);
});

test("apiError.ts includes INVALID_MODE and INVALID_OPERATION codes", async () => {
  const source = await readFile(new URL("../src/errors/apiError.ts", import.meta.url), "utf8");

  assert.match(source, /"INVALID_MODE"/);
  assert.match(source, /"INVALID_OPERATION"/);
});

// ---------------------------------------------------------------------------
// Regression: legacy snapshots with responseActionMode === undefined must be
// treated as a no-op by both analyseImpact and publishDraft.
//
// Before the fix, an absent snapshotMode was coerced to "SIMPLE" by
// normalizeSnapshot, causing spurious revert migrations on legacy drafts.
// The service now reads snapshotMode directly from the raw snapshot (not the
// normalised copy) and skips all mode-change logic when it is undefined.
// ---------------------------------------------------------------------------

test("configVersion service analyseImpact reads snapshotMode from raw snapshot, not normalised snapshot", async () => {
  // The fix: snapshotMode is read via a cast that allows undefined to propagate
  // (snapshot.register as { responseActionMode?: string }).responseActionMode
  // rather than from the normalised snapshot where the field is always present.
  const source = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  // The cast that preserves undefined must appear inside analyseImpact.
  // A plain snapshot.register.responseActionMode read (without the optional cast)
  // would rely on the type having the field non-optional, which would not catch
  // the undefined case from legacy snapshots.
  assert.match(
    source,
    /responseActionMode\?:/,
    "snapshotMode must be read through an optional-field cast so undefined is preserved for legacy snapshots"
  );
});

test("configVersion service analyseImpact guards all mode-migration impact entries behind snapshotMode !== undefined", async () => {
  const source = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  // The guard must appear: any mode-migration code (CHILD_RECORDS checks,
  // blockers/warnings about migration) is skipped when snapshotMode is absent.
  // Verify the guard pattern is present in analyseImpact.
  assert.match(
    source,
    /if\s*\(\s*snapshotMode\s*!==\s*undefined\s*\)/,
    "analyseImpact must guard all mode-migration logic behind snapshotMode !== undefined"
  );
});

test("configVersion service publishDraft guards responseActionMode update behind snapshotMode !== undefined", async () => {
  const source = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  // The register.update call must only include responseActionMode in its data
  // object when snapshotMode is defined — confirmed by the spread conditional.
  assert.match(
    source,
    /snapshotMode\s*!==\s*undefined\s*\?\s*\{\s*responseActionMode\s*:/,
    "publishDraft must only write responseActionMode to the register when snapshotMode is explicitly defined"
  );
});

test("configVersion service publishDraft guards migration calls behind snapshotMode !== undefined", async () => {
  const source = await readFile(new URL("../src/services/configVersion.service.ts", import.meta.url), "utf8");

  // Both migrateSimpleResponseActionsToChildRecords and migrateChildRecordsToSimple
  // must only be invoked when snapshotMode !== undefined.
  // Confirm the combined guard wraps the migration dispatch.
  assert.match(
    source,
    /if\s*\(\s*snapshotMode\s*!==\s*undefined\s*&&\s*snapshotMode\s*!==\s*currentMode\s*\)/,
    "publishDraft must guard migration dispatch with snapshotMode !== undefined && snapshotMode !== currentMode"
  );
});
