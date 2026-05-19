import { Router } from "express";

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
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  registerIdParamsSchema,
  updateDraftBodySchema
} from "../validators/configVersion.schemas.js";

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
