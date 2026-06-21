import { Router } from "express";

import {
  analyseImpactController,
  createDraftController,
  discardDraftController,
  getConfigVersionStatusController,
  listConfigVersionsController,
  publishDraftController,
  updateDraftController,
  validateFormulaController
} from "../controllers/configVersion.controller.js";
import { requireRegisterManagement } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  registerIdParamsSchema,
  updateDraftBodySchema,
  validateFormulaBodySchema
} from "../validators/configVersion.schemas.js";

export function createConfigVersionSubRouter() {
  const router = Router({ mergeParams: true });

  router.get(
    "/status",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(getConfigVersionStatusController)
  );

  router.get(
    "/",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(listConfigVersionsController)
  );

  router.post(
    "/draft",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(createDraftController)
  );

  router.patch(
    "/draft",
    validateRequest({ params: registerIdParamsSchema, body: updateDraftBodySchema }),
    requireRegisterManagement(),
    asyncRoute(updateDraftController)
  );

  router.delete(
    "/draft",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(discardDraftController)
  );

  router.post(
    "/draft/impact",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(analyseImpactController)
  );

  router.post(
    "/draft/publish",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(publishDraftController)
  );

  router.post(
    "/validate-formula",
    validateRequest({ params: registerIdParamsSchema, body: validateFormulaBodySchema }),
    requireRegisterManagement(),
    asyncRoute(validateFormulaController)
  );

  return router;
}
