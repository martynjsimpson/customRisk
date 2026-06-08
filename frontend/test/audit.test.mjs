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

test("auditFormatters actionLabel converts action codes to readable labels", async () => {
  const formatters = await readFile(
    new URL("../src/features/audit/auditFormatters.ts", import.meta.url),
    "utf8"
  );

  assert.match(formatters, /actionLabel/);
  assert.match(formatters, /toLowerCase/);
  assert.match(formatters, /replace.*_.*g/);
  assert.match(formatters, /toUpperCase/);
});

test("AuditFilters imports actionLabel from auditFormatters — not a local copy", async () => {
  const filters = await readFile(
    new URL("../src/features/audit/AuditFilters.tsx", import.meta.url),
    "utf8"
  );

  assert.match(filters, /from "\.\/auditFormatters"/);
  assert.match(filters, /actionLabel/);
  // Must not re-define it locally
  assert.doesNotMatch(filters, /function actionLabel/);
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

test("AuditLogPanel composes AuditFilters, AuditEventTable, Pagination, and ApiErrorAlert with shared page-reset logic", async () => {
  const panel = await readFile(
    new URL("../src/features/audit/AuditLogPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(panel, /AuditFilters/);
  assert.match(panel, /AuditEventTable/);
  assert.match(panel, /Pagination/);
  assert.match(panel, /ApiErrorAlert/);
  assert.match(panel, /setPage\(1\)/);
  assert.match(panel, /placeholderData/);
  assert.match(panel, /queryKey/);
  assert.match(panel, /queryFn/);
});

test("main audit page delegates to AuditLogPanel with system query and register and object columns", async () => {
  const auditPage = await readFile(
    new URL("../src/pages/AuditPage.tsx", import.meta.url),
    "utf8"
  );

  assert.match(auditPage, /AuditLogPanel/);
  assert.match(auditPage, /listSystemAudit/);
  assert.match(auditPage, /showObject/);
  assert.match(auditPage, /showRegister/);
  // State and query logic lives in AuditLogPanel, not here
  assert.doesNotMatch(auditPage, /useState/);
  assert.doesNotMatch(auditPage, /useQuery/);
});

test("register audit panel delegates to AuditLogPanel with register-scoped query", async () => {
  const registerAudit = await readFile(
    new URL("../src/features/audit/RegisterAuditPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(registerAudit, /AuditLogPanel/);
  assert.match(registerAudit, /listRegisterAudit/);
  assert.match(registerAudit, /registerId/);
  // State and query logic lives in AuditLogPanel, not here
  assert.doesNotMatch(registerAudit, /useState/);
  assert.doesNotMatch(registerAudit, /useQuery/);
});

test("dashboard home page does not use AuditFilters or AuditLogPanel — recent activity widget is unfiltered", async () => {
  const homePage = await readFile(
    new URL("../src/pages/HomePage.tsx", import.meta.url),
    "utf8"
  );

  assert.match(homePage, /AuditEventTable/);
  assert.doesNotMatch(homePage, /AuditFilters/);
  assert.doesNotMatch(homePage, /AuditLogPanel/);
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
  const auditLogPanel = await readFile(
    new URL("../src/features/audit/AuditLogPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(homePage, /AuditEventTable/);
  // AuditPage uses AuditLogPanel which uses AuditEventTable
  assert.match(auditPage, /AuditLogPanel/);
  assert.match(auditLogPanel, /AuditEventTable/);
  assert.match(riskDetail, /AuditEventTable/);
});

test("AuditFilters includes IP address filter field", async () => {
  const filters = await readFile(
    new URL("../src/features/audit/AuditFilters.tsx", import.meta.url),
    "utf8"
  );

  assert.match(filters, /label="IP Address"/);
  assert.match(filters, /filters\.ipAddress/);
  // onChange wires input value back to the ipAddress filter key
  assert.match(filters, /ipAddress.*event\.currentTarget\.value/);
});

test("AuditLogPanel exposes Export CSV button wired to exportFn prop with error handling", async () => {
  const panel = await readFile(
    new URL("../src/features/audit/AuditLogPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(panel, /exportFn/);
  assert.match(panel, /Export CSV/);
  assert.match(panel, /handleExport/);
  // exportFn is called with the current filters
  assert.match(panel, /exportFn\(filters\)/);
  // Loading state and error feedback are handled
  assert.match(panel, /exporting/);
  assert.match(panel, /exportError/);
  assert.match(panel, /Alert/);
});

test("AuditPage and RegisterAuditPanel wire exportFn to their respective export API calls", async () => {
  const auditPage = await readFile(
    new URL("../src/pages/AuditPage.tsx", import.meta.url),
    "utf8"
  );
  const registerAudit = await readFile(
    new URL("../src/features/audit/RegisterAuditPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(auditPage, /exportFn={exportSystemAudit}/);
  assert.match(auditPage, /exportSystemAudit/);
  assert.match(registerAudit, /exportFn/);
  assert.match(registerAudit, /exportRegisterAudit/);
});

test("AuditEventTable showIpAddress prop gates the IP Address column and adjusts colSpan", async () => {
  const table = await readFile(
    new URL("../src/features/audit/AuditEventTable.tsx", import.meta.url),
    "utf8"
  );

  // Prop is declared with a default
  assert.match(table, /showIpAddress/);
  assert.match(table, /showIpAddress = true/);

  // Header and data cell are both conditional on the prop
  assert.match(table, /showIpAddress.*IP Address/);
  assert.match(table, /showIpAddress.*ipAddress/);

  // colSpan subtracts 1 when IP address column is hidden
  assert.match(table, /showIpAddress.*0.*1|showIpAddress \? 0 : 1/);
});

test("RiskDetailModal passes showIpAddress=false to AuditEventTable", async () => {
  const modal = await readFile(
    new URL("../src/features/risks/RiskDetailModal.tsx", import.meta.url),
    "utf8"
  );

  assert.match(modal, /AuditEventTable/);
  assert.match(modal, /showIpAddress=\{false\}/);
});
