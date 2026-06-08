import { Router } from "express";

import {
  exportSystemAuditController,
  getAuditEventController,
  getAuditEventSnapshotController,
  listSystemAuditController
} from "../controllers/audit.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  auditEventParamsSchema,
  auditQuerySchema
} from "../validators/audit.schemas.js";

export function createAuditRouter() {
  const router = Router();

  router.use(authenticate);
  router.get(
    "/system/export",
    validateRequest({ query: auditQuerySchema }),
    requireSystemAdmin,
    asyncRoute(exportSystemAuditController)
  );
  router.get(
    "/system",
    validateRequest({ query: auditQuerySchema }),
    requireSystemAdmin,
    asyncRoute(listSystemAuditController)
  );
  router.get(
    "/events/:auditEventId/snapshot",
    validateRequest({ params: auditEventParamsSchema }),
    asyncRoute(getAuditEventSnapshotController)
  );
  router.get(
    "/events/:auditEventId",
    validateRequest({ params: auditEventParamsSchema }),
    asyncRoute(getAuditEventController)
  );

  return router;
}
