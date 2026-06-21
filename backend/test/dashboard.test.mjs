import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("dashboard routes are mounted under api dashboard path", async () => {
  const indexRoutes = await readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8");
  const dashboardRoutes = await readFile(new URL("../src/routes/dashboard.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/dashboard.controller.ts", import.meta.url), "utf8");

  assert.match(indexRoutes, /router\.use\("\/dashboard", createDashboardRouter\(\)\)/);
  assert.match(dashboardRoutes, /router\.use\(authenticate\)/);
  assert.match(dashboardRoutes, /router\.get\("\/my-work"/);
  assert.match(dashboardRoutes, /router\.get\("\/my-risks"/);
  assert.match(dashboardRoutes, /router\.get\("\/admin-summary"/);
  assert.match(controller, /getMyWork\(actorOrThrow\(request\)\)/);
  assert.match(controller, /getMyRisks\(actorOrThrow\(request\), request\.query\)/);
  assert.match(controller, /getAdminSummary\(actorOrThrow\(request\)\)/);
});

test("dashboard service scopes owner, admin, and system data separately", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  assert.match(service, /ownerUserId: actor\.id/);
  assert.match(service, /role: "REGISTER_ADMIN"/);
  assert.match(service, /Register Admin or System Admin permission is required/);
  assert.match(service, /systemSummary: null/);
  assert.match(service, /recentAuditActivity/);
  assert.match(service, /register: \{ reviewsEnabled: true \}/);
  assert.match(service, /state: \{ not: "CLOSED" \}/);
  assert.match(service, /getDueSoonLimit/);
});

test("my-risks route validates query params with myRisksQuerySchema", async () => {
  const dashboardRoutes = await readFile(new URL("../src/routes/dashboard.routes.ts", import.meta.url), "utf8");

  assert.match(dashboardRoutes, /myRisksQuerySchema/);
  assert.match(dashboardRoutes, /validateRequest\(\{[^}]*query: myRisksQuerySchema/s);
});

test("myRisksQuerySchema accepts valid filter params", async () => {
  const { myRisksQuerySchema } = await import("../src/validators/dashboard.schemas.ts");

  // No params — defaults to empty object
  const empty = myRisksQuerySchema.parse({});
  assert.equal(empty.search, undefined);
  assert.equal(empty.state, undefined);
  assert.equal(empty.riskLevel, undefined);
  assert.equal(empty.registerId, undefined);

  // All params provided
  const full = myRisksQuerySchema.parse({
    search: "  data breach  ",
    state: "OPEN",
    riskLevel: "High",
    registerId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
  });
  assert.equal(full.search, "data breach"); // trimmed
  assert.equal(full.state, "OPEN");
  assert.equal(full.riskLevel, "High");
  assert.equal(full.registerId, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
});

test("myRisksQuerySchema rejects invalid state values", async () => {
  const { myRisksQuerySchema } = await import("../src/validators/dashboard.schemas.ts");

  assert.throws(() => myRisksQuerySchema.parse({ state: "ARCHIVED" }));
});

test("myRisksQuerySchema rejects non-UUID registerId", async () => {
  const { myRisksQuerySchema } = await import("../src/validators/dashboard.schemas.ts");

  assert.throws(() => myRisksQuerySchema.parse({ registerId: "not-a-uuid" }));
});

test("getMyRisks service applies ownership filter including ownerPerson join", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // Both legacy ownerUserId and the joined ownerPerson path must be included
  assert.match(service, /ownerPerson: \{ userId: actor\.id \}/);
  assert.match(service, /ownerUserId: actor\.id/);
});

test("getMyRisks service applies search filter on title and description", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  assert.match(service, /query\.search/);
  assert.match(service, /title: \{ contains: query\.search, mode: "insensitive" \}/);
  assert.match(service, /description: \{ contains: query\.search, mode: "insensitive" \}/);
});

test("getMyRisks service applies riskLevel name filter case-insensitively", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  assert.match(service, /query\.riskLevel/);
  assert.match(service, /riskLevel: \{ name: \{ equals: query\.riskLevel, mode: "insensitive" \} \}/);
});

test("getMyRisks service applies registerId filter", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  assert.match(service, /query\.registerId/);
  assert.match(service, /registerId: query\.registerId/);
});

