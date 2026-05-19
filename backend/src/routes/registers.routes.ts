import { Router } from "express";

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
  updateRegisterController,
  unlinkRegisterFromTemplateController
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
import { requireFeature } from "../middleware/requireFeature.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { createConfigExportImportSubRouter } from "./configExportImport.routes.js";
import { createConfigVersionSubRouter } from "./configVersion.routes.js";
import { createConfigurationSubRouter } from "./configuration.routes.js";
import { createRisksSubRouter } from "./risks.routes.js";
import { createRegisterTemplateSubRouter } from "./template.routes.js";

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
  router.use("/", requireFeature("draftConfig"), createConfigVersionSubRouter());
  router.use("/", requireFeature("draftConfig"), createConfigExportImportSubRouter());
  router.use("/", requireFeature("draftConfig"), createRegisterTemplateSubRouter());

  router.get("/:registerId/summary", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(getRegisterSummaryController));
  router.get("/:registerId/audit", validateRequest({ params: registerIdParamsSchema, query: auditQuerySchema }), requireRegisterManagement(), asyncRoute(listRegisterAuditController));
  router.get("/:registerId", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(getRegisterController));
  router.patch("/:registerId", validateRequest({ params: registerIdParamsSchema, body: updateRegisterSchema }), requireRegisterManagement(), asyncRoute(updateRegisterController));

  router.delete(
    "/:registerId/template-link",
    requireFeature("draftConfig"),
    requireSystemAdmin,
    validateRequest({ params: registerIdParamsSchema }),
    asyncRoute(unlinkRegisterFromTemplateController)
  );

  return router;
}
