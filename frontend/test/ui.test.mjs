import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("main table surfaces have responsive containers, loading states, and empty states", async () => {
  const registersPage = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");
  const myRisksPage = await readFile(new URL("../src/pages/MyRisksPage.tsx", import.meta.url), "utf8");
  const usersPage = await readFile(new URL("../src/pages/UsersPage.tsx", import.meta.url), "utf8");
  const registerDetailPage = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");
  const riskPanel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");
  const homePage = await readFile(new URL("../src/pages/HomePage.tsx", import.meta.url), "utf8");

  for (const source of [registersPage, myRisksPage, usersPage, registerDetailPage, riskPanel, homePage]) {
    assert.match(source, /Table\.ScrollContainer/);
  }

  assert.match(registersPage, /registersQuery\.isLoading \? <Loader/);
  assert.match(registersPage, /No registers are available for your account/);
  assert.match(myRisksPage, /risksQuery\.isLoading \? <Loader/);
  assert.match(myRisksPage, /No risks are assigned to you/);
  assert.match(usersPage, /usersQuery\.isLoading \? <Loader/);
  assert.match(usersPage, /No users found/);
  assert.match(registerDetailPage, /registerQuery\.isLoading \? <Loader/);
  assert.match(registerDetailPage, /No register permissions have been assigned/);
  assert.match(riskPanel, /riskQuery\.isLoading \? <Loader/);
  assert.match(riskPanel, /No risks match the current filters/);
  assert.match(homePage, /dashboardQuery\.isLoading \? <Loader/);
});
