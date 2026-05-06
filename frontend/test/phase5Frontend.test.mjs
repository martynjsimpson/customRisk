import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("frontend exposes dashboard, my risks, and audit routes", async () => {
  const routes = await readFile(new URL("../src/router/routes.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../src/layouts/MainLayout.tsx", import.meta.url), "utf8");
  const dashboardApi = await readFile(new URL("../src/api/dashboard.api.ts", import.meta.url), "utf8");
  const auditApi = await readFile(new URL("../src/api/audit.api.ts", import.meta.url), "utf8");

  assert.match(routes, /path: "\/my-risks"/);
  assert.match(routes, /path: "\/audit"/);
  assert.match(layout, /to="\/my-risks"/);
  assert.match(layout, /to="\/audit"/);
  assert.match(dashboardApi, /\/dashboard\/my-work/);
  assert.match(dashboardApi, /\/dashboard\/my-risks/);
  assert.match(dashboardApi, /\/dashboard\/admin-summary/);
  assert.match(auditApi, /\/audit\/system/);
  assert.match(auditApi, /\/registers\/\$\{registerId\}\/audit/);
  assert.match(auditApi, /\/registers\/\$\{registerId\}\/risks\/\$\{riskId\}\/audit/);
});

test("risk detail UI includes review action, review history, and risk audit history", async () => {
  const panel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");

  assert.match(panel, /completeRiskReview/);
  assert.match(panel, /listRiskReviews/);
  assert.match(panel, /listRiskAudit/);
  assert.match(panel, /Review history/);
  assert.match(panel, /Audit history/);
  assert.match(panel, /Confirm review/);
  assert.match(panel, /register\.reviewAttestationText/);
  assert.match(panel, /\["audit", "register", register\.id\]/);
});

test("register detail exposes register audit tab for managers", async () => {
  const page = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/features/audit/RegisterAuditPanel.tsx", import.meta.url), "utf8");

  assert.match(page, /value="audit"/);
  assert.match(page, /RegisterAuditPanel/);
  assert.match(panel, /listRegisterAudit/);
});
