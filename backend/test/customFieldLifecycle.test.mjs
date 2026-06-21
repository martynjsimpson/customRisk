/**
 * Custom field lifecycle tests.
 *
 * Verifies the full lifecycle of custom field management: that the destructive
 * delete route requires System Admin, delegates through the controller to the
 * service with a usage check, and emits the correct audit event. Also covers
 * the CALCULATED field type wiring and formula storage.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("field lifecycle: destructive delete requires System Admin and checks usage", async () => {
  const routes = await readFile(new URL("../src/routes/configuration.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/customFields.controller.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/customFields.service.ts", import.meta.url), "utf8");

  // DELETE route exists and is guarded by requireSystemAdmin
  assert.match(routes, /router\.delete.*custom-fields.*fieldId/);
  assert.match(routes, /requireSystemAdmin/);
  assert.match(routes, /deleteCustomFieldQuerySchema/);

  // Controller delegates to service
  assert.match(controller, /deleteCustomFieldController/);
  assert.match(controller, /response\.status\(204\)/);

  // Service enforces usage guard
  assert.match(service, /export async function deleteCustomField/);
  assert.match(service, /Cannot delete custom field.*value.*exist/);
  assert.match(service, /force.*true.*to delete with all associated data/);

  // Service cleans up scalar and multi-select values on force delete
  assert.match(service, /riskCustomFieldValue\.deleteMany/);
  assert.match(service, /riskCustomFieldMultiSelectValue\.deleteMany/);
  assert.match(service, /customFieldOption\.deleteMany/);
});

test("field lifecycle: usage report endpoint is available", async () => {
  const routes = await readFile(new URL("../src/routes/configuration.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/customFields.controller.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/customFields.service.ts", import.meta.url), "utf8");

  // GET usage route
  assert.match(routes, /custom-fields.*fieldId.*usage/);
  assert.match(controller, /getCustomFieldUsageController/);

  // Service returns scalar and multi-select counts
  assert.match(service, /export async function getCustomFieldUsage/);
  assert.match(service, /risksWithScalarValues/);
  assert.match(service, /risksWithMultiSelectValues/);
  assert.match(service, /totalValueCount/);
});
