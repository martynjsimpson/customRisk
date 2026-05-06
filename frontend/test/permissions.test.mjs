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
