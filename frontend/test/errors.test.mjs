import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("shared API error alert renders actionable field-level validation messages", async () => {
  const alert = await readFile(new URL("../src/components/ApiErrorAlert.tsx", import.meta.url), "utf8");
  const riskForm = await readFile(new URL("../src/features/risks/RiskFormModal.tsx", import.meta.url), "utf8");
  const usersPage = await readFile(new URL("../src/pages/UsersPage.tsx", import.meta.url), "utf8");

  assert.match(alert, /getApiErrorMessage/);
  assert.match(alert, /getApiErrorFields/);
  assert.match(alert, /formatApiErrorFieldName/);
  assert.match(alert, /field === "_root" \|\| field === "body"/);
  assert.match(alert, /Object\.entries\(fields\)/);
  assert.match(alert, /\.sort\(\(\[left\], \[right\]\) => left\.localeCompare\(right\)\)/);
  assert.match(alert, /formatApiErrorFieldName\(field\)/);

  assert.match(riskForm, /getApiErrorCode\(saveMutation\.error\) !== "VALIDATION_WARNING"/);
  assert.match(riskForm, /saveMutation\.error/);
  assert.match(usersPage, /<ApiErrorAlert[\s\S]*error=\{editingUser \? updateMutation\.error : createMutation\.error\}/);
});

test("API-backed UI surfaces use shared API error display", async () => {
  const component = await readFile(new URL("../src/components/ApiErrorAlert.tsx", import.meta.url), "utf8");
  const loginPage = await readFile(new URL("../src/pages/LoginPage.tsx", import.meta.url), "utf8");
  const registersPage = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");
  const registerDetailPage = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");
  const usersPage = await readFile(new URL("../src/pages/UsersPage.tsx", import.meta.url), "utf8");
  const riskPanel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");
  const riskFormModal = await readFile(new URL("../src/features/risks/RiskFormModal.tsx", import.meta.url), "utf8");

  assert.match(component, /getApiErrorMessage/);
  assert.match(component, /getApiErrorFields/);
  assert.match(component, /Object\.entries\(fields\)/);
  assert.match(loginPage, /getApiErrorMessage\(caught, "Login failed"\)/);
  assert.match(registersPage, /<ApiErrorAlert error=\{registersQuery\.error\}/);
  assert.match(registerDetailPage, /<ApiErrorAlert error=\{registerQuery\.error\}/);
  assert.match(usersPage, /<ApiErrorAlert error=\{usersQuery\.error\}/);
  assert.match(riskPanel, /<ApiErrorAlert error=\{riskQuery\.error\}/);
  assert.match(riskFormModal, /getApiErrorCode\(saveMutation\.error\)/);
  assert.match(riskFormModal, /saveMutation\.error/);
});
