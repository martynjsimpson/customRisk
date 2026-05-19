import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";

import { exportRegisterConfigController } from "../controllers/configExport.controller.js";
import { importRegisterConfigController } from "../controllers/configImport.controller.js";
import { requireRegisterManagement } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { registerIdParamsSchema } from "../validators/registers.schemas.js";

type AsyncHandler = (request: Request<any, any, any, any>, response: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createConfigExportImportSubRouter() {
  const router = Router({ mergeParams: true });

  router.get(
    "/:registerId/config-versions/export",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(exportRegisterConfigController)
  );

  router.post(
    "/:registerId/config-versions/import",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(importRegisterConfigController)
  );

  return router;
}
