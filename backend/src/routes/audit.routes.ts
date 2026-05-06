import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";

import {
  getAuditEventController,
  getAuditEventSnapshotController,
  listSystemAuditController
} from "../controllers/audit.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  auditEventParamsSchema,
  auditQuerySchema
} from "../validators/audit.schemas.js";

type AsyncHandler = (request: Request<any, any, any, any>, response: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createAuditRouter() {
  const router = Router();

  router.use(authenticate);
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
