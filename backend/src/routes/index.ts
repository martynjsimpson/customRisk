import { Router } from "express";

import { requireFeature } from "../middleware/requireFeature.js";
import { createApiKeysRouter } from "./apiKeys.routes.js";
import { createAuthRouter } from "./auth.routes.js";
import { createAuditRouter } from "./audit.routes.js";
import { createDashboardRouter } from "./dashboard.routes.js";
import { createHealthRouter } from "./health.routes.js";
import { createMetricsRouter } from "./metrics.routes.js";
import { createPersonsRouter } from "./persons.routes.js";
import { createRegistersRouter } from "./registers.routes.js";
import { createTemplateRouter } from "./template.routes.js";
import { createUsersRouter } from "./users.routes.js";

export function createApiRouter() {
  const router = Router();

  router.use(createHealthRouter());
  router.use(createMetricsRouter());
  router.use("/auth", createAuthRouter());
  router.use("/audit", createAuditRouter());
  router.use("/admin/api-keys", requireFeature("apiKeys"), createApiKeysRouter());
  router.use("/dashboard", createDashboardRouter());
  router.use("/persons", createPersonsRouter());
  router.use("/registers", createRegistersRouter());
  router.use("/templates", requireFeature("draftConfig"), createTemplateRouter());
  router.use("/users", createUsersRouter());

  return router;
}
