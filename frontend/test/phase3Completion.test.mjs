import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

// P3-06 — Core Field Order Anchors

test("core risk fields are defined once in a shared constant", async () => {
  const coreFields = await readFile(
    new URL("../src/features/risks/coreRiskFields.ts", import.meta.url),
    "utf8"
  );

  assert.match(coreFields, /export const CORE_RISK_FIELDS/);
  assert.match(coreFields, /export type CoreRiskFieldId/);

  // All 9 core fields are present
  assert.match(coreFields, /"title"/);
  assert.match(coreFields, /"description"/);
  assert.match(coreFields, /"state"/);
  assert.match(coreFields, /"createdDate"/);
  assert.match(coreFields, /"ownerUserId"/);
  assert.match(coreFields, /"likelihoodValueId"/);
  assert.match(coreFields, /"impactValueId"/);
  assert.match(coreFields, /"responseStrategyId"/);
  assert.match(coreFields, /"responseAction"/);
});

test("configuration panel renders core field anchors from the shared constant", async () => {
  const panel = await readFile(
    new URL("../src/features/configuration/RegisterConfigurationPanel.tsx", import.meta.url),
    "utf8"
  );

  // Imports the shared constant — not a local copy
  assert.match(panel, /import.*CORE_RISK_FIELDS.*from.*coreRiskFields/);

  // Merges core fields into the ordered field rows
  assert.match(panel, /CORE_RISK_FIELDS\.map/);
  assert.match(panel, /kind:\s*"core"/);
});

test("configuration panel marks core fields as read-only and custom fields as editable", async () => {
  const panel = await readFile(
    new URL("../src/features/configuration/RegisterConfigurationPanel.tsx", import.meta.url),
    "utf8"
  );

  // Core badge shown for core fields
  assert.match(panel, /field\.kind === "core".*Core/s);

  // Edit and deactivate buttons gated on kind === "custom"
  assert.match(panel, /field\.kind === "custom".*openEditField/s);
  assert.match(panel, /field\.kind === "custom".*deactivateFieldMutation/s);
});

test("risk form renders custom fields interleaved with core fields by displayOrder", async () => {
  const panel = await readFile(
    new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url),
    "utf8"
  );

  // Imports the shared constant
  assert.match(panel, /import.*CORE_RISK_FIELDS.*from.*coreRiskFields/);

  // Merges core and custom fields and sorts by displayOrder
  assert.match(panel, /CORE_RISK_FIELDS\.map/);
  assert.match(panel, /sort\(.*displayOrder.*displayOrder/s);

  // Renders core fields via renderCoreField and falls through to CustomFieldInput
  assert.match(panel, /field\.kind === "core"/);
  assert.match(panel, /renderCoreField/);
  assert.match(panel, /CustomFieldInput/);
});
