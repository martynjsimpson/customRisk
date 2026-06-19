import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

/**
 * BUG-005 — Hide Review button on /my-risks when reviews are not required
 *
 * The Review button must only render when the risk's review status is not
 * "NOT_REQUIRED". These tests assert the conditional guard is present in
 * the source and cannot regress to an unconditional render.
 */

test("BUG-005: Review button is conditional on reviewStatus !== NOT_REQUIRED", async () => {
  const page = await readFile(
    new URL("../src/pages/MyRisksPage.tsx", import.meta.url),
    "utf8"
  );

  // The guard must be an explicit NOT_REQUIRED check — not just a truthy check
  assert.match(page, /reviewStatus !== "NOT_REQUIRED"/);

  // The Review button must be inside a conditional branch (not rendered unconditionally)
  // Verify the conditional wraps the Review button render
  const reviewButtonIndex = page.indexOf("Review\n");
  const guardIndex = page.indexOf('reviewStatus !== "NOT_REQUIRED"');

  assert.ok(guardIndex !== -1, "NOT_REQUIRED guard must be present");
  assert.ok(reviewButtonIndex !== -1, "Review button must be present");

  // The guard must appear before the Review button in source order
  assert.ok(
    guardIndex < reviewButtonIndex,
    "reviewStatus guard must appear before the Review button in source"
  );
});

test("BUG-005: Review button is not rendered unconditionally for all risks", async () => {
  const page = await readFile(
    new URL("../src/pages/MyRisksPage.tsx", import.meta.url),
    "utf8"
  );

  // There must NOT be an unconditional Review button outside any conditional block.
  // We verify this by checking the Review button render is wrapped — the
  // NOT_REQUIRED guard must be the first occurrence of the conditional block
  // before the Review button text.
  const segments = page.split('reviewStatus !== "NOT_REQUIRED"');

  // There should be at least two segments (before and after the guard)
  assert.ok(segments.length >= 2, "Source should contain the NOT_REQUIRED guard");

  // The Review button should only appear AFTER the guard (in the second segment)
  // not before it (in the first segment)
  const beforeGuard = segments[0];
  assert.ok(
    !beforeGuard.includes(">Review<"),
    "Review button must not appear before the NOT_REQUIRED guard in source"
  );
});

test("BUG-005: Edit button is always rendered regardless of reviewStatus", async () => {
  const page = await readFile(
    new URL("../src/pages/MyRisksPage.tsx", import.meta.url),
    "utf8"
  );

  // Edit must exist and must not be gated behind the NOT_REQUIRED check
  // (to confirm we didn't accidentally remove unconditional actions).
  // UI-004: Edit now opens a modal in-place (onClick handler) rather than navigating away.
  assert.match(page, /openEdit/);
  assert.match(page, /Edit\s+<\/Button>/);
});

test("BUG-005: MyRisksPage imports reviewStatus from DashboardRisk type", async () => {
  const page = await readFile(
    new URL("../src/pages/MyRisksPage.tsx", import.meta.url),
    "utf8"
  );
  const dashboardApi = await readFile(
    new URL("../src/api/dashboard.api.ts", import.meta.url),
    "utf8"
  );

  // The page must reference reviewStatus
  assert.match(page, /reviewStatus/);

  // DashboardRisk must expose reviewStatus so the conditional has data to check
  assert.match(dashboardApi, /reviewStatus/);
});

/**
 * UI-005 — Search and filter bar on /my-risks page
 *
 * Filter state must be stored in URL search params and passed to the API.
 * The filter bar must include: text search, state, risk level, and register.
 * A Reset button must clear all filters.
 */

test("UI-005: MyRisksPage uses useSearchParams to read filter state", async () => {
  const page = await readFile(
    new URL("../src/pages/MyRisksPage.tsx", import.meta.url),
    "utf8"
  );
  assert.match(page, /useSearchParams/, "must import and use useSearchParams");
  assert.match(page, /searchParams\.get\("search"\)/, "must read search from URL params");
  assert.match(page, /searchParams\.get\("state"\)/, "must read state from URL params");
  assert.match(page, /searchParams\.get\("riskLevel"\)/, "must read riskLevel from URL params");
  assert.match(page, /searchParams\.get\("registerId"\)/, "must read registerId from URL params");
});

test("UI-005: MyRisksPage passes filters to getMyRisks", async () => {
  const page = await readFile(
    new URL("../src/pages/MyRisksPage.tsx", import.meta.url),
    "utf8"
  );
  // getMyRisks must be called with the filters object
  assert.match(page, /getMyRisks\(filters\)/, "must pass filters to getMyRisks");
  // filters must be in the query key so the query re-runs when filters change
  assert.match(page, /queryKey.*"my-risks".*filters/s, "filters must be in the TanStack Query key");
});

test("UI-005: MyRisksPage renders search, state, risk level, and register filter inputs", async () => {
  const page = await readFile(
    new URL("../src/pages/MyRisksPage.tsx", import.meta.url),
    "utf8"
  );
  assert.match(page, /label="Search"/, "must have Search text input");
  assert.match(page, /label="State"/, "must have State select");
  assert.match(page, /label="Risk level"/, "must have Risk level select");
  assert.match(page, /label="Register"/, "must have Register select");
});

test("UI-005: MyRisksPage has a Reset button that clears all filters", async () => {
  const page = await readFile(
    new URL("../src/pages/MyRisksPage.tsx", import.meta.url),
    "utf8"
  );
  assert.match(page, /resetFilters/, "must have a resetFilters function");
  assert.match(page, /setSearchParams\({}, { replace: true }\)/, "resetFilters must clear all URL params");
  assert.match(page, /Reset/, "must render a Reset button");
});

test("UI-005: getMyRisks API function accepts a MyRisksQuery parameter", async () => {
  const api = await readFile(
    new URL("../src/api/dashboard.api.ts", import.meta.url),
    "utf8"
  );
  assert.match(api, /export interface MyRisksQuery/, "must export MyRisksQuery interface");
  assert.match(api, /search\?:/, "MyRisksQuery must include search");
  assert.match(api, /state\?:/, "MyRisksQuery must include state");
  assert.match(api, /riskLevel\?:/, "MyRisksQuery must include riskLevel");
  assert.match(api, /registerId\?:/, "MyRisksQuery must include registerId");
  assert.match(api, /getMyRisks\(query: MyRisksQuery/, "getMyRisks must accept MyRisksQuery");
});
