/**
 * Risk field configuration — static assertion tests
 *
 * Verifies that core risk fields are defined once in a shared constant
 * (CORE_RISK_FIELDS) and that the configuration UI renders them correctly:
 *
 * - Core fields are exported from coreRiskFields.ts and consumed by
 *   CustomFieldTable rather than being redefined per-component.
 * - The configuration panel marks core fields as read-only and custom fields
 *   as editable.
 */

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

test("custom field configuration exposes validation modes and persists them through field updates", async () => {
  const modal = await readFile(new URL("../src/features/configuration/CustomFieldModal.tsx", import.meta.url), "utf8");
  const tab = await readFile(new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url), "utf8");
  const customFieldsApi = await readFile(new URL("../src/api/customFields.api.ts", import.meta.url), "utf8");
  const configVersionApi = await readFile(new URL("../src/api/configVersion.api.ts", import.meta.url), "utf8");

  assert.match(customFieldsApi, /export type ValidationMode = "ALLOW" \| "WARN" \| "BLOCK"/);
  assert.match(customFieldsApi, /validationMode: ValidationMode/);
  assert.match(configVersionApi, /"validationMode"/);
  assert.match(modal, /label="Validation mode"/);
  assert.match(modal, /validationModeOptions/);
  assert.match(modal, /form\.getInputProps\("validationMode"\)/);
  assert.match(tab, /validationMode: field\.validationMode/);
  assert.match(tab, /validationMode:\s*editingField\.fieldType === "CALCULATED" \? "ALLOW" : values\.validationMode/);
  assert.match(tab, /validationMode:\s*values\.fieldType === "CALCULATED" \? undefined : values\.validationMode/);
});

test("custom field options modal shows activate or deactivate based on option state and wires activation through option updates", async () => {
  const modal = await readFile(new URL("../src/features/configuration/CustomFieldOptionsModal.tsx", import.meta.url), "utf8");
  const tab = await readFile(new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url), "utf8");

  assert.match(modal, /editorOpened:\s*boolean/);
  assert.match(modal, /Add option/);
  assert.match(modal, /title=\{editingOption \? "Edit option" : "Add option"\}/);
  assert.match(modal, /<Button onClick=\{onClose\}>[\s\S]*Save[\s\S]*<\/Button>/);
  assert.match(modal, /option\.isActive \?\s*\(/);
  assert.match(modal, /Deactivate/);
  assert.match(modal, /:\s*\(\s*<Button[\s\S]*?Activate/);
  assert.match(modal, /onOpenCreate:\s*\(\)\s*=>\s*void/);
  assert.match(modal, /onOpenEdit:\s*\(option:\s*CustomFieldOption\)\s*=>\s*void/);
  assert.match(modal, /onActivate:\s*\(optionId:\s*string\)\s*=>\s*void/);
  assert.match(tab, /editorOpened=\{optionEditorOpen\}/);
  assert.match(tab, /onOpenCreate=\{\(\) =>/);
  assert.match(tab, /onOpenEdit=\{\(option\) =>/);
  assert.match(tab, /onActivate=\{\(optionId\) =>/);
  assert.match(tab, /updateOptionMutation\.mutate\(\{\s*fieldId:\s*selectedField\.id,\s*optionId,\s*values:\s*\{\s*isActive:\s*true\s*\}\s*\}\)/s);
  assert.match(tab, /onDeactivate=\{\(optionId\) =>/);
});

test("BUG-050: CustomFieldModal forces validationMode to ALLOW for CALCULATED fields on submit", async () => {
  const modal = await readFile(new URL("../src/features/configuration/CustomFieldModal.tsx", import.meta.url), "utf8");

  // The onSubmit handler must inspect fieldType and override validationMode to ALLOW for CALCULATED
  assert.match(modal, /isCalculated.*=.*fieldType.*===.*"CALCULATED"/);
  assert.match(modal, /validationMode.*isCalculated.*"ALLOW".*values\.validationMode/s);
});

test("BUG-050: FieldConfigTab sends correct validationMode for CALCULATED fields on create and update", async () => {
  const tab = await readFile(new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url), "utf8");

  // Create path: validationMode must be undefined (not passed) for CALCULATED — CustomFieldModal handles ALLOW
  assert.match(tab, /validationMode:\s*values\.fieldType === "CALCULATED" \? undefined : values\.validationMode/);
  // Update path: validationMode must be explicitly "ALLOW" for CALCULATED so the draft snapshot is not dropped
  assert.match(tab, /validationMode:\s*editingField\.fieldType === "CALCULATED" \? "ALLOW" : values\.validationMode/);
});

test("BUG-050: ALLOW/WARN/BLOCK validation modes remain available for non-CALCULATED field types", async () => {
  const modal = await readFile(new URL("../src/features/configuration/CustomFieldModal.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/api/customFields.api.ts", import.meta.url), "utf8");

  // All three modes must exist as options
  assert.match(modal, /validationModeOptions/);
  assert.match(modal, /"ALLOW"/);
  assert.match(modal, /"WARN"/);
  assert.match(modal, /"BLOCK"/);

  // The API type must still expose all three modes
  assert.match(api, /export type ValidationMode = "ALLOW" \| "WARN" \| "BLOCK"/);
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

// UI-022: debounced formula validation in CustomFieldModal
test("UI-022: CustomFieldModal validates formula client-side with 600ms debounce and blocks Save when invalid", async () => {
  const modal = await readFile(new URL("../src/features/configuration/CustomFieldModal.tsx", import.meta.url), "utf8");

  // Imports the evaluator
  assert.match(modal, /import.*evaluateFormula.*formulaEvaluator/);

  // Uses Mantine's useDebouncedValue at 600ms
  assert.match(modal, /useDebouncedValue.*formula.*600/s);

  // Local state tracks formula validity
  assert.match(modal, /formulaValidation/);

  // Save button is disabled when formula blocks save
  assert.match(modal, /formulaBlocksSave/);
  assert.match(modal, /disabled=\{formulaBlocksSave\}/);

  // Green feedback shown on valid formula
  assert.match(modal, /formulaValidation\.valid/);

  // Red feedback shown on invalid formula (with error text)
  assert.match(modal, /formulaValidation\.error/);
});