test("getMyRisks service defaults to excluding closed risks when state param is absent", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // The default exclusion of CLOSED state must remain
  assert.match(service, /state: \{ not: "CLOSED" \}/);
});

test("getMyRisks service accepts explicit state filter overriding the default", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // When a state is supplied it should be applied directly
  assert.match(service, /state: query\.state/);
});

test("my-risks export route is registered under /my-risks/export", async () => {
  const dashboardRoutes = await readFile(new URL("../src/routes/dashboard.routes.ts", import.meta.url), "utf8");

  assert.match(dashboardRoutes, /router\.get\("\/my-risks\/export"/);
  assert.match(dashboardRoutes, /exportMyRisksController/);
  assert.match(dashboardRoutes, /validateRequest\(\{[^}]*query: myRisksQuerySchema/s);
});

test("my-risks export controller sets CSV headers and delegates to exportMyRisksCsv", async () => {
  const controller = await readFile(new URL("../src/controllers/dashboard.controller.ts", import.meta.url), "utf8");

  assert.match(controller, /exportMyRisksCsv\(actorOrThrow\(request\), request\.query\)/);
  assert.match(controller, /text\/csv/);
  assert.match(controller, /Content-Disposition/);
  assert.match(controller, /attachment; filename=/);
});

test("exportMyRisksCsv service delegates to getMyRisks and uses ownership filter", async () => {
  const exportService = await readFile(new URL("../src/services/export.service.ts", import.meta.url), "utf8");

  assert.match(exportService, /exportMyRisksCsv/);
  assert.match(exportService, /getMyRisks\(actor, query\)/);
  assert.match(exportService, /myRisksExportGenerated/);
  assert.match(exportService, /my-risks\.csv/);
});

test("exportMyRisksCsv service records audit event with SYSTEM scope", async () => {
  const exportService = await readFile(new URL("../src/services/export.service.ts", import.meta.url), "utf8");

  assert.match(exportService, /scopeType: "SYSTEM"/);
  assert.match(exportService, /objectId: actor\.id/);
});

test("exportMyRisksCsv CSV includes Register column absent from per-register export", async () => {
  const exportService = await readFile(new URL("../src/services/export.service.ts", import.meta.url), "utf8");

  // My-risks export spans multiple registers so must include register name
  assert.match(exportService, /"Register"/);
});

test("myRisksExportGenerated audit action is defined", async () => {
  const { auditActions } = await import("../src/audit/auditActions.ts");

  assert.equal(auditActions.myRisksExportGenerated, "MY_RISKS_EXPORT_GENERATED");
});

// ---------------------------------------------------------------------------
// BUG-057 — Admin summary must exclude soft-deleted (isActive: false) registers
//
// Three code paths in dashboard.service.ts must filter on isActive: true:
//   1. listAdminRegisterIds (system admin branch) — register enumeration
//   2. buildRegisterSummary — per-register detail lookup
//   3. getAdminSummary (system summary block) — totalRegisters aggregate count
//
// These static assertions guard against any one of the three filters being
// accidentally dropped — a regression that would cause inactive registers to
// reappear in the Admin summary widget.
// ---------------------------------------------------------------------------

test("BUG-057: listAdminRegisterIds system admin branch filters on isActive: true", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // The system admin branch of listAdminRegisterIds must scope to active registers only.
  // A naive implementation that omits this filter would return soft-deleted registers.
  assert.match(service, /listAdminRegisterIds[\s\S]{0,300}isSystemAdmin[\s\S]{0,300}where: \{ isActive: true \}/);
});

test("BUG-057: buildRegisterSummary looks up register with isActive: true guard", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // buildRegisterSummary must use a compound where clause that includes isActive: true
  // so that a deleted register causes findUnique to return null and the summary is dropped.
  assert.match(service, /buildRegisterSummary[\s\S]{0,400}where: \{ id: registerId, isActive: true \}/);
});

test("BUG-057: getAdminSummary totalRegisters count filters on isActive: true", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // The system-level register count must exclude inactive registers.
  // Without isActive: true the widget would report a count higher than the visible register list.
  assert.match(service, /prisma\.register\.count\(\{ where: \{ isActive: true \} \}\)/);
});
