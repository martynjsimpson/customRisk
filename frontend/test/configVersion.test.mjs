import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("configVersion API module exports all required functions", async () => {
  const api = await readFile(new URL("../src/api/configVersion.api.ts", import.meta.url), "utf8");

  for (const fn of [
    "getConfigVersionStatus",
    "listConfigVersions",
    "createDraft",
    "discardDraft",
    "analyseImpact",
    "publishDraft",
    "exportRegisterConfig",
    "importRegisterConfig"
  ]) {
    assert.match(api, new RegExp(`export async function ${fn}`));
  }

  // Export uses raw fetch with Bearer token (not apiClient) so the browser triggers a file download
  assert.match(api, /getAccessToken\(\)/);
  assert.match(api, /Authorization.*Bearer/);
});

test("templates API module exports all required functions", async () => {
  const api = await readFile(new URL("../src/api/templates.api.ts", import.meta.url), "utf8");

  for (const fn of [
    "listTemplates",
    "getTemplate",
    "createTemplate",
    "createTemplateFromRegister",
    "deactivateTemplate",
    "publishTemplateVersion",
    "createRegisterFromTemplate",
    "compareRegisterToTemplate",
    "applyTemplateUpdateToDraft"
  ]) {
    assert.match(api, new RegExp(`export async function ${fn}`));
  }
});

test("ConfigVersionBanner is gated by flags.draftConfig and canManage", async () => {
  const panel = await readFile(
    new URL("../src/features/configuration/RegisterConfigurationPanel.tsx", import.meta.url),
    "utf8"
  );

  // Both checks must be present before rendering the banner
  assert.match(panel, /flags\.draftConfig && canManage/);
  assert.match(panel, /ConfigVersionBanner/);
  assert.match(panel, /import.*useFeatureFlags/);
});

test("ConfigVersionBanner renders distinct actions for draft vs published state", async () => {
  const banner = await readFile(
    new URL("../src/features/configuration/ConfigVersionBanner.tsx", import.meta.url),
    "utf8"
  );

  // Draft state shows: run impact analysis, publish, discard
  assert.match(banner, /analyseImpact/);
  assert.match(banner, /publishDraft/);
  assert.match(banner, /discardDraft/);

  // No-draft state shows: create draft, export, import, save as template
  assert.match(banner, /createDraft/);
  assert.match(banner, /exportRegisterConfig/);
  assert.match(banner, /importRegisterConfig/);
  assert.match(banner, /createTemplateFromRegister/);

  // Banner queries version status
  assert.match(banner, /getConfigVersionStatus/);

  // Impact analysis result drives the canPublish gate on the Publish button
  assert.match(banner, /canPublish/);
  assert.match(banner, /ImpactAnalysisModal/);
});

test("TemplatesPage returns null and disables query when flag or permission is missing", async () => {
  const page = await readFile(new URL("../src/pages/TemplatesPage.tsx", import.meta.url), "utf8");

  // Query is only enabled when both conditions are met
  assert.match(page, /enabled: flags\.draftConfig && isSystemAdmin/);

  // Early return null when access is not granted
  assert.match(page, /if \(!flags\.draftConfig \|\| !isSystemAdmin\)/);
  assert.match(page, /return null/);

  // Uses both hooks
  assert.match(page, /useFeatureFlags/);
  assert.match(page, /usePermissions/);
  assert.match(page, /isSystemAdmin/);

  // Shows deactivate action on templates
  assert.match(page, /deactivateTemplate/);
});

test("MainLayout renders Templates nav link only for System Admins with draftConfig flag enabled", async () => {
  const layout = await readFile(new URL("../src/layouts/MainLayout.tsx", import.meta.url), "utf8");

  assert.match(layout, /isSystemAdmin && flags\.draftConfig/);
  assert.match(layout, /\/templates/);
  assert.match(layout, /Templates/);

  // Flag is read from useFeatureFlags hook
  assert.match(layout, /useFeatureFlags/);
});

test("registers API exports unlinkRegisterFromTemplate and LinkedTemplate type", async () => {
  const api = await readFile(new URL("../src/api/registers.api.ts", import.meta.url), "utf8");

  assert.match(api, /export async function unlinkRegisterFromTemplate/);
  assert.match(api, /template-link/);
  assert.match(api, /export interface LinkedTemplate/);
  assert.match(api, /linkedTemplate: LinkedTemplate \| null/);
});

