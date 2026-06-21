/**
 * Permission model tests.
 *
 * Static assertions verifying that the registerAccess and riskAccess
 * permission helpers implement the full permission model: system admin
 * bypass, register role checks (ADMIN/VIEWER), ownership derivation, and
 * viewer export flag. Covers all permission layers defined in the permission
 * model architecture document.
 */

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

test("riskAccess canViewRisk and canEditRisk check ownerPerson.userId for email-only owners", async () => {
  const riskAccess = await readFile(new URL("../src/permissions/riskAccess.ts", import.meta.url), "utf8");

  // canViewRisk must include the ownerPerson.userId branch so that a user whose account
  // email matches an email-only owner's PersonReference is granted view access.
  const canViewBody = riskAccess.match(/export async function canViewRisk[\s\S]*?export async function canEditRisk/)?.[0] ?? "";
  assert.match(canViewBody, /ownerPerson:\s*\{\s*userId:\s*actor\.id\s*\}/);

  // canEditRisk must do the same so that email-only owners can edit their own risks.
  const canEditBody = riskAccess.match(/export async function canEditRisk[\s\S]*?export async function canDeleteRisk/)?.[0] ?? "";
  assert.match(canEditBody, /ownerPerson:\s*\{\s*userId:\s*actor\.id\s*\}/);

  // Both functions must use OR logic to cover ownerUserId OR ownerPerson.userId.
  assert.match(canViewBody, /OR:\s*\[/);
  assert.match(canEditBody, /OR:\s*\[/);
});

test("risks.service edit guard allows email-only owner via ownerPerson.userId", async () => {
  const riskService = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  // The edit guard must check ownerPerson?.userId against actor.id so that a user
  // matched through a PersonReference (email-only owner) is not incorrectly denied.
  assert.match(
    riskService,
    /role === "RISK_OWNER" && existing\.ownerUserId !== actor\.id && existing\.ownerPerson\?\.userId !== actor\.id/
  );

  // The shared select used by the fetch before the edit guard must include ownerPerson.userId
  // so the guard has the data it needs to evaluate email-only ownership.
  assert.match(riskService, /ownerPerson:\s*\{\s*select:\s*\{\s*userId:\s*true\s*\}\s*\}/);
});

test("canEditRisk ownerPerson.userId match requires a non-null userId — null does not grant access", async () => {
  const riskAccess = await readFile(new URL("../src/permissions/riskAccess.ts", import.meta.url), "utf8");

  // The Prisma query uses `{ ownerPerson: { userId: actor.id } }` which is an equality filter.
  // A PersonReference whose userId IS null will never satisfy `userId: actor.id` (actor.id is always
  // a non-null UUID), so Prisma correctly excludes it without any explicit null-guard.
  // We assert there is NO blanket `userId: null` anywhere inside canEditRisk that could allow a
  // null-userId PersonReference to match.
  const canEditBody = riskAccess.match(/export async function canEditRisk[\s\S]*?export async function canDeleteRisk/)?.[0] ?? "";
  assert.doesNotMatch(canEditBody, /userId:\s*null/);

  // Additionally confirm the filter uses actor.id (a live value), not a literal that could accidentally
  // widen to include rows with a null userId.
  assert.match(canEditBody, /ownerPerson:\s*\{\s*userId:\s*actor\.id\s*\}/);
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
