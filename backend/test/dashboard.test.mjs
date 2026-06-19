import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("dashboard routes are mounted under api dashboard path", async () => {
  const indexRoutes = await readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8");
  const dashboardRoutes = await readFile(new URL("../src/routes/dashboard.routes.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/dashboard.controller.ts", import.meta.url), "utf8");

  assert.match(indexRoutes, /router\.use\("\/dashboard", createDashboardRouter\(\)\)/);
  assert.match(dashboardRoutes, /router\.use\(authenticate\)/);
  assert.match(dashboardRoutes, /router\.get\("\/my-work"/);
  assert.match(dashboardRoutes, /router\.get\("\/my-risks"/);
  assert.match(dashboardRoutes, /router\.get\("\/admin-summary"/);
  assert.match(controller, /getMyWork\(actorOrThrow\(request\)\)/);
  assert.match(controller, /getMyRisks\(actorOrThrow\(request\), request\.query\)/);
  assert.match(controller, /getAdminSummary\(actorOrThrow\(request\)\)/);
});

test("dashboard service scopes owner, admin, and system data separately", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  assert.match(service, /ownerUserId: actor\.id/);
  assert.match(service, /role: "REGISTER_ADMIN"/);
  assert.match(service, /Register Admin or System Admin permission is required/);
  assert.match(service, /systemSummary: null/);
  assert.match(service, /recentAuditActivity/);
  assert.match(service, /register: \{ reviewsEnabled: true \}/);
  assert.match(service, /state: \{ not: "CLOSED" \}/);
  assert.match(service, /getDueSoonLimit/);
});

test("my-risks route validates query params with myRisksQuerySchema", async () => {
  const dashboardRoutes = await readFile(new URL("../src/routes/dashboard.routes.ts", import.meta.url), "utf8");

  assert.match(dashboardRoutes, /myRisksQuerySchema/);
  assert.match(dashboardRoutes, /validateRequest\(\{[^}]*query: myRisksQuerySchema/s);
});

test("myRisksQuerySchema accepts valid filter params", async () => {
  const { myRisksQuerySchema } = await import("../src/validators/dashboard.schemas.ts");

  // No params — defaults to empty object
  const empty = myRisksQuerySchema.parse({});
  assert.equal(empty.search, undefined);
  assert.equal(empty.state, undefined);
  assert.equal(empty.riskLevel, undefined);
  assert.equal(empty.registerId, undefined);

  // All params provided
  const full = myRisksQuerySchema.parse({
    search: "  data breach  ",
    state: "OPEN",
    riskLevel: "High",
    registerId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
  });
  assert.equal(full.search, "data breach"); // trimmed
  assert.equal(full.state, "OPEN");
  assert.equal(full.riskLevel, "High");
  assert.equal(full.registerId, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
});

test("myRisksQuerySchema rejects invalid state values", async () => {
  const { myRisksQuerySchema } = await import("../src/validators/dashboard.schemas.ts");

  assert.throws(() => myRisksQuerySchema.parse({ state: "ARCHIVED" }));
});

test("myRisksQuerySchema rejects non-UUID registerId", async () => {
  const { myRisksQuerySchema } = await import("../src/validators/dashboard.schemas.ts");

  assert.throws(() => myRisksQuerySchema.parse({ registerId: "not-a-uuid" }));
});

test("getMyRisks service applies ownership filter including ownerPerson join", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // Both legacy ownerUserId and the joined ownerPerson path must be included
  assert.match(service, /ownerPerson: \{ userId: actor\.id \}/);
  assert.match(service, /ownerUserId: actor\.id/);
});

test("getMyRisks service applies search filter on title and description", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  assert.match(service, /query\.search/);
  assert.match(service, /title: \{ contains: query\.search, mode: "insensitive" \}/);
  assert.match(service, /description: \{ contains: query\.search, mode: "insensitive" \}/);
});

test("getMyRisks service applies riskLevel name filter case-insensitively", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  assert.match(service, /query\.riskLevel/);
  assert.match(service, /riskLevel: \{ name: \{ equals: query\.riskLevel, mode: "insensitive" \} \}/);
});

test("getMyRisks service applies registerId filter", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  assert.match(service, /query\.registerId/);
  assert.match(service, /registerId: query\.registerId/);
});

test("getMyRisks service defaults to excluding closed risks when state param is absent", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // The default exclusion of CLOSED state must remain
  assert.match(service, /state: \{ not: "CLOSED" \}/);
});

test("getMyRisks service accepts explicit state filter overriding the default", async () => {
  const service = await readFile(new URL("../src/services/dashboard.service.ts", import.meta.url), "utf8");

  // When a state is supplied it should be applied directly
  assert.match(service, /state: query\.state/);
});
