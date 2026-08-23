/**
 * Config version / draft config — static assertion tests
 *
 * Verifies the draft configuration lifecycle and template features at source level:
 *
 * - configVersion.api.ts and templates.api.ts export all required functions.
 * - ConfigVersionBanner renders draft vs. published actions, always routes publish
 *   through impact analysis, and invalidates the risks query after lifecycle mutations.
 * - FieldConfigTab, MatrixConfigTab, ScoringValueConfigTab, and RiskLevelConfigTab
 *   unlock only when a draft exists and write through updateDraftConfig.
 * - RegisterSettingsTab auto-saves on blur in draft mode, hides the Save button,
 *   and unlocks fields when a draft is in progress.
 * - TemplatesPage and Templates nav link are gated to System Admins with the
 *   draftConfig flag enabled.
 * - Draft and export snapshots preserve validationMode and
 *   customFieldValidationEnabled through publish.
 */

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
  assert.match(tab, /customFieldValidationEnabled/);
  assert.match(tab, /Enable custom field validation/);
});

test("RegisterSettingsTab auto-saves on blur in draft mode and hides the Save button", async () => {
  const tab = await readFile(
    new URL("../src/features/configuration/RegisterSettingsTab.tsx", import.meta.url),
    "utf8"
  );

  // Auto-save: form container onBlur saves only when focus truly leaves the form
  assert.match(tab, /handleFormBlur/);
  assert.match(tab, /onBlur=\{handleFormBlur\}/);
  assert.match(tab, /event\.currentTarget\.contains\(event\.relatedTarget/);
  assert.match(tab, /draftConfigMode && !event\.currentTarget\.contains/);

  // Save button is hidden in draft mode (auto-save replaces it)
  assert.match(tab, /!draftConfigMode/);
  assert.doesNotMatch(tab, /canManage && !settingsLocked && !draftConfigMode\s*\?\s*<Button type="submit">/s);
  assert.match(tab, /canManage && !settingsLocked && !draftConfigMode/);
});

test("MatrixConfigTab has wizardMode prop that auto-saves and hides the Save button", async () => {
  const tab = await readFile(
    new URL("../src/features/configuration/MatrixConfigTab.tsx", import.meta.url),
    "utf8"
  );

  // wizardMode prop exists
  assert.match(tab, /wizardMode\?: boolean/);

  // Auto-save in wizard mode: passes latest snapshot to mutation to avoid stale state
  assert.match(tab, /if \(wizardMode\)/);
  assert.match(tab, /saveMatrixMutation\.mutate\(next\)/);

  // Save button hidden when wizardMode is true
  assert.match(tab, /!isReadOnly && !wizardMode/);

  // Blue alert note in draft mode about recalculation on publish
  assert.match(tab, /Publishing this draft will recalculate risk levels/);

  // ConfigVersionBanner invalidates the risks query after publish
});

test("ConfigVersionBanner invalidates the risks query after any draft lifecycle mutation", async () => {
  const banner = await readFile(
    new URL("../src/features/configuration/ConfigVersionBanner.tsx", import.meta.url),
    "utf8"
  );

  // invalidateAfterMutation includes the risks query key so the risk list refreshes
  assert.match(banner, /"risks", registerId/);
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

test("draft config snapshots preserve custom field validation modes through publish", async () => {
  // MAINT-018: configVersion.service.ts is now a facade; draft snapshot logic lives in
  // configVersion.draft.service.ts and publish path lives in configVersion.publish.service.ts.
  const configVersionDraftService = await readFile(
    new URL("../../backend/src/services/configVersion.draft.service.ts", import.meta.url),
    "utf8"
  );
  const configVersionPublishService = await readFile(
    new URL("../../backend/src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );
  const configSnapshotTypes = await readFile(
    new URL("../../backend/src/types/configSnapshot.ts", import.meta.url),
    "utf8"
  );
  const configVersionSchemas = await readFile(
    new URL("../../backend/src/validators/configVersion.schemas.ts", import.meta.url),
    "utf8"
  );
  const configExportService = await readFile(
    new URL("../../backend/src/services/configExport.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(configSnapshotTypes, /validationMode: "ALLOW" \| "WARN" \| "BLOCK"/);
  assert.match(configVersionSchemas, /validationMode: z\.enum\(validationModes\)/);
  assert.match(configVersionDraftService, /validationMode: f\.validationMode/);
  assert.match(configVersionPublishService, /validationMode: cf\.validationMode/);
  assert.match(configExportService, /validationMode: field\.validationMode/);
});

test("UpdateDraftConfigInput.customFields Pick list includes formula so formula survives draft writes", async () => {
  const api = await readFile(new URL("../src/api/configVersion.api.ts", import.meta.url), "utf8");

  // The Pick type must name "formula" so TypeScript accepts it in the payload
  assert.match(api, /"formula"/);

  // The actual updateDraftConfig function must exist and accept the field
  assert.match(api, /export async function updateDraftConfig/);
});

test("buildDraftFields in FieldConfigTab maps formula onto the draft snapshot", async () => {
  const fieldTab = await readFile(
    new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url),
    "utf8"
  );

  // formula must be explicitly mapped — not just spread — so it is never silently dropped
  assert.match(fieldTab, /formula: field\.formula \?\? null/);
});

test("openDeleteConfirm skips usage check when hasDraft is true so draft-only fields do not 404", async () => {
  const fieldTab = await readFile(
    new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url),
    "utf8"
  );

  // Early return in openDeleteConfirm when hasDraft
  assert.match(fieldTab, /if \(hasDraft\)/);
  assert.match(fieldTab, /return;/);

  // getCustomFieldUsage is still imported (used in non-draft path)
  assert.match(fieldTab, /getCustomFieldUsage/);
});

test("deleteFieldMutation branches on hasDraft — draft path calls updateDraftConfig, not deleteCustomField", async () => {
  const fieldTab = await readFile(
    new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url),
    "utf8"
  );

  // deleteFieldMutation mutationFn must reference both paths
  assert.match(fieldTab, /hasDraft/);
  assert.match(fieldTab, /current\.filter\(\(field\) => field\.id !== fieldId\)/);
  assert.match(fieldTab, /deleteCustomField/);
});

test("analyseImpact API response field is impactEntries, not entries", async () => {
  // Regression: ConfigVersionBanner.tsx and configVersion.api.ts previously used the field name
  // 'entries'; corrected to 'impactEntries' to match the backend API response shape.
  const api = await readFile(new URL("../src/api/configVersion.api.ts", import.meta.url), "utf8");
  const banner = await readFile(
    new URL("../src/features/configuration/ConfigVersionBanner.tsx", import.meta.url),
    "utf8"
  );

  // Neither file should reference the old wrong field name on the response object
  assert.doesNotMatch(api, /result\.entries\b/, "configVersion.api.ts must not access result.entries — field is impactEntries");
  assert.doesNotMatch(banner, /result\.entries\b/, "ConfigVersionBanner.tsx must not access result.entries — field is impactEntries");

  // Both must reference the correct field name
  assert.match(api, /impactEntries/, "configVersion.api.ts must reference impactEntries");
  assert.match(banner, /impactEntries/, "ConfigVersionBanner.tsx must reference impactEntries");
});

test("ConfigVersionBanner Publish button always routes through analyseImpactMutation — no simple publish path", async () => {
  // Regression: a simple publish path (clicking Publish without impact analysis) was removed.
  // Publish must always go through analyseImpactMutation.mutate().
  const banner = await readFile(
    new URL("../src/features/configuration/ConfigVersionBanner.tsx", import.meta.url),
    "utf8"
  );

  // The Publish button in the banner body must trigger analyseImpactMutation, not publishDraft directly
  assert.match(banner, /analyseImpactMutation\.mutate\(\)/, "Publish must trigger analyseImpactMutation");
  // publishDraft is still called inside the ImpactAnalysisModal confirm handler — just not directly from the banner button
  assert.match(banner, /publishDraft/, "publishDraft must still be used (inside the impact analysis modal)");
});

test("ImpactEntryDetail accepts and uses an onClose prop", async () => {
  // Regression: ImpactEntryDetail previously had no onClose prop, so clicking a deep-link in the
  // impact analysis modal could not close the modal.
  const banner = await readFile(
    new URL("../src/features/configuration/ConfigVersionBanner.tsx", import.meta.url),
    "utf8"
  );

  // The component signature must declare onClose
  assert.match(banner, /ImpactEntryDetail.*onClose.*:\s*\(\)\s*=>\s*void/s, "ImpactEntryDetail must accept an onClose prop");
  // The prop must be forwarded when the component is used
  assert.match(banner, /ImpactEntryDetail[^/]*onClose=\{onClose\}/, "ImpactEntryDetail usages must pass onClose");
});

test("draft and export snapshots preserve the register-level custom field validation toggle", async () => {
  // MAINT-018: configVersion.service.ts is now a facade; draft snapshot logic lives in
  // configVersion.draft.service.ts and publish register update lives in configVersion.publish.service.ts.
  const configVersionDraftService = await readFile(
    new URL("../../backend/src/services/configVersion.draft.service.ts", import.meta.url),
    "utf8"
  );
  const configVersionPublishService = await readFile(
    new URL("../../backend/src/services/configVersion.publish.service.ts", import.meta.url),
    "utf8"
  );
  const configSnapshotTypes = await readFile(
    new URL("../../backend/src/types/configSnapshot.ts", import.meta.url),
    "utf8"
  );
  const configVersionSchemas = await readFile(
    new URL("../../backend/src/validators/configVersion.schemas.ts", import.meta.url),
    "utf8"
  );
  const configExportImportSchemas = await readFile(
    new URL("../../backend/src/validators/configExportImport.schemas.ts", import.meta.url),
    "utf8"
  );

  assert.match(configSnapshotTypes, /customFieldValidationEnabled: boolean/);
  assert.match(configVersionSchemas, /customFieldValidationEnabled: z\.boolean\(\)\.optional\(\)/);
  assert.match(configExportImportSchemas, /customFieldValidationEnabled: z\.boolean\(\)/);
  assert.match(configVersionDraftService, /customFieldValidationEnabled: register\.customFieldValidationEnabled/);
  assert.match(configVersionPublishService, /customFieldValidationEnabled: regSettings\.customFieldValidationEnabled/);
});

// ─── DRAFT-UNIFIED: every register settings field handler routes through the draft ────────────

test("RegisterSettingsTab: each of the nine draft-routed field handlers commits only its own field via commitDraftField, and commitDraftField only fires in draft mode with an active draft", async () => {
  const tab = await readFile(
    new URL("../src/features/configuration/RegisterSettingsTab.tsx", import.meta.url),
    "utf8"
  );

  // The shared gate: commitDraftField only calls updateDraftSettingsFieldMutation when
  // draftConfigMode && hasDraft — outside a draft it is a no-op (settingsLocked disables the
  // inputs, so no direct write can race the draft's write).
  assert.match(tab, /function commitDraftField\(patch: DraftRegisterSettingsPatch\) \{/);
  assert.match(tab, /if \(draftConfigMode && hasDraft\) \{\s*updateDraftSettingsFieldMutation\.mutate\(patch\);/);

  // Each of the nine handlers below responseActionMode (which has its own dedicated mutation
  // pair, covered separately in responseActionMode.behavior.test.tsx) calls commitDraftField
  // with exactly its own field — never the whole form, never another field's key.
  const fieldHandlers = {
    handleNameBlur: /commitDraftField\(\{ name: settingsForm\.values\.name \}\)/,
    handleDescriptionBlur: /commitDraftField\(\{ description: settingsForm\.values\.description \}\)/,
    handleRiskIdPrefixBlur: /commitDraftField\(\{ riskIdPrefix: settingsForm\.values\.riskIdPrefix \|\| null \}\)/,
    handleRiskIdZeroPaddingEnabledChange: /commitDraftField\(\{ riskIdZeroPaddingEnabled: checked \}\)/,
    handleRiskIdZeroPaddingWidthBlur: /commitDraftField\(\{ riskIdZeroPaddingWidth: settingsForm\.values\.riskIdZeroPaddingWidth \}\)/,
    handleAllowViewerExportChange: /commitDraftField\(\{ allowViewerExport: checked \}\)/,
    handleCustomFieldValidationEnabledChange: /commitDraftField\(\{ customFieldValidationEnabled: checked \}\)/,
    handleReviewsEnabledChange: /commitDraftField\(\{ reviewsEnabled: checked \}\)/,
    handleDefaultReviewFrequencyMonthsBlur: /commitDraftField\(\{ defaultReviewFrequencyMonths: settingsForm\.values\.defaultReviewFrequencyMonths \}\)/
  };

  for (const [handlerName, patchPattern] of Object.entries(fieldHandlers)) {
    const fnMatch = tab.match(new RegExp(`function ${handlerName}\\([^)]*\\) \\{([\\s\\S]*?)\\n  \\}`));
    assert.ok(fnMatch, `Expected to find ${handlerName} in RegisterSettingsTab.tsx`);
    assert.match(fnMatch[1], patchPattern, `${handlerName} must call commitDraftField with only its own field`);
  }
});

test("RegisterSettingsTab: setSettingsValues reads every field from the draft snapshot in draft mode, and from the live register otherwise", async () => {
  const tab = await readFile(
    new URL("../src/features/configuration/RegisterSettingsTab.tsx", import.meta.url),
    "utf8"
  );

  // The read source is chosen once, per the doc: configQuery.data.register in draft mode with an
  // active draft, the live register row otherwise — not decided per field.
  assert.match(
    tab,
    /const source = draftConfigMode && hasDraft && configQuery\.data \? configQuery\.data\.register : register;/
  );

  // Every field in the setSettingsValues call reads from `source`, not from `register` directly —
  // a field reading `register.x` here would show pre-draft values once its direct-write path
  // stops firing (see docs/architecture/register-config-draft-system.md, Known Pitfalls).
  const setValuesMatch = tab.match(/setSettingsValues\(\{([\s\S]*?)\}\);/);
  assert.ok(setValuesMatch, "Expected to find the setSettingsValues({...}) call");
  const setValuesBody = setValuesMatch[1];

  for (const field of [
    "name",
    "description",
    "riskIdPrefix",
    "riskIdZeroPaddingEnabled",
    "riskIdZeroPaddingWidth",
    "reviewsEnabled",
    "defaultReviewFrequencyMonths",
    "allowViewerExport",
    "customFieldValidationEnabled",
    "responseActionMode"
  ]) {
    assert.match(
      setValuesBody,
      new RegExp(`${field}: source\\.${field}`),
      `${field} must be read from 'source', not directly from 'register'`
    );
    assert.doesNotMatch(
      setValuesBody,
      new RegExp(`${field}: register\\.${field}`),
      `${field} must not bypass 'source' and read the live register directly`
    );
  }
});

test("FieldConfigTab reorderReviewStatusMutation branches on hasDraft exactly like the custom-field reorder above it", async () => {
  const fieldTab = await readFile(
    new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url),
    "utf8"
  );

  const reorderMatch = fieldTab.match(
    /const reorderReviewStatusMutation = useMutation<[\s\S]*?mutationFn: \(reviewStatusPosition\) =>([\s\S]*?),\n {4}onSuccess:/
  );
  assert.ok(reorderMatch, "Expected to find reorderReviewStatusMutation's mutationFn");
  const mutationFnBody = reorderMatch[1];

  // Draft path writes through updateDraftConfig; direct path (no draft open) still writes
  // through updateRegister — the same hasDraft ternary shape as reorderFieldMutation above it.
  assert.match(mutationFnBody, /hasDraft\s*\?/);
  assert.match(mutationFnBody, /updateDraftConfig\(registerId, \{ register: \{ reviewStatusPosition \} \}\)/);
  assert.match(mutationFnBody, /updateRegister\(registerId, \{ reviewStatusPosition \}\)/);
});

// ─── UI-024: template-drift banner ─────────────────────────────────────────────────────────────

test("TemplateDriftBanner renders only when linkedTemplate is non-null and not the latest version", async () => {
  const banner = await readFile(
    new URL("../src/features/configuration/TemplateDriftBanner.tsx", import.meta.url),
    "utf8"
  );

  // Single guard covers both the null case and the up-to-date case.
  assert.match(banner, /if \(!linkedTemplate \|\| linkedTemplate\.isLatest\) return null;/);

  // Stable selectors for E2E/behavioral coverage, per docs/operations/e2e-testing.md.
  assert.match(banner, /data-testid="template-drift-banner"/);
  assert.match(banner, /data-testid="template-drift-banner-cta"/);

  // The CTA calls the onViewChanges callback — RegisterDetailPage wires this to switch tabs.
  assert.match(banner, /onClick=\{onViewChanges\}/);
});

test("RegisterDetailPage renders TemplateDriftBanner only for users with manage rights, and the CTA switches to the Configuration tab", async () => {
  const page = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");

  // Gated behind canManage, alongside registerQuery having resolved — a viewer without manage
  // rights never renders the banner, regardless of drift state.
  assert.match(page, /\{canManage && registerQuery\.data \? \(\s*<TemplateDriftBanner/);

  // linkedTemplate is passed straight through from the register response (no frontend
  // drift-detection logic — the backend already computes isLatest).
  assert.match(page, /linkedTemplate=\{registerQuery\.data\.linkedTemplate\}/);

  // The CTA's onViewChanges switches the active tab to "configuration".
  assert.match(page, /onViewChanges=\{\(\) => setActiveTab\("configuration"\)\}/);
});

test("TemplateLinkPanel's isLatest badge is unaffected by the new TemplateDriftBanner component", async () => {
  const panel = await readFile(
    new URL("../src/features/configuration/TemplateLinkPanel.tsx", import.meta.url),
    "utf8"
  );

  // TemplateLinkPanel owns its own badge independently of TemplateDriftBanner — it must not
  // import or delegate to the new banner component.
  assert.doesNotMatch(panel, /TemplateDriftBanner/);
  assert.match(panel, /linked\.isLatest \? \(/);
  assert.match(panel, /<Badge color="teal" variant="light" size="sm">v\{linked\.linkedVersionNumber\} — up to date<\/Badge>/);
  assert.match(
    panel,
    /<Badge color="orange" variant="light" size="sm">\s*v\{linked\.linkedVersionNumber\} — latest is v\{linked\.latestPublishedVersionNumber\}\s*<\/Badge>/
  );
});
