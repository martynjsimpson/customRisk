import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("permission helpers cover system, register, viewer, owner, and export access", async () => {
  const registerAccess = await readFile(new URL("../src/permissions/registerAccess.ts", import.meta.url), "utf8");
  const riskAccess = await readFile(new URL("../src/permissions/riskAccess.ts", import.meta.url), "utf8");
  const riskService = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  assert.match(registerAccess, /actor\.isSystemAdmin/);
  assert.match(registerAccess, /REGISTER_ADMIN/);
  assert.match(registerAccess, /REGISTER_VIEWER/);
  assert.match(registerAccess, /ownerUserId:\s*actor\.id/);
  assert.match(registerAccess, /allowViewerExport/);
  assert.match(registerAccess, /role === "REGISTER_ADMIN"/);
  assert.match(registerAccess, /role === "REGISTER_VIEWER" && register\.allowViewerExport/);

  assert.match(riskAccess, /role === "REGISTER_ADMIN" \|\| role === "REGISTER_VIEWER"/);
  assert.match(riskAccess, /ownerUserId:\s*actor\.id/);
  assert.match(riskAccess, /role === "REGISTER_ADMIN"/);
  const canEditRiskBody = riskAccess.match(/export async function canEditRisk[\s\S]*?export async function canDeleteRisk/)?.[0] ?? "";
  assert.doesNotMatch(canEditRiskBody, /REGISTER_VIEWER/);

  assert.match(riskService, /if \(role === "RISK_OWNER"\) \{/);
  assert.match(riskService, /ownerUserId: actor\.id/);
  assert.match(riskService, /ownerPerson: \{ userId: actor\.id \}/);
  assert.match(riskService, /Only System Admins and Register Admins can create risks/);
  assert.match(riskService, /Risk Owners cannot edit Created Date/);
});

test("protected routes use hidden-resource behaviour for inaccessible register and risk resources", async () => {
  const middleware = await readFile(new URL("../src/middleware/requirePermission.ts", import.meta.url), "utf8");
  const routes = await readFile(new URL("../src/routes/risks.routes.ts", import.meta.url), "utf8");

  assert.match(middleware, /function hiddenNotFound\(\)/);
  assert.match(middleware, /new ApiError\(404, "NOT_FOUND", "Resource not found"\)/);
  assert.match(middleware, /requireRegisterAccess/);
  assert.match(middleware, /requireRegisterManagement/);
  assert.match(middleware, /requireRiskView/);
  assert.match(middleware, /requireRiskEdit/);
  assert.match(middleware, /requireExportAccess/);
  assert.match(routes, /requireRiskView\(\)/);
  assert.match(routes, /requireRiskEdit\(\)/);
  assert.match(routes, /requireExportAccess\(\)/);
  assert.match(routes, /requireSystemAdmin/);
});

test("last Register Admin and Register Viewer export permission paths are covered", async () => {
  const registerService = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");
  const riskPanel = await readFile(new URL("../../frontend/src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");

  assert.match(registerService, /Cannot remove the final Register Admin/);
  assert.match(registerService, /adminCount <= 1/);
  assert.match(registerService, /!actor\.isSystemAdmin/);

  assert.match(riskPanel, /register\.effectiveRole === "REGISTER_VIEWER" && register\.allowViewerExport/);
  assert.match(riskPanel, /risk\.owner\?\.id === user\?\.id/);
  assert.match(riskPanel, /canReview=\{canEditSelectedRisk && register\.reviewsEnabled\}/);
  assert.match(riskPanel, /canDelete=\{isSystemAdmin\}/);
});
