import { Router } from "express";

import {
  createSavedViewController,
  deleteSavedViewController,
  listSavedViewsController,
  updateSavedViewController
} from "../controllers/savedViews.controller.js";
import { requireRegisterAccess } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  createSavedViewSchema,
  savedViewIdParamsSchema,
  savedViewRegisterParamsSchema,
  updateSavedViewSchema
} from "../validators/savedViews.schemas.js";

export function createSavedViewsSubRouter() {
  const router = Router({ mergeParams: true });

  router.get(
    "/:registerId/saved-views",
    validateRequest({ params: savedViewRegisterParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(listSavedViewsController)
  );

  router.post(
    "/:registerId/saved-views",
    validateRequest({ params: savedViewRegisterParamsSchema, body: createSavedViewSchema }),
    requireRegisterAccess(),
    asyncRoute(createSavedViewController)
  );

  router.patch(
    "/:registerId/saved-views/:viewId",
    validateRequest({ params: savedViewIdParamsSchema, body: updateSavedViewSchema }),
    requireRegisterAccess(),
    asyncRoute(updateSavedViewController)
  );

  router.delete(
    "/:registerId/saved-views/:viewId",
    validateRequest({ params: savedViewIdParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(deleteSavedViewController)
  );

  return router;
}
