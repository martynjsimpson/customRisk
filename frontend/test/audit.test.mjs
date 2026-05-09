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

test("AuditFilters provides search, actor, date range, action, and object-type filters", async () => {
  const filters = await readFile(
    new URL("../src/features/audit/AuditFilters.tsx", import.meta.url),
    "utf8"
  );

  // Free-text search across summary, object name, and risk ID
  assert.match(filters, /label="Search"/);
  assert.match(filters, /filters\.search/);
  // Actor filter searches by name or email
  assert.match(filters, /label="Actor"/);
  assert.match(filters, /filters\.actorName/);
  // Date range inputs
  assert.match(filters, /label="From date"/);
  assert.match(filters, /label="To date"/);
  assert.match(filters, /type="date"/);
  // Action select with human-friendly labels derived from action codes
  assert.match(filters, /label="Action"/);
  assert.match(filters, /searchable/);
  assert.match(filters, /ACTION_OPTIONS/);
  // Object type select
  assert.match(filters, /label="Object type"/);
  assert.match(filters, /OBJECT_TYPE_OPTIONS/);
  // Page resets when a filter changes (onChange resets caller's page)
  assert.match(filters, /AuditFiltersProps/);
  assert.match(filters, /onChange/);
});

test("AuditFilters covers all known audit actions organised by group", async () => {
  const filters = await readFile(
    new URL("../src/features/audit/AuditFilters.tsx", import.meta.url),
    "utf8"
  );

  for (const action of [
    "LOGIN_SUCCEEDED", "LOGIN_FAILED", "LOGOUT",
    "USER_CREATED", "USER_UPDATED",
    "REGISTER_CREATED", "REGISTER_SETTINGS_UPDATED",
    "RISK_CREATED", "RISK_UPDATED", "RISK_DELETED", "RISK_REVIEWED",
    "CUSTOM_FIELD_CREATED", "RISK_EXPORT_GENERATED"
  ]) {
    assert.match(filters, new RegExp(`"${action}"`));
  }
});

test("main audit page and register audit panel both mount AuditFilters and reset page on filter change", async () => {
  const auditPage = await readFile(
    new URL("../src/pages/AuditPage.tsx", import.meta.url),
    "utf8"
  );
  const registerAudit = await readFile(
    new URL("../src/features/audit/RegisterAuditPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(auditPage, /AuditFilters/);
  assert.match(auditPage, /setPage\(1\)/);
  assert.match(auditPage, /filters.*page.*pageSize/);

  assert.match(registerAudit, /AuditFilters/);
  assert.match(registerAudit, /setPage\(1\)/);
  assert.match(registerAudit, /filters.*page.*pageSize/);
});

test("dashboard home page does not use AuditFilters — recent activity widget is unfiltered", async () => {
  const homePage = await readFile(
    new URL("../src/pages/HomePage.tsx", import.meta.url),
    "utf8"
  );

  assert.match(homePage, /AuditEventTable/);
  assert.doesNotMatch(homePage, /AuditFilters/);
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
