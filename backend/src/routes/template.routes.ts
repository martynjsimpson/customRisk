import { Router } from "express";

import {
  listTemplatesController,
  getTemplateController,
  createTemplateController,
  createTemplateFromRegisterController,
  updateTemplateController,
  deactivateTemplateController,
  publishTemplateVersionController,
  createRegisterFromTemplateController,
  compareRegisterToTemplateController,
  applyTemplateUpdateToDraftController
} from "../controllers/template.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  requireRegisterManagement,
  requireSystemAdmin
} from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  templateParamsSchema,
  listTemplatesQuerySchema,
  createTemplateWithSnapshotBodySchema,
  createTemplateBodySchema,
  updateTemplateBodySchema,
  publishTemplateVersionBodySchema,
  createRegisterFromTemplateBodySchema,
  compareParamsSchema
} from "../validators/template.schemas.js";
import { registerIdParamsSchema } from "../validators/registers.schemas.js";

/**
 * Global template routes — all mounted at /templates, all require System Admin.
 */
export function createTemplateRouter() {
  const router = Router();

  router.use(authenticate);

  router.get(
    "/",
    requireSystemAdmin,
    validateRequest({ query: listTemplatesQuerySchema }),
    asyncRoute(listTemplatesController)
  );

  router.post(
    "/",
    requireSystemAdmin,
    validateRequest({ body: createTemplateWithSnapshotBodySchema }),
    asyncRoute(createTemplateController)
  );

  router.get(
    "/:templateId",
    requireSystemAdmin,
    validateRequest({ params: templateParamsSchema }),
    asyncRoute(getTemplateController)
  );

  router.patch(
    "/:templateId",
    requireSystemAdmin,
    validateRequest({ params: templateParamsSchema, body: updateTemplateBodySchema }),
    asyncRoute(updateTemplateController)
  );

  router.post(
    "/:templateId/deactivate",
    requireSystemAdmin,
    validateRequest({ params: templateParamsSchema }),
    asyncRoute(deactivateTemplateController)
  );

  router.post(
    "/:templateId/versions",
    requireSystemAdmin,
    validateRequest({ params: templateParamsSchema, body: publishTemplateVersionBodySchema }),
    asyncRoute(publishTemplateVersionController)
  );

  return router;
}

/**
 * Register-scoped template sub-router — mounted under /registers/:registerId/templates.
 * Uses mergeParams: true so that :registerId is available from the parent route.
 */
export function createRegisterTemplateSubRouter() {
  const router = Router({ mergeParams: true });

  // POST /from-register  — System Admin only
  router.post(
    "/from-register",
    requireSystemAdmin,
    validateRequest({ params: registerIdParamsSchema, body: createTemplateBodySchema }),
    asyncRoute(createTemplateFromRegisterController)
  );

  // GET  /compare/:templateVersionId — Register Management
  router.get(
    "/compare/:templateVersionId",
    validateRequest({ params: compareParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(compareRegisterToTemplateController)
  );

  // POST /apply/:templateVersionId — Register Management
  router.post(
    "/apply/:templateVersionId",
    validateRequest({ params: compareParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(applyTemplateUpdateToDraftController)
  );

  return router;
}

/**
 * Register creation from template sub-router — mounted under /registers/from-template.
 * Gated by the draftConfig feature flag alongside the other template routes.
 */
export function createRegisterFromTemplateSubRouter() {
  const router = Router({ mergeParams: true });

  // POST /from-template — System Admin only
  router.post(
    "/",
    requireSystemAdmin,
    validateRequest({ body: createRegisterFromTemplateBodySchema }),
    asyncRoute(createRegisterFromTemplateController)
  );

  return router;
}
