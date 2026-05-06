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

  assert.match(riskForm, /<ApiErrorAlert error=\{saveMutation\.error\} fallback="Unable to save risk" \/>/);
  assert.match(usersPage, /<ApiErrorAlert[\s\S]*error=\{editingUser \? updateMutation\.error : createMutation\.error\}/);
});
