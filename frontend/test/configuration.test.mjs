import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("core risk fields are defined once in a shared constant", async () => {
  const coreFields = await readFile(
    new URL("../src/features/risks/coreRiskFields.ts", import.meta.url),
    "utf8"
  );

  assert.match(coreFields, /export const CORE_RISK_FIELDS/);
  assert.match(coreFields, /export type CoreRiskFieldId/);

  for (const field of ["title", "description", "state", "createdDate", "ownerUserId",
      "likelihoodValueId", "impactValueId", "responseStrategyId", "responseAction"]) {
    assert.match(coreFields, new RegExp(`"${field}"`));
  }
});

test("configuration panel renders core field anchors from the shared constant", async () => {
  const panel = await readFile(new URL("../src/features/configuration/CustomFieldTable.tsx", import.meta.url), "utf8");

  assert.match(panel, /import.*CORE_RISK_FIELDS.*from.*coreRiskFields/);
  assert.match(panel, /CORE_RISK_FIELDS\.map/);
  assert.match(panel, /kind:\s*"core"/);
});

test("configuration panel marks core fields as read-only and custom fields as editable", async () => {
  const panel = await readFile(new URL("../src/features/configuration/CustomFieldTable.tsx", import.meta.url), "utf8");
  const tab = await readFile(new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url), "utf8");

  assert.match(panel, /field\.kind === "core".*Core/s);
  assert.match(panel, /field\.kind === "custom".*onEditField/s);
  assert.match(panel, /field\.kind === "custom".*onDeactivateField/s);
  assert.match(tab, /invalidateCustomFieldConfiguration/);
  assert.match(tab, /CustomFieldModal/);
  assert.match(tab, /CustomFieldOptionsModal/);
});

test("custom field options modal shows activate or deactivate based on option state and wires activation through option updates", async () => {
  const modal = await readFile(new URL("../src/features/configuration/CustomFieldOptionsModal.tsx", import.meta.url), "utf8");
  const tab = await readFile(new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url), "utf8");

  assert.match(modal, /option\.isActive \?\s*\(/);
  assert.match(modal, /Deactivate/);
  assert.match(modal, /:\s*\(\s*<Button[\s\S]*?Activate/);
  assert.match(modal, /onActivate:\s*\(optionId:\s*string\)\s*=>\s*void/);
  assert.match(tab, /onActivate=\{\(optionId\) =>/);
  assert.match(tab, /updateOptionMutation\.mutate\(\{\s*fieldId:\s*selectedField\.id,\s*optionId,\s*values:\s*\{\s*isActive:\s*true\s*\}\s*\}\)/s);
  assert.match(tab, /onDeactivate=\{\(optionId\) =>/);
});

test("risk form renders custom fields interleaved with core fields by displayOrder", async () => {
  const panel = await readFile(new URL("../src/features/risks/RiskFormModal.tsx", import.meta.url), "utf8");

  assert.match(panel, /import.*CORE_RISK_FIELDS.*from.*coreRiskFields/);
  assert.match(panel, /CORE_RISK_FIELDS\.map/);
  assert.match(panel, /sort\(.*displayOrder.*displayOrder/s);
  assert.match(panel, /field\.kind === "core"/);
  assert.match(panel, /renderCoreField/);
  assert.match(panel, /CustomFieldInput/);
});
