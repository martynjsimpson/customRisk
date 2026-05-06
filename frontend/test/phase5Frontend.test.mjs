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
  const detailModal = await readFile(new URL("../src/features/risks/RiskDetailModal.tsx", import.meta.url), "utf8");
  const reviewModal = await readFile(new URL("../src/features/risks/ReviewModal.tsx", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");

  assert.match(detailModal, /listRiskReviews/);
  assert.match(detailModal, /listRiskAudit/);
  assert.match(detailModal, /Review history/);
  assert.match(detailModal, /Audit history/);
  assert.match(detailModal, /\["audit", "risk", registerId, riskId\]/);
  assert.match(reviewModal, /completeRiskReview/);
  assert.match(reviewModal, /Confirm review/);
  assert.match(reviewModal, /register\.reviewAttestationText/);
  assert.match(panel, /searchParams\.get\("riskId"\)/);
  assert.match(panel, /action === "review"/);
  assert.match(panel, /action === "edit"/);
  assert.match(panel, /action === "delete"/);
});

test("my risks rows link to permitted register risk actions", async () => {
  const page = await readFile(new URL("../src/pages/MyRisksPage.tsx", import.meta.url), "utf8");

  assert.match(page, /usePermissions/);
  assert.match(page, /isSystemAdmin \?/);
  assert.match(page, /\?riskId=\$\{risk\.id\}`/);
  assert.match(page, /\{risk\.displayRiskId\}/);
  assert.match(page, /action=review/);
  assert.match(page, /action=edit/);
  assert.match(page, /action=delete/);
  assert.match(page, /Open\s+<\/Button>/);
  assert.match(page, /Review\s+<\/Button>/);
  assert.match(page, /Edit\s+<\/Button>/);
  assert.match(page, /Delete\s+<\/Button>/);
});

test("register detail exposes register audit tab for managers", async () => {
  const page = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/features/audit/RegisterAuditPanel.tsx", import.meta.url), "utf8");

  assert.match(page, /value="audit"/);
  assert.match(page, /RegisterAuditPanel/);
  assert.match(panel, /listRegisterAudit/);
});