test("TemplateLinkPanel renders template link row and gates unlink on isSystemAdmin", async () => {
  const panel = await readFile(
    new URL("../src/features/configuration/TemplateLinkPanel.tsx", import.meta.url),
    "utf8"
  );

  // Returns null when not linked or not canManage
  assert.match(panel, /if \(!canManage.*\) return null/);
  assert.match(panel, /if \(!linked\) return null/);

  // Compare and unlink actions are present
  assert.match(panel, /compareRegisterToTemplate/);
  assert.match(panel, /unlinkRegisterFromTemplate/);
  assert.match(panel, /applyTemplateUpdateToDraft/);

  // Unlink is gated on isSystemAdmin
  assert.match(panel, /isSystemAdmin/);

  // isLatest drives badge colour and Apply latest visibility
  assert.match(panel, /linked\.isLatest/);
  assert.match(panel, /canApplyLatest/);
});

test("RegisterSettingsTab unlocks fields when a draft is in progress", async () => {
  const tab = await readFile(
    new URL("../src/features/configuration/RegisterSettingsTab.tsx", import.meta.url),
    "utf8"
  );

  // Fetches draft status using the shared query key
  assert.match(tab, /getConfigVersionStatus/);
  assert.match(tab, /config-version-status/);
  assert.match(tab, /hasDraft/);

  // settingsLocked is false when a draft exists (fields editable)
  assert.match(tab, /settingsLocked = draftConfigMode && !hasDraft/);

  // disabled props use settingsLocked, not draftConfigMode directly
  assert.match(tab, /disabled=\{!canManage \|\| settingsLocked\}/);

  // When locked, mutation only sends name; when unlocked, sends all fields
  assert.match(tab, /settingsLocked/);
});

test("scoring configuration tabs unlock only when a draft exists and write through updateDraftConfig", async () => {
  const scoringValueTab = await readFile(
    new URL("../src/features/configuration/ScoringValueConfigTab.tsx", import.meta.url),
    "utf8"
  );
  const riskLevelTab = await readFile(
    new URL("../src/features/configuration/RiskLevelConfigTab.tsx", import.meta.url),
    "utf8"
  );
  const matrixTab = await readFile(
    new URL("../src/features/configuration/MatrixConfigTab.tsx", import.meta.url),
    "utf8"
  );
  const api = await readFile(new URL("../src/api/configVersion.api.ts", import.meta.url), "utf8");

  assert.match(api, /export async function updateDraftConfig/);
  assert.match(scoringValueTab, /getConfigVersionStatus/);
  assert.match(scoringValueTab, /const isReadOnly = Boolean\(draftConfigMode\) && !hasDraft/);
  assert.match(scoringValueTab, /updateDraftConfig/);
  assert.match(riskLevelTab, /const isReadOnly = Boolean\(draftConfigMode\) && !hasDraft/);
  assert.match(riskLevelTab, /updateDraftConfig/);
  assert.match(matrixTab, /const isReadOnly = Boolean\(draftConfigMode\) && !hasDraft/);
  assert.match(matrixTab, /updateDraftConfig/);
});

test("field configuration unlocks only when a draft exists and dropdown options stay on the draft snapshot", async () => {
  const fieldTab = await readFile(
    new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url),
    "utf8"
  );
  const optionsModal = await readFile(
    new URL("../src/features/configuration/CustomFieldOptionsModal.tsx", import.meta.url),
    "utf8"
  );
  const registerConfigService = await readFile(
    new URL("../../backend/src/services/registerConfig.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(fieldTab, /getConfigVersionStatus/);
  assert.match(fieldTab, /const isReadOnly = Boolean\(draftConfigMode\) && !hasDraft/);
  assert.match(fieldTab, /enabled: Boolean\(registerId\) && Boolean\(selectedField\) && !hasDraft/);
  assert.match(fieldTab, /const selectedFieldOptions = hasDraft \? \(selectedField\?\.options \?\? \[\]\) : \(optionsQuery\.data \?\? \[\]\);/);
  assert.match(fieldTab, /updateDraftConfig/);
  assert.match(optionsModal, /readOnly\?: boolean/);
  assert.match(registerConfigService, /customFieldDefinitionId: field\.id/);
});
