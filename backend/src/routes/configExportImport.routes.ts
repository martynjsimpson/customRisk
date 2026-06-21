import { Router } from "express";

import { exportRegisterConfigController } from "../controllers/configExport.controller.js";
import { importRegisterConfigController } from "../controllers/configImport.controller.js";
import { requireRegisterManagement } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { registerIdParamsSchema } from "../validators/registers.schemas.js";

export function createConfigExportImportSubRouter() {
  const router = Router({ mergeParams: true });

  router.get(
    "/export",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(exportRegisterConfigController)
  );

  router.post(
    "/import",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(importRegisterConfigController)
  );

  return router;
}
