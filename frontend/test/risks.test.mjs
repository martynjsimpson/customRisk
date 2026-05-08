import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("risk detail UI includes review action, review history, and risk audit history", async () => {
  const detailModal = await readFile(new URL("../src/features/risks/RiskDetailModal.tsx", import.meta.url), "utf8");
  const reviewModal = await readFile(new URL("../src/features/risks/ReviewModal.tsx", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");
  const formModal = await readFile(new URL("../src/features/risks/RiskFormModal.tsx", import.meta.url), "utf8");

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
  assert.match(panel, /queryClient\.fetchQuery/);
  assert.match(panel, /getRisk\(register\.id, requestedRiskId\)/);
  assert.match(formModal, /getTimezoneOffset\(\)/);
  assert.match(formModal, /const isEditingRiskLoading = Boolean/);
  assert.match(formModal, /type="button" variant="subtle" onClick=\{onClose\}/);
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
  assert.match(page, /<Anchor/);
  assert.match(page, /Review\s+<\/Button>/);
  assert.match(page, /Edit\s+<\/Button>/);
  assert.match(page, /Delete\s+<\/Button>/);
});
