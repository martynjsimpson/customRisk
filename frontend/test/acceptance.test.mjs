import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("frontend exposes the required MVP acceptance workflows", async () => {
  const registersPage = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");
  const registerDetailPage = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");
  const configurationPanel = await readFile(new URL("../src/features/configuration/RegisterConfigurationPanel.tsx", import.meta.url), "utf8");
  const fieldConfig = await readFile(new URL("../src/features/configuration/FieldConfigTab.tsx", import.meta.url), "utf8");
  const fieldTable = await readFile(new URL("../src/features/configuration/CustomFieldTable.tsx", import.meta.url), "utf8");
  const matrixConfig = await readFile(new URL("../src/features/configuration/MatrixConfigTab.tsx", import.meta.url), "utf8");
  const riskPanel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");
  const reviewModal = await readFile(new URL("../src/features/risks/ReviewModal.tsx", import.meta.url), "utf8");

  assert.match(registersPage, /Create register/);
  assert.match(registersPage, /CreateRegisterWizard/);

  assert.match(registerDetailPage, /value="configuration"/);
  assert.match(registerDetailPage, /value="permissions"/);
  assert.match(registerDetailPage, /REGISTER_VIEWER/);
  assert.match(registerDetailPage, /canManage \? <Tabs\.Tab value="configuration">/);

  assert.match(configurationPanel, /FieldConfigTab/);
  assert.match(configurationPanel, /ScoringConfigurationPanel/);
  assert.match(fieldConfig, /Add field/);
  assert.match(fieldConfig, /updateDraftConfig/);
  assert.match(fieldConfig, /CustomFieldTable/);
  assert.match(fieldTable, /CORE_RISK_FIELDS/);
  assert.match(matrixConfig, /Save matrix/);
  assert.match(matrixConfig, /updateMatrix/);
  assert.match(matrixConfig, /recalculate risk levels/);

  assert.match(riskPanel, /Add risk/);
  assert.match(riskPanel, /RiskFormModal/);
  assert.match(riskPanel, /includeClosed: false/);
  assert.match(riskPanel, /canManage \? <Button onClick=\{openCreate\}>Add risk<\/Button> : null/);
  assert.match(riskPanel, /register\.effectiveRole === "REGISTER_VIEWER" && register\.allowViewerExport/);
  assert.match(riskPanel, /risk\.owner\.id === user\?\.id/);

  assert.match(reviewModal, /Review risk/);
  assert.match(reviewModal, /confirmed: true/);
  assert.match(reviewModal, /disabled=\{!reviewConfirmed\}/);
  assert.match(reviewModal, /completeRiskReview/);
});

test("frontend acceptance surfaces include detail, audit, reviews, and read-only viewer behaviour", async () => {
  const riskDetail = await readFile(new URL("../src/features/risks/RiskDetailModal.tsx", import.meta.url), "utf8");
  const riskPanel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");

  assert.match(riskDetail, /Review history/);
  assert.match(riskDetail, /Audit history/);
  assert.match(riskDetail, /canEditRows/);
  assert.match(riskDetail, /canDelete/);
  assert.match(riskPanel, /canReview=\{canEditSelectedRisk && register\.reviewsEnabled\}/);
  assert.match(riskPanel, /canDelete=\{isSystemAdmin\}/);
});
