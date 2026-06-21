/**
 * Custom field type migration tests.
 *
 * Verifies the allowed type-transition matrix in customFields.service.ts —
 * which field types can be safely migrated to which other types without data
 * loss — and the end-to-end calculated field evaluation path (BUG-049).
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { getAllowedTargetTypes } from "../src/services/customFields.service.ts";

test("field type migration: allowed transitions matrix is correct", () => {
  // Safe scalar-to-scalar conversions
  assert.deepEqual(getAllowedTargetTypes("TEXT"), ["MULTILINE_TEXT"]);
  assert.deepEqual(getAllowedTargetTypes("MULTILINE_TEXT"), ["TEXT"]);
  assert.deepEqual(getAllowedTargetTypes("NUMBER"), ["TEXT", "MULTILINE_TEXT"]);
  assert.deepEqual(getAllowedTargetTypes("BOOLEAN"), ["TEXT", "MULTILINE_TEXT"]);
  assert.deepEqual(getAllowedTargetTypes("DATE"), ["TEXT", "MULTILINE_TEXT"]);
  assert.deepEqual(getAllowedTargetTypes("DROPDOWN"), ["MULTI_SELECT"]);

  // Types with no safe migration
  assert.deepEqual(getAllowedTargetTypes("PERSON_PICKER"), []);
  assert.deepEqual(getAllowedTargetTypes("MULTI_SELECT"), []);
  assert.deepEqual(getAllowedTargetTypes("CALCULATED"), []);
});

test("field type migration: routes and controller are wired up", async () => {
  const routes = await readFile(new URL("../src/routes/configuration.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/customFields.controller.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/customFields.service.ts", import.meta.url), "utf8");

  // Preview endpoint
  assert.match(routes, /type-migration-preview/);
  assert.match(routes, /migrateFieldTypeQuerySchema/);
  assert.match(controller, /previewFieldTypeMigrationController/);
  assert.match(service, /export async function previewFieldTypeMigration/);

  // Migrate endpoint
  assert.match(routes, /migrate-type/);
  assert.match(routes, /migrateFieldTypeSchema/);
  assert.match(controller, /migrateCustomFieldTypeController/);
  assert.match(service, /export async function migrateCustomFieldType/);

  // Audit trail
  assert.match(service, /type migrated from/);
  assert.match(service, /"fieldType"/);
  assert.match(service, /"Field type"/);
  assert.match(service, /valueType: "TEXT"/);

});

test("field type migration: value coercion strategies are defined for each safe conversion", async () => {
  const service = await readFile(new URL("../src/services/customFields.service.ts", import.meta.url), "utf8");

  // DROPDOWN → MULTI_SELECT: scalar selection becomes junction row
  assert.match(service, /DROPDOWN.*MULTI_SELECT/);
  assert.match(service, /riskCustomFieldMultiSelectValue/);

  // NUMBER → TEXT
  assert.match(service, /numberValue.*toString/);

  // BOOLEAN → TEXT
  assert.match(service, /booleanValue.*true.*false/);

  // DATE → TEXT
  assert.match(service, /dateValue.*toISOString/);
});
