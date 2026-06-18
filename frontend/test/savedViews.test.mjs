import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("savedViews.api.ts exports listSavedViews, createSavedView, updateSavedView, deleteSavedView", async () => {
  const api = await readFile(
    new URL("../src/api/savedViews.api.ts", import.meta.url),
    "utf8"
  );

  assert.match(api, /listSavedViews/);
  assert.match(api, /createSavedView/);
  assert.match(api, /updateSavedView/);
  assert.match(api, /deleteSavedView/);
});

test("savedViews.api.ts uses correct register-scoped paths", async () => {
  const api = await readFile(
    new URL("../src/api/savedViews.api.ts", import.meta.url),
    "utf8"
  );

  assert.match(api, /\/registers\/\$\{registerId\}\/saved-views/);
  assert.match(api, /\/registers\/\$\{registerId\}\/saved-views\/\$\{id\}/);
});

test("savedViews flag exists in EnabledFeatures contract and useFeatureFlags allOff", async () => {
  const contracts = await readFile(
    new URL("../src/api/contracts.ts", import.meta.url),
    "utf8"
  );
  const flags = await readFile(
    new URL("../src/hooks/useFeatureFlags.ts", import.meta.url),
    "utf8"
  );

  assert.match(contracts, /savedViews: boolean/);
  assert.match(flags, /savedViews:\s*false/);
});

test("SavedViewsPanel is gated behind savedViews feature flag in RiskRegisterPanel", async () => {
  const panel = await readFile(
    new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(panel, /flags\.savedViews/);
  assert.match(panel, /SavedViewsPanel/);
});

test("SavedViewsPanel exposes save current view, list views, apply, and delete", async () => {
  const panel = await readFile(
    new URL("../src/features/risks/SavedViewsPanel.tsx", import.meta.url),
    "utf8"
  );

  // Save current view
  assert.match(panel, /Save current view/);
  assert.match(panel, /createSavedView/);
  // List views
  assert.match(panel, /listSavedViews/);
  // Apply view — onApply callback
  assert.match(panel, /onApply/);
  // Delete view
  assert.match(panel, /deleteSavedView/);
  assert.match(panel, /IconTrash/);
});

test("listSavedViews guards against non-array API response with Array.isArray", async () => {
  const api = await readFile(
    new URL("../src/api/savedViews.api.ts", import.meta.url),
    "utf8"
  );

  // The fix for BUG-002: listSavedViews must not call .map() on an unknown
  // response shape — it must return [] when the payload is not an array.
  assert.match(api, /Array\.isArray/);
  assert.match(api, /\? response\.data\.data : \[\]/);
});

test("RiskRegisterPanel wires savedViews onApply to update both filters and columns", async () => {
  const panel = await readFile(
    new URL("../src/features/risks/RiskRegisterPanel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(panel, /view\.filters/);
  assert.match(panel, /view\.columns/);
  assert.match(panel, /setFilters/);
  assert.match(panel, /setColumns/);
});
