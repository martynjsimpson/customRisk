import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Register Admin permission UI uses register-scoped user candidates", async () => {
  const api = await readFile(new URL("../src/api/registers.api.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");

  assert.match(api, /listRegisterPermissionCandidates/);
  assert.match(api, /\/registers\/\$\{registerId\}\/permission-candidates/);
  assert.match(page, /listRegisterPermissionCandidates\(registerId\)/);
  assert.doesNotMatch(page, /from "\.\.\/api\/users\.api"/);
});

test("create register UI can submit initial Register Admin assignments", async () => {
  const page = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");

  assert.match(page, /MultiSelect/);
  assert.match(page, /initialRegisterAdminUserIds:\s*\[\]\s*as string\[\]/);
  assert.match(page, /initialRegisterAdminUserIds:\s*values\.initialRegisterAdminUserIds/);
});

test("API-backed UI surfaces use shared API error display", async () => {
  const component = await readFile(new URL("../src/components/ApiErrorAlert.tsx", import.meta.url), "utf8");
  const loginPage = await readFile(new URL("../src/pages/LoginPage.tsx", import.meta.url), "utf8");
  const registersPage = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");
  const registerDetailPage = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");
  const usersPage = await readFile(new URL("../src/pages/UsersPage.tsx", import.meta.url), "utf8");
  const riskPanel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");

  assert.match(component, /getApiErrorMessage/);
  assert.match(component, /getApiErrorFields/);
  assert.match(component, /Object\.entries\(fields\)/);
  assert.match(loginPage, /getApiErrorMessage\(caught, "Login failed"\)/);
  assert.match(registersPage, /<ApiErrorAlert error=\{registersQuery\.error\}/);
  assert.match(registerDetailPage, /<ApiErrorAlert error=\{registerQuery\.error\}/);
  assert.match(usersPage, /<ApiErrorAlert error=\{usersQuery\.error\}/);
  assert.match(riskPanel, /<ApiErrorAlert error=\{riskQuery\.error\}/);
  assert.match(riskPanel, /<ApiErrorAlert error=\{saveMutation\.error\}/);
});
