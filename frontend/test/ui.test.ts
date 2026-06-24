/**
 * UI quality standards — static assertion tests
 *
 * Verifies that main table surfaces across the application meet the required
 * structural standards:
 *
 * - All tables use Table.ScrollContainer for horizontal responsiveness.
 * - Loading states use <Loader> components tied to query isLoading flags.
 * - Empty states render user-facing dimmed text messages.
 * - Badge components are configured to prevent label truncation (flexShrink,
 *   minWidth, maxWidth, textOverflow, whiteSpace theme defaults in main.tsx).
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("main table surfaces have responsive containers, loading states, and empty states", async () => {
  const registersPage = await readFile(new URL("../src/pages/RegistersPage.tsx", import.meta.url), "utf8");
  const myRisksPanel = await readFile(new URL("../src/features/myRisks/MyRisksPanel.tsx", import.meta.url), "utf8");
  const usersPanel = await readFile(new URL("../src/features/users/UsersPanel.tsx", import.meta.url), "utf8");
  const registerPermissionsPanel = await readFile(new URL("../src/features/registers/RegisterPermissionsPanel.tsx", import.meta.url), "utf8");
  const registerDetailPage = await readFile(new URL("../src/pages/RegisterDetailPage.tsx", import.meta.url), "utf8");
  const riskPanel = await readFile(new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url), "utf8");
  const homePage = await readFile(new URL("../src/pages/HomePage.tsx", import.meta.url), "utf8");
  const auditTable = await readFile(new URL("../src/features/audit/AuditEventTable.tsx", import.meta.url), "utf8");
  const customFieldTable = await readFile(new URL("../src/features/configuration/CustomFieldTable.tsx", import.meta.url), "utf8");
  const scoringValueTab = await readFile(new URL("../src/features/configuration/ScoringValueConfigTab.tsx", import.meta.url), "utf8");
  const riskLevelTab = await readFile(new URL("../src/features/configuration/RiskLevelConfigTab.tsx", import.meta.url), "utf8");
  const optionsModal = await readFile(new URL("../src/features/configuration/CustomFieldOptionsModal.tsx", import.meta.url), "utf8");
  const riskDetailModal = await readFile(new URL("../src/features/risks/RiskDetailModal.tsx", import.meta.url), "utf8");

  for (const source of [
    registersPage,
    myRisksPanel,
    usersPanel,
    registerPermissionsPanel,
    riskPanel,
    homePage,
    auditTable,
    customFieldTable,
    scoringValueTab,
    riskLevelTab,
    optionsModal,
    riskDetailModal
  ]) {
    assert.match(source, /Table\.ScrollContainer/);
  }

  assert.match(registersPage, /registersQuery\.isLoading \? <Loader/);
  assert.match(registersPage, /No registers are available for your account/);
  assert.match(myRisksPanel, /risksQuery\.isLoading \? <Loader/);
  assert.match(myRisksPanel, /No risks are assigned to you/);
  assert.match(usersPanel, /usersQuery\.isLoading \? <Loader/);
  assert.match(usersPanel, /No users found/);
  assert.match(registerDetailPage, /registerQuery\.isLoading \? <Loader/);
  assert.match(registerPermissionsPanel, /No register permissions have been assigned/);
  assert.match(riskPanel, /riskQuery\.isLoading \? <Loader/);
  assert.match(riskPanel, /No risks match the current filters/);
  assert.match(scoringValueTab, /configQuery\.isLoading/);
  assert.match(scoringValueTab, /<Loader/);
  assert.match(homePage, /dashboardQuery\.isLoading \? <Loader/);
});

test("badge styling prevents semantic labels from truncating", async () => {
  const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
  const homePage = await readFile(new URL("../src/pages/HomePage.tsx", import.meta.url), "utf8");
  const reviewStatusBadge = await readFile(new URL("../src/components/ReviewStatusBadge/ReviewStatusBadge.tsx", import.meta.url), "utf8");

  assert.match(main, /Badge:\s*\{/);
  assert.match(main, /flexShrink:\s*0/);
  assert.match(main, /minWidth:\s*"max-content"/);
  assert.match(main, /maxWidth:\s*"none"/);
  assert.match(main, /textOverflow:\s*"clip"/);
  assert.match(main, /whiteSpace:\s*"nowrap"/);
  assert.match(homePage, /ReviewStatusBadge/);
  assert.match(reviewStatusBadge, /status\.replace\(\/_\/g,\s*" "\)/);
});
