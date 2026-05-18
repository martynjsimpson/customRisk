import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";

import {
  analyseImpactController,
  createDraftController,
  discardDraftController,
  getConfigVersionStatusController,
  listConfigVersionsController,
  publishDraftController,
  updateDraftController
} from "../controllers/configVersion.controller.js";
import { requireRegisterManagement } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  registerIdParamsSchema,
  updateDraftBodySchema
} from "../validators/configVersion.schemas.js";

type AsyncHandler = (request: Request<any, any, any, any>, response: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createConfigVersionSubRouter() {
  const router = Router({ mergeParams: true });

  router.get(
    "/:registerId/config-versions/status",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(getConfigVersionStatusController)
  );

  router.get(
    "/:registerId/config-versions",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(listConfigVersionsController)
  );

  router.post(
    "/:registerId/config-versions/draft",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(createDraftController)
  );

  router.patch(
    "/:registerId/config-versions/draft",
    validateRequest({ params: registerIdParamsSchema, body: updateDraftBodySchema }),
    requireRegisterManagement(),
    asyncRoute(updateDraftController)
  );

  router.delete(
    "/:registerId/config-versions/draft",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(discardDraftController)
  );

  router.post(
    "/:registerId/config-versions/draft/impact",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(analyseImpactController)
  );

  router.post(
    "/:registerId/config-versions/draft/publish",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(publishDraftController)
  );

  return router;
}
