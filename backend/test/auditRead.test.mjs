import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { auditQuerySchema } from "../src/validators/audit.schemas.ts";

test("audit query schema supports MVP audit filters", () => {
  const parsed = auditQuerySchema.parse({
    page: "2",
    pageSize: "50",
    dateFrom: "2026-05-01",
    dateTo: "2026-05-31",
    actorUserId: "00000000-0000-4000-8000-000000000001",
    action: "RISK_UPDATED",
    objectType: "RISK",
    registerId: "00000000-0000-4000-8000-000000000002",
    riskId: "00000000-0000-4000-8000-000000000003",
    displayRiskId: "ISEC-0001",
    ipAddress: "203.0.113.10"
  });

  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 50);
  assert.equal(parsed.action, "RISK_UPDATED");
  assert.equal(parsed.objectType, "RISK");
  assert.equal(parsed.displayRiskId, "ISEC-0001");
});

test("audit routes enforce system, register, risk, event, and snapshot access paths", async () => {
  const indexRoutes = await readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8");
  const auditRoutes = await readFile(new URL("../src/routes/audit.routes.ts", import.meta.url), "utf8");
  const registerRoutes = await readFile(new URL("../src/routes/registers.routes.ts", import.meta.url), "utf8");

  assert.match(indexRoutes, /router\.use\("\/audit", createAuditRouter\(\)\)/);
  assert.match(auditRoutes, /router\.get\(\n\s+"\/system"/);
  assert.match(auditRoutes, /requireSystemAdmin/);
  assert.match(auditRoutes, /"\/events\/:auditEventId\/snapshot"/);
  assert.match(auditRoutes, /"\/events\/:auditEventId"/);
  assert.match(registerRoutes, /"\/:registerId\/audit"/);
  assert.match(registerRoutes, /requireRegisterManagement\(\)/);
  assert.match(registerRoutes, /"\/:registerId\/risks\/:riskId\/audit"/);
  assert.match(registerRoutes, /requireRiskView\(\)/);
});

test("audit read service restricts event details and snapshots by scope", async () => {
  const service = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");

  assert.match(service, /listSystemAuditEvents/);
  assert.match(service, /System Admin permission is required/);
  assert.match(service, /listRegisterAuditEvents/);
  assert.match(service, /listRiskAuditEvents/);
  assert.match(service, /assertCanReadAuditEvent/);
  assert.match(service, /canViewRisk/);
  assert.match(service, /canManageRegister/);
  assert.match(service, /getAuditEventSnapshot/);
  assert.match(service, /path: \["ipAddress"\]/);
});
