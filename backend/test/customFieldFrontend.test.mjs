import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("PM5-10: FieldConfigTab exposes delete flow with usage check and force confirmation", async () => {
  const tab = await readFile(
    new URL("../../frontend/src/features/configuration/FieldConfigTab.tsx", import.meta.url),
    "utf8"
  );

  // System admin check from usePermissions
  assert.match(tab, /usePermissions/);
  assert.match(tab, /isSystemAdmin/);

  // Delete mutation
  assert.match(tab, /deleteFieldMutation/);
  assert.match(tab, /deleteCustomField/);

  // Usage pre-check before confirmation
  assert.match(tab, /getCustomFieldUsage/);
  assert.match(tab, /deleteFieldUsage/);

  // Force flag passed when values exist
  assert.match(tab, /totalValueCount.*>.*0/);
  assert.match(tab, /force.*deleteFieldUsage/);
});

test("PM5-10: CustomFieldTable exposes delete button guarded by isSystemAdmin", async () => {
  const table = await readFile(
    new URL("../../frontend/src/features/configuration/CustomFieldTable.tsx", import.meta.url),
    "utf8"
  );

  assert.match(table, /onDeleteField/);
  assert.match(table, /isSystemAdmin/);
  assert.match(table, /isSystemAdmin && onDeleteField/);
});

test("PM5-10: frontend API includes usage and delete calls", async () => {
  const api = await readFile(
    new URL("../../frontend/src/api/customFields.api.ts", import.meta.url),
    "utf8"
  );

  assert.match(api, /export async function getCustomFieldUsage/);
  assert.match(api, /export async function deleteCustomField/);
  assert.match(api, /force.*true/);
  assert.match(api, /CustomFieldUsage/);
});
