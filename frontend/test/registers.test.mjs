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
