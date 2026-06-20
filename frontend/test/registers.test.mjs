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
  const wizard = await readFile(
    new URL("../src/features/configuration/CreateRegisterWizard.tsx", import.meta.url),
    "utf8"
  );

  assert.match(wizard, /MultiSelect/);
  assert.match(wizard, /initialRegisterAdminUserIds:\s*\[\]\s*as string\[\]/);
  assert.match(wizard, /initialRegisterAdminUserIds:\s*values\.initialRegisterAdminUserIds/);
});

test("CreateRegisterWizard is a multi-step guided flow with conditional reviews step", async () => {
  const wizard = await readFile(
    new URL("../src/features/configuration/CreateRegisterWizard.tsx", import.meta.url),
    "utf8"
  );

  // Progress indicator and step count label
  assert.match(wizard, /Progress/);
  assert.match(wizard, /Step \{currentIndex \+ 1\} of \{steps\.length\}/);

  // All nine possible steps are defined
  for (const step of ["basic-info", "risk-ids", "features", "reviews", "likelihood", "impact", "risk-levels", "matrix", "custom-fields"]) {
    assert.match(wizard, new RegExp(`"${step}"`));
  }

  // Reviews step is conditional: only included when reviewsEnabled
  assert.match(wizard, /getStepList\(reviewsEnabled\)/);
  assert.match(wizard, /if \(reviewsEnabled\) base\.push\("reviews"\)/);

  // Uses createRegister and updateRegister API calls
  assert.match(wizard, /createRegister/);
  assert.match(wizard, /updateRegister/);

  // On finish: navigate to the new register and invalidate query cache
  assert.match(wizard, /navigate\(`\/registers\/\$\{registerId\}`\)/);
  assert.match(wizard, /invalidateQueries.*"registers"/);

  // Custom-fields step widens the modal
  assert.match(wizard, /stepId === "custom-fields" \? "90vw" : "xl"/);

  // Matrix step uses wizardMode prop (auto-saves; no separate save button)
  assert.match(wizard, /MatrixConfigTab.*wizardMode/s);

  // Navigation: formRef.requestSubmit() drives form steps; direct navigation drives config steps
  assert.match(wizard, /formRef\.current\?\.requestSubmit\(\)/);
  assert.match(wizard, /isFormStep/);
});

test("UI-020: open-risk count renders as a link to /registers/<id>?state=OPEN", async () => {
  const page = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");

  // Open risks count must be wrapped in an Anchor/Link pointing to ?state=OPEN
  assert.match(page, /to=\{`\/registers\/\$\{register\.id\}\?state=OPEN`\}/);
  assert.match(page, /openRisksCount/);
});

test("UI-020: overdue count renders as a link to /registers/<id>?reviewStatus=OVERDUE", async () => {
  const page = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");

  // Overdue count must be wrapped in an Anchor/Link pointing to ?reviewStatus=OVERDUE
  assert.match(page, /to=\{`\/registers\/\$\{register\.id\}\?reviewStatus=OVERDUE`\}/);
  assert.match(page, /overdueRisksCount/);
});

test("UI-020: RegistersPage table renders Name, Role, Open risks and Overdue columns", async () => {
  const page = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");

  assert.match(page, /Open risks/);
  assert.match(page, /Overdue/);
  assert.match(page, /Name/);
  assert.match(page, /Role/);
});

test("RegistersPage opens the wizard on Create register click and is gated to system admins", async () => {
  const page = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");

  assert.match(page, /CreateRegisterWizard/);
  assert.match(page, /isSystemAdmin \? <Button onClick=\{openWizard\}/);
  assert.match(page, /opened=\{wizardOpen\}/);
  assert.match(page, /onClose=\{closeWizard\}/);
});
