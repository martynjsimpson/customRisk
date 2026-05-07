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
