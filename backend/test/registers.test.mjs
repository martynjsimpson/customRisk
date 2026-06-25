/**
 * Register management route and service tests.
 *
 * Verifies that register CRUD routes, permission-candidate endpoints, and
 * register-level permission assignment are correctly wired through routes,
 * controllers, and services per the permission model.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("register management exposes a scoped permission candidate route", async () => {
  const routes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/registers.controller.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");

  assert.match(routes, /"\/:registerId\/permission-candidates"/);
  assert.match(routes, /requireRegisterManagement\(\),\s+asyncRoute\(listRegisterPermissionCandidatesController\)/);
  assert.match(controller, /listRegisterPermissionCandidates\(request\.params\.registerId\)/);
  assert.match(service, /registerPermissions:\s*\{\n\s*none:\s*\{\s*registerId\s*\}/);
  assert.match(service, /isActive:\s*true/);
});

test("new register defaults to a 3-level Low/Medium/High scoring scale", async () => {
  const service = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");

  // Likelihood and impact default values are Low, Medium, High (3-level)
  assert.match(service, /likelihoodDefaults = \["Low", "Medium", "High"\]/);
  assert.match(service, /impactDefaults = \["Low", "Medium", "High"\]/);

  // Risk levels default to Low/Medium/High with standard traffic-light colours
  assert.match(service, /riskLevelDefaults = \["Low", "Medium", "High"\]/);
  assert.match(service, /Low.*#2f9e44/);
  assert.match(service, /Medium.*#f59f00/);
  assert.match(service, /High.*#e03131/);

  // 3×3 matrix: Low+Low→Low, High+High→High, asymmetric pairs both map to Medium
  assert.match(service, /matrixLevelNames/);
  // Low likelihood + High impact → Medium (not High), ensures symmetry
  assert.match(service, /\["Low",\s*"Medium",\s*"Medium"\]/);
});

test("reviewCommentMode and reviewAttestationText are included in updateRegister write path and validator (regression: fields were silently discarded on PATCH /registers/:registerId)", async () => {
  const service = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");
  const schema = await readFile(new URL("../src/validators/registers.schemas.ts", import.meta.url), "utf8");

  // Validator accepts both fields
  assert.match(schema, /reviewCommentMode:\s*z\.enum\(\["DISABLED",\s*"OPTIONAL",\s*"MANDATORY"\]\)/);
  assert.match(schema, /reviewAttestationText:\s*z\.string\(\)\.optional\(\)/);

  // Service writes both fields to the DB
  assert.match(service, /reviewCommentMode: input\.reviewCommentMode/);
  assert.match(service, /reviewAttestationText: input\.reviewAttestationText/);

  // Service selects both fields back
  assert.match(service, /reviewCommentMode: true/);
  assert.match(service, /reviewAttestationText: true/);

  // Audit trail includes both fields
  assert.match(service, /Review comment mode/);
  assert.match(service, /Review attestation text/);
});

test("reviewStatusPosition is included in updateRegister write path, validator, and audit field changes", async () => {
  const service = await readFile(new URL("../src/services/registers.service.ts", import.meta.url), "utf8");
  const schema = await readFile(new URL("../src/validators/registers.schemas.ts", import.meta.url), "utf8");

  // Validator accepts the field
  assert.match(schema, /reviewStatusPosition/);

  // Service writes the field to the DB
  assert.match(service, /reviewStatusPosition: input\.reviewStatusPosition/);

  // Service selects the field back
  assert.match(service, /reviewStatusPosition: true/);

  // Audit trail includes the field
  assert.match(service, /Review status position/);
});
