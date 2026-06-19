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
  // Pagination and cap constants must be present (runtime behavior tested separately)
  assert.match(detailModal, /Pagination/);
  assert.match(detailModal, /HISTORY_PAGE_SIZE/);
  assert.match(detailModal, /HISTORY_CAP/);
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
  assert.match(formModal, /type="button" variant="subtle" onClick=\{handleClose\}/);
});

test("my risks rows open modals in-place for review, edit, and delete actions", async () => {
  const page = await readFile(new URL("../src/pages/MyRisksPage.tsx", import.meta.url), "utf8");

  // Permission guards must be present
  assert.match(page, /usePermissions/);
  assert.match(page, /isSystemAdmin/);

  // Risk ID and title must still be displayed
  assert.match(page, /\{risk\.displayRiskId\}/);

  // Actions must use onClick handlers (in-place modal pattern), not navigate away
  assert.match(page, /openEdit/);
  assert.match(page, /openReview/);
  assert.match(page, /openDelete/);

  // Buttons must be present
  assert.match(page, /Review\s+<\/Button>/);
  assert.match(page, /Edit\s+<\/Button>/);
  assert.match(page, /Delete\s+<\/Button>/);

  // Modals must be mounted on the page
  assert.match(page, /RiskDetailModal/);
  assert.match(page, /RiskFormModal/);
  assert.match(page, /ReviewModal/);
  assert.match(page, /DeleteRiskModal/);
});

test("register risk table column selection uses per-register preference scope", async () => {
  const panel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");
  const hook = await readFile(new URL("../src/features/risks/useRiskTableColumns.ts", import.meta.url), "utf8");

  // Panel imports and uses the column selection hook
  assert.match(panel, /useRegisterTableColumns/);
  assert.match(panel, /ColumnPicker/);
  assert.match(panel, /visibleColumns/);
  assert.match(panel, /setColumns/);

  // Hook saves to the correct register-scoped preference path
  assert.match(hook, /riskTableColumns/);
  assert.match(hook, /registers/);
  assert.match(hook, /\[registerId\]/);
  assert.match(hook, /DEFAULT_REGISTER_TABLE_COLUMNS/);

  // Column changes are persisted via updateMyPreferences
  assert.match(hook, /updateMyPreferences/);
});

test("my risks column selection uses its own separate preference scope", async () => {
  const page = await readFile(new URL("../src/pages/MyRisksPage.tsx", import.meta.url), "utf8");
  const hook = await readFile(new URL("../src/features/risks/useRiskTableColumns.ts", import.meta.url), "utf8");

  // Page imports and uses the my-risks column hook
  assert.match(page, /useMyRisksTableColumns/);
  assert.match(page, /ColumnPicker/);
  assert.match(page, /visibleColumns/);

  // Hook saves to myRisks preference scope (separate from registers)
  assert.match(hook, /myRisks/);
  assert.match(hook, /DEFAULT_MY_RISKS_COLUMNS/);
});

test("column picker groups custom fields by register for my risks", async () => {
  const page = await readFile(new URL("../src/pages/MyRisksPage.tsx", import.meta.url), "utf8");

  assert.match(page, /buildAvailableCustomFields/);
  assert.match(page, /buildColumnPickerGroups/);
  // Groups custom fields by register name
  assert.match(page, /registerName/);
  // Filters out custom field columns whose field no longer exists in returned risks
  assert.match(page, /filterValidMyRisksColumns/);
});

test("stale custom field columns are silently omitted for register table", async () => {
  const hook = await readFile(new URL("../src/features/risks/useRiskTableColumns.ts", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");

  // Hook exports the filter helper
  assert.match(hook, /filterValidRegisterColumns/);
  // Panel applies filter using active custom field IDs
  assert.match(panel, /filterValidRegisterColumns/);
  assert.match(panel, /activeCustomFieldIds/);
});

test("my risks table shows dash for custom fields that do not apply to a risk's register", async () => {
  const page = await readFile(new URL("../src/pages/MyRisksPage.tsx", import.meta.url), "utf8");

  // When a risk's register ID does not match the column's register, renders a placeholder
  assert.match(page, /risk\.register\.id === parsed\.registerId/);
  assert.match(page, /—/);
});

test("column key helpers use stable register:field namespacing for my risks custom fields", async () => {
  const colDefs = await readFile(new URL("../src/features/risks/riskTableColumns.ts", import.meta.url), "utf8");

  assert.match(colDefs, /customRegisterColumnKey/);
  assert.match(colDefs, /customMyRisksColumnKey/);
  assert.match(colDefs, /parseCustomRegisterColumnKey/);
  assert.match(colDefs, /parseCustomMyRisksColumnKey/);
  assert.match(colDefs, /renderCustomFieldValue/);
  assert.match(colDefs, /DEFAULT_REGISTER_TABLE_COLUMNS/);
  assert.match(colDefs, /DEFAULT_MY_RISKS_COLUMNS/);
});

test("column picker is available on both register risks table and my risks page", async () => {
  const panel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/pages/MyRisksPage.tsx", import.meta.url), "utf8");
  const picker = await readFile(new URL("../src/features/risks/ColumnPicker.tsx", import.meta.url), "utf8");

  assert.match(panel, /ColumnPicker/);
  assert.match(page, /ColumnPicker/);
  assert.match(picker, /Columns/);
  assert.match(picker, /Popover/);
  assert.match(picker, /Checkbox/);
});

test("risk state badge is color-coded: OPEN blue, DRAFT gray, CLOSED dark", async () => {
  const panel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");

  // stateColor is derived from risk.state
  assert.match(panel, /stateColor/);
  assert.match(panel, /risk\.state === "OPEN" \? "blue"/);
  assert.match(panel, /risk\.state === "DRAFT" \? "gray" : "dark"/);

  // Badge receives the computed color
  assert.match(panel, /color=\{stateColor\}/);
});

test("risk owner field supports email-only mode (PM2-02)", async () => {
  const formModal = await readFile(new URL("../src/features/risks/RiskFormModal.tsx", import.meta.url), "utf8");
  const detailModal = await readFile(new URL("../src/features/risks/RiskDetailModal.tsx", import.meta.url), "utf8");
  const risksApi = await readFile(new URL("../src/api/risks.api.ts", import.meta.url), "utf8");

  // API type has ownerEmail as optional and ownerUserId as optional
  assert.match(risksApi, /ownerUserId\?:\s*string/);
  assert.match(risksApi, /ownerEmail\?:\s*string/);

  // Form uses ownerValue (not ownerUserId) as the internal field name
  assert.match(formModal, /ownerValue/);

  // OwnerCombobox component is defined
  assert.match(formModal, /OwnerCombobox/);

  // Email encoding/decoding helpers exist
  assert.match(formModal, /encodeOwnerEmail/);
  assert.match(formModal, /decodeOwnerEmail/);
  assert.match(formModal, /isEncodedEmail/);

  // buildPayload sends ownerEmail when encoded email value is present
  assert.match(formModal, /ownerEmail.*decodeOwnerEmail/s);

  // buildPayload sends ownerUserId otherwise
  assert.match(formModal, /ownerUserId.*ownerValue/s);

  // Form validation requires ownerValue
  assert.match(formModal, /Owner is required/);
  assert.match(formModal, /Enter a valid email address/);

  // Detail modal shows email when ownerPerson.isResolved is false
  assert.match(detailModal, /ownerPerson\.isResolved/);
  assert.match(detailModal, /ownerPerson\.email/);
});
