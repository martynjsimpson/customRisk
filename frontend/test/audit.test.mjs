import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("audit event table renders action and summary from server event data without hardcoded action label mapping", async () => {
  const table = await readFile(
    new URL("../src/features/audit/AuditEventTable.tsx", import.meta.url),
    "utf8"
  );

  assert.match(table, /event\.action/);
  assert.match(table, /event\.summary/);
  // Action display is server-driven; no client-side label overrides for specific action codes
  assert.doesNotMatch(table, /NEXT_REVIEW_DATE_UPDATED/);
  assert.doesNotMatch(table, /RISK_REVIEWED/);
});

test("audit event detail expands field changes and metadata when present, making risk review detail visible", async () => {
  const detail = await readFile(
    new URL("../src/features/audit/AuditEventDetail.tsx", import.meta.url),
    "utf8"
  );

  assert.match(detail, /fieldChanges/);
  assert.match(detail, /fieldChanges\.length > 0/);
  assert.match(detail, /event\.metadataJson/);
});

test("audit event table expand toggle uses hasAuditDetail which checks fieldChanges and metadataJson", async () => {
  const detail = await readFile(
    new URL("../src/features/audit/AuditEventDetail.tsx", import.meta.url),
    "utf8"
  );
  const table = await readFile(
    new URL("../src/features/audit/AuditEventTable.tsx", import.meta.url),
    "utf8"
  );

  assert.match(detail, /hasAuditDetail/);
  assert.match(table, /hasAuditDetail/);
  assert.match(detail, /fieldChanges\.length > 0/);
});

test("all three audit log locations use AuditEventTable so review audit wording is consistent", async () => {
  const homePage = await readFile(
    new URL("../src/pages/HomePage.tsx", import.meta.url),
    "utf8"
  );
  const auditPage = await readFile(
    new URL("../src/pages/AuditPage.tsx", import.meta.url),
    "utf8"
  );
  const riskDetail = await readFile(
    new URL("../src/features/risks/RiskDetailModal.tsx", import.meta.url),
    "utf8"
  );
  const registerAudit = await readFile(
    new URL("../src/features/audit/RegisterAuditPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(homePage, /AuditEventTable/);
  assert.match(auditPage, /AuditEventTable/);
  assert.match(riskDetail, /AuditEventTable/);
  assert.match(registerAudit, /AuditEventTable/);
});
