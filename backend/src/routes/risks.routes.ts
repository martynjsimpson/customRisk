import { Router } from "express";

import {
  listRiskAuditController
} from "../controllers/audit.controller.js";
import {
  completeRiskReviewController,
  listRiskReviewsController
} from "../controllers/reviews.controller.js";
import {
  createRiskController,
  deleteRiskController,
  exportRisksController,
  getRiskDetailController,
  getRiskValidationSummaryController,
  listRisksController,
  updateRiskController
} from "../controllers/risks.controller.js";
import {
  requireExportAccess,
  requireRegisterAccess,
  requireRiskEdit,
  requireRiskView,
  requireSystemAdmin
} from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { auditQuerySchema } from "../validators/audit.schemas.js";
import { registerIdParamsSchema } from "../validators/registers.schemas.js";
import {
  createRiskReviewSchema,
  createRiskSchema,
  deleteRiskSchema,
  listRisksQuerySchema,
  riskIdParamsSchema,
  updateRiskSchema
} from "../validators/risks.schemas.js";

export function createRisksSubRouter() {
  const router = Router({ mergeParams: true });

  router.get(
    "/:registerId/risks",
    validateRequest({ params: registerIdParamsSchema, query: listRisksQuerySchema }),
    requireRegisterAccess(),
    asyncRoute(listRisksController)
  );
  router.post(
    "/:registerId/risks",
    validateRequest({ params: registerIdParamsSchema, body: createRiskSchema }),
    requireRegisterAccess(),
    asyncRoute(createRiskController)
  );
  router.get(
    "/:registerId/risks/export",
    validateRequest({ params: registerIdParamsSchema, query: listRisksQuerySchema }),
    requireExportAccess(),
    asyncRoute(exportRisksController)
  );
  router.get(
    "/:registerId/risks/validation-summary",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(getRiskValidationSummaryController)
  );
  router.get(
    "/:registerId/risks/:riskId/reviews",
    validateRequest({ params: riskIdParamsSchema }),
    requireRiskView(),
    asyncRoute(listRiskReviewsController)
  );
  router.post(
    "/:registerId/risks/:riskId/reviews",
    validateRequest({ params: riskIdParamsSchema, body: createRiskReviewSchema }),
    requireRiskEdit(),
    asyncRoute(completeRiskReviewController)
  );
  router.get(
    "/:registerId/risks/:riskId/audit",
    validateRequest({ params: riskIdParamsSchema, query: auditQuerySchema }),
    requireRiskView(),
    asyncRoute(listRiskAuditController)
  );
  router.get(
    "/:registerId/risks/:riskId",
    validateRequest({ params: riskIdParamsSchema }),
    requireRiskView(),
    asyncRoute(getRiskDetailController)
  );
  router.patch(
    "/:registerId/risks/:riskId",
    validateRequest({ params: riskIdParamsSchema, body: updateRiskSchema }),
    requireRiskEdit(),
    asyncRoute(updateRiskController)
  );
  router.delete(
    "/:registerId/risks/:riskId",
    validateRequest({ params: riskIdParamsSchema, body: deleteRiskSchema }),
    requireSystemAdmin,
    asyncRoute(deleteRiskController)
  );

  return router;
}
