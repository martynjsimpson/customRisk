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
