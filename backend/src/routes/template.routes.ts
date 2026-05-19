import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";

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

type AsyncHandler = (request: Request<any, any, any, any>, response: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

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
 * Register-scoped template sub-router — mounted under /registers/:registerId.
 * Uses mergeParams: true so that :registerId is available.
 */
export function createRegisterTemplateSubRouter() {
  const router = Router({ mergeParams: true });

  // POST /:registerId/templates/from-register  — System Admin only
  router.post(
    "/:registerId/templates/from-register",
    requireSystemAdmin,
    validateRequest({ params: registerIdParamsSchema, body: createTemplateBodySchema }),
    asyncRoute(createTemplateFromRegisterController)
  );

  // POST /:registerId/registers/from-template — System Admin only
  router.post(
    "/from-template",
    requireSystemAdmin,
    validateRequest({ body: createRegisterFromTemplateBodySchema }),
    asyncRoute(createRegisterFromTemplateController)
  );

  // GET  /:registerId/templates/compare/:templateVersionId — Register Management
  router.get(
    "/:registerId/templates/compare/:templateVersionId",
    validateRequest({ params: compareParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(compareRegisterToTemplateController)
  );

  // POST /:registerId/templates/apply/:templateVersionId — Register Management
  router.post(
    "/:registerId/templates/apply/:templateVersionId",
    validateRequest({ params: compareParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(applyTemplateUpdateToDraftController)
  );

  return router;
}
