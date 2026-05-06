import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";

import { listRegisterAuditController } from "../controllers/audit.controller.js";
import {
  addRegisterPermissionController,
  createRegisterController,
  getRegisterController,
  getRegisterSummaryController,
  listRegisterPermissionCandidatesController,
  listRegisterPermissionsController,
  listRegistersController,
  removeRegisterPermissionController,
  updateRegisterController
} from "../controllers/registers.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  requireRegisterAccess,
  requireRegisterManagement,
  requireSystemAdmin
} from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { auditQuerySchema } from "../validators/audit.schemas.js";
import {
  createRegisterPermissionSchema,
  createRegisterSchema,
  listRegistersQuerySchema,
  registerIdParamsSchema,
  registerPermissionParamsSchema,
  updateRegisterSchema
} from "../validators/registers.schemas.js";
import { createConfigurationSubRouter } from "./configuration.routes.js";
import { createRisksSubRouter } from "./risks.routes.js";

type AsyncHandler = (request: Request<any, any, any, any>, response: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createRegistersRouter() {
  const router = Router();

  router.use(authenticate);
  router.get("/", validateRequest({ query: listRegistersQuerySchema }), asyncRoute(listRegistersController));
  router.post("/", requireSystemAdmin, validateRequest({ body: createRegisterSchema }), asyncRoute(createRegisterController));
  router.get("/:registerId/permissions", validateRequest({ params: registerIdParamsSchema }), requireRegisterManagement(), asyncRoute(listRegisterPermissionsController));
  router.get("/:registerId/permission-candidates", validateRequest({ params: registerIdParamsSchema }), requireRegisterManagement(), asyncRoute(listRegisterPermissionCandidatesController));
  router.post("/:registerId/permissions", validateRequest({ params: registerIdParamsSchema, body: createRegisterPermissionSchema }), requireRegisterManagement(), asyncRoute(addRegisterPermissionController));
  router.delete("/:registerId/permissions/:permissionId", validateRequest({ params: registerPermissionParamsSchema }), requireRegisterManagement(), asyncRoute(removeRegisterPermissionController));

  router.use("/", createRisksSubRouter());
  router.use("/", createConfigurationSubRouter());

  router.get("/:registerId/summary", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(getRegisterSummaryController));
  router.get("/:registerId/audit", validateRequest({ params: registerIdParamsSchema, query: auditQuerySchema }), requireRegisterManagement(), asyncRoute(listRegisterAuditController));
  router.get("/:registerId", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(getRegisterController));
  router.patch("/:registerId", validateRequest({ params: registerIdParamsSchema, body: updateRegisterSchema }), requireRegisterManagement(), asyncRoute(updateRegisterController));

  return router;
}
