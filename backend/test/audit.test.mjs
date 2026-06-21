/**
 * Audit log schema and utility tests.
 *
 * Verifies the audit query schema, CSV export utilities, and static route
 * assertions confirming the audit log endpoint is correctly gated and
 * structured per the audit model specification.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { auditQuerySchema } from "../src/validators/audit.schemas.ts";
import { buildCsv, escapeCsvValue } from "../src/utils/csv.ts";

test("audit query schema supports all audit filters including search and actorName", () => {
  const parsed = auditQuerySchema.parse({
    page: "2",
    pageSize: "50",
    search: "ISEC-0001",
    actorName: "Alice",
    dateFrom: "2026-05-01",
    dateTo: "2026-05-31",
    actorUserId: "00000000-0000-4000-8000-000000000001",
    action: "RISK_UPDATED",
    objectType: "RISK",
    registerId: "00000000-0000-4000-8000-000000000002",
    riskId: "00000000-0000-4000-8000-000000000003",
    displayRiskId: "ISEC-0001",
    ipAddress: "203.0.113.10"
  });

  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 50);
  assert.equal(parsed.search, "ISEC-0001");
  assert.equal(parsed.actorName, "Alice");
  assert.equal(parsed.action, "RISK_UPDATED");
  assert.equal(parsed.objectType, "RISK");
  assert.equal(parsed.displayRiskId, "ISEC-0001");
});

test("buildAuditWhere applies AND conditions for search and actorName", async () => {
  const service = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");

  // search fans out across summary, objectDisplayName, and displayRiskId
  assert.match(service, /input\.search/);
  assert.match(service, /summary.*contains.*input\.search/);
  assert.match(service, /objectDisplayName.*contains.*input\.search/);
  assert.match(service, /displayRiskId.*contains.*input\.search/);

  // actorName fans out across actorDisplayName and actorEmail
  assert.match(service, /input\.actorName/);
  assert.match(service, /actorDisplayName.*contains.*input\.actorName/);
  assert.match(service, /actorEmail.*contains.*input\.actorName/);

  // both use AND so they combine cleanly with other filters
  assert.match(service, /where\.AND = andConditions/);
});

test("audit routes enforce system, register, risk, event, and snapshot access paths", async () => {
  const indexRoutes = await readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8");
  const auditRoutes = await readFile(new URL("../src/routes/audit.routes.ts", import.meta.url), "utf8");
  const registerRoutes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const riskRoutes = await readFile(new URL("../src/routes/risks.routes.ts", import.meta.url), "utf8");

  assert.match(indexRoutes, /router\.use\("\/audit", createAuditRouter\(\)\)/);
  assert.match(auditRoutes, /router\.get\(\n\s+"\/system"/);
  assert.match(auditRoutes, /requireSystemAdmin/);
  assert.match(auditRoutes, /"\/events\/:auditEventId\/snapshot"/);
  assert.match(auditRoutes, /"\/events\/:auditEventId"/);
  assert.match(registerRoutes, /"\/:registerId\/audit"/);
  assert.match(registerRoutes, /requireRegisterManagement\(\)/);
  assert.match(riskRoutes, /"\/:registerId\/risks\/:riskId\/audit"/);
  assert.match(riskRoutes, /requireRiskView\(\)/);
});

test("audit read service restricts event details and snapshots by scope", async () => {
  const service = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");

  assert.match(service, /listSystemAuditEvents/);
  assert.match(service, /System Admin permission is required/);
  assert.match(service, /listRegisterAuditEvents/);
  assert.match(service, /listRiskAuditEvents/);
  assert.match(service, /assertCanReadAuditEvent/);
  assert.match(service, /canViewRisk/);
  assert.match(service, /canManageRegister/);
  assert.match(service, /getAuditEventSnapshot/);
  // IP address is applied as a filter and returned in the mapped response
  assert.match(service, /ipAddress: input\.ipAddress/);
  assert.match(service, /ipAddress: event\.ipAddress/);
});

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
  assert.match(risks, /summary: `Risk \$\{risk\.displayRiskId\} created: \$\{risk\.title\}`/);
  assert.match(risks, /metadataJson: \{/);
  assert.match(risks, /action: auditActions\.riskUpdated/);
  assert.match(risks, /fieldChanges: buildRiskUpdateFieldChanges\(existing, updated\)/);
  assert.match(risks, /action: auditActions\.riskDeleted/);

  assert.match(reviews, /action: auditActions\.riskReviewed/);
  // Risk review embeds field-change detail in the RISK_REVIEWED event; no separate NEXT_REVIEW_DATE_UPDATED event is created
  assert.doesNotMatch(reviews, /action: auditActions\.nextReviewDateUpdated/);
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

test("buildCsv produces CRLF-delimited rows with all values quoted and nulls as empty string", () => {
  const result = buildCsv(
    ["ID", "Actor", "IP Address", "Notes"],
    [
      ["evt-1", "Alice", "203.0.113.1", null],
      ["evt-2", null, undefined, { extra: "data" }]
    ]
  );

  const lines = result.split("\r\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], '"ID","Actor","IP Address","Notes"');
  assert.match(lines[1], /"evt-1"/);
  assert.match(lines[1], /"Alice"/);
  assert.match(lines[1], /"203\.0\.113\.1"/);
  assert.match(lines[1], /,""$/);          // null → ""
  assert.match(lines[2], /^"evt-2",""/);   // null actor → ""
  assert.match(lines[2], /extra/);         // object serialised as JSON

  // escapeCsvValue: plain text passes through, special chars are quoted
  assert.equal(escapeCsvValue(null), "");
  assert.equal(escapeCsvValue(undefined), "");
  assert.equal(escapeCsvValue("plain"), "plain");
  assert.equal(escapeCsvValue('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvValue("a,b"), '"a,b"');
});

test("CSV export headers include IP Address and all required audit columns", async () => {
  const service = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");

  for (const header of [
    "Event ID", "Date/Time", "Actor Name", "Actor Email", "IP Address",
    "Action", "Object Type", "Object", "Scope", "Register", "Risk ID",
    "Summary", "Changed Fields", "Metadata"
  ]) {
    assert.match(service, new RegExp(`"${header}"`), `missing CSV header: ${header}`);
  }

  // eventToCsvRow maps the IP address field from the event
  assert.match(service, /event\.ipAddress/);
  assert.match(service, /eventToCsvRow/);
});

test("CSV export enforces 5,000-row limit and counts rows before fetching data", async () => {
  const service = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");

  assert.match(service, /EXPORT_LIMIT/);
  assert.match(service, /5000/);
  assert.match(service, /count > EXPORT_LIMIT/);
  assert.match(service, /5,000 rows exceeded/);

  // auditEvent.count must appear before auditEvent.findMany in the export functions
  const countPos = service.lastIndexOf("auditEvent.count");
  const findManyPos = service.lastIndexOf("auditEvent.findMany");
  assert.ok(countPos < findManyPos, "row count check must precede data fetch");
});

test("audit CSV export endpoints are registered for system and register scope with correct auth", async () => {
  const auditRoutes = await readFile(new URL("../src/routes/audit.routes.ts", import.meta.url), "utf8");
  const registerRoutes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");

  // System export: inside the audit router, requires system admin
  assert.match(auditRoutes, /\/system\/export/);
  assert.match(auditRoutes, /requireSystemAdmin/);
  assert.match(auditRoutes, /exportSystemAuditController/);

  // Register export: scoped to registerId, requires register management
  assert.match(registerRoutes, /registerId.*audit.*export|audit.*export.*registerId/);
  assert.match(registerRoutes, /requireRegisterManagement/);
  assert.match(registerRoutes, /exportRegisterAuditController/);
});

test("listRiskAuditEvents enforces a hard cap of 100 records ordered by date descending", async () => {
  const service = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");

  // The cap constant must be declared and set to 100
  assert.match(service, /RISK_AUDIT_HISTORY_CAP\s*=\s*100/);

  // listRiskAuditEvents must use take: RISK_AUDIT_HISTORY_CAP (not delegate to listAuditEvents)
  const fnStart = service.indexOf("export async function listRiskAuditEvents");
  const fnEnd = service.indexOf("\nexport async function", fnStart + 1);
  const fnBody = service.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

  assert.match(fnBody, /take:\s*RISK_AUDIT_HISTORY_CAP/);
  assert.match(fnBody, /orderBy:\s*\{\s*occurredAt:\s*"desc"/);
  // Must NOT delegate to the shared listAuditEvents paginator
  assert.doesNotMatch(fnBody, /listAuditEvents/);
});

test("IP address flows from AsyncLocalStorage context through middleware into recorded audit events", async () => {
  const context = await readFile(new URL("../src/audit/auditContext.ts", import.meta.url), "utf8");
  const middleware = await readFile(new URL("../src/middleware/observability.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");

  // Context module wraps AsyncLocalStorage with typed get/run helpers
  assert.match(context, /AsyncLocalStorage/);
  assert.match(context, /runWithAuditContext/);
  assert.match(context, /getAuditIpAddress/);

  // Observability middleware seeds the context so every request carries an IP
  assert.match(middleware, /runWithAuditContext/);
  assert.match(middleware, /ipAddress/);

  // recordAuditEvent reads the context and persists the IP on the event
  assert.match(service, /getAuditIpAddress\(\)/);
  assert.match(service, /ipAddress: getAuditIpAddress\(\)/);
});
