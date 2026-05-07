import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("risk table actions are role-aware and owner-aware", async () => {
  const panel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");
  const detail = await readFile(new URL("../src/features/risks/RiskDetailModal.tsx", import.meta.url), "utf8");
  const registerPage = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");

  assert.match(panel, /useCurrentUser/);
  assert.match(panel, /register\.effectiveRole === "REGISTER_VIEWER" && register\.allowViewerExport/);
  assert.match(panel, /risk\.owner\.id === user\?\.id/);
  assert.match(panel, /canReview=\{canEditSelectedRisk && register\.reviewsEnabled\}/);
  assert.match(panel, /canEditRows=\{canEditSelectedRisk\}/);
  assert.match(panel, /canDelete=\{isSystemAdmin\}/);

  assert.match(detail, /canEditRows/);
  assert.match(detail, /canDelete/);
  assert.match(detail, /canReview/);

  assert.match(registerPage, /canManage \? <Tabs\.Tab value="configuration">/);
  assert.match(registerPage, /canManage \? <Tabs\.Tab value="permissions">/);
  assert.match(registerPage, /canManage \? <Tabs\.Tab value="audit">/);
});

test("common workflow actions stay unavailable when the user lacks permission", async () => {
  const registersPage = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");
  const registerDetailPage = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");
  const riskPanel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");

  assert.match(registersPage, /isSystemAdmin \? <Button onClick=\{openCreateModal\}>Create register<\/Button> : null/);
  assert.match(registerDetailPage, /canManage \? <Tabs\.Tab value="configuration">Configuration<\/Tabs\.Tab> : null/);
  assert.match(registerDetailPage, /canManage \? <Tabs\.Tab value="permissions">Permissions<\/Tabs\.Tab> : null/);
  assert.match(registerDetailPage, /canManage \? <Tabs\.Tab value="audit">Audit<\/Tabs\.Tab> : null/);
  assert.match(riskPanel, /canManage \? <Button onClick=\{openCreate\}>Add risk<\/Button> : null/);
  assert.match(riskPanel, /canDelete=\{isSystemAdmin\}/);
  assert.match(riskPanel, /risk\.owner\.id === user\?\.id/);
});
