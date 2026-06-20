import { Router } from "express";

import {
  listActionsController,
  getActionController,
  createActionController,
  updateActionController,
  deleteActionController
} from "../controllers/responseActions.controller.js";
import {
  requireRiskView,
  requireRiskEdit,
  requireActionView,
  requireActionOwner
} from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { riskIdParamsSchema } from "../validators/risks.schemas.js";
import {
  actionIdParamsSchema,
  createActionSchema,
  updateActionSchema
} from "../validators/responseActions.schemas.js";

export function createResponseActionsSubRouter() {
  const router = Router({ mergeParams: true });

  // GET /registers/:registerId/risks/:riskId/actions
  router.get(
    "/:registerId/risks/:riskId/actions",
    validateRequest({ params: riskIdParamsSchema }),
    requireRiskView(),
    asyncRoute(listActionsController)
  );

  // POST /registers/:registerId/risks/:riskId/actions
  router.post(
    "/:registerId/risks/:riskId/actions",
    validateRequest({ params: riskIdParamsSchema, body: createActionSchema }),
    requireRiskEdit(),
    asyncRoute(createActionController)
  );

  // GET /registers/:registerId/risks/:riskId/actions/:actionId
  router.get(
    "/:registerId/risks/:riskId/actions/:actionId",
    validateRequest({ params: actionIdParamsSchema }),
    requireActionView("actionId", "registerId"),
    asyncRoute(getActionController)
  );

  // PATCH /registers/:registerId/risks/:riskId/actions/:actionId
  router.patch(
    "/:registerId/risks/:riskId/actions/:actionId",
    validateRequest({ params: actionIdParamsSchema, body: updateActionSchema }),
    requireActionOwner("actionId", "registerId"),
    asyncRoute(updateActionController)
  );

  // DELETE /registers/:registerId/risks/:riskId/actions/:actionId
  router.delete(
    "/:registerId/risks/:riskId/actions/:actionId",
    validateRequest({ params: actionIdParamsSchema }),
    requireActionView("actionId", "registerId"),
    asyncRoute(deleteActionController)
  );

  return router;
}
