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
  assert.match(controller, /getMyRisks\(actorOrThrow\(request\)\)/);
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
