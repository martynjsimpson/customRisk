import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";

import {
  createRegisterController,
  addRegisterPermissionController,
  getRegisterController,
  getRegisterSummaryController,
  listRegisterPermissionCandidatesController,
  listRegisterPermissionsController,
  listRegistersController,
  removeRegisterPermissionController,
  updateRegisterController
} from "../controllers/registers.controller.js";
import {
  activateCustomFieldController,
  createCustomFieldController,
  createCustomFieldOptionController,
  createImpactValueController,
  createLikelihoodValueController,
  createRiskLevelController,
  deactivateCustomFieldController,
  deactivateCustomFieldOptionController,
  deactivateImpactValueController,
  deactivateLikelihoodValueController,
  deactivateRiskLevelController,
  getCustomFieldController,
  getRegisterConfigController,
  getRiskFormConfigController,
  listCustomFieldOptionsController,
  listCustomFieldsController,
  listImpactValuesController,
  listLikelihoodValuesController,
  listRiskLevelsController,
  updateCustomFieldController,
  updateCustomFieldOptionController,
  updateImpactValueController,
  updateLikelihoodValueController,
  updateRiskLevelController
} from "../controllers/configuration.controller.js";
import {
  createRiskController,
  deleteRiskController,
  exportRisksController,
  getRiskDetailController,
  listRisksController,
  updateRiskController
} from "../controllers/risks.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  requireRegisterAccess,
  requireRegisterManagement,
  requireExportAccess,
  requireRiskEdit,
  requireRiskView,
  requireSystemAdmin
} from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createRegisterSchema,
  createRegisterPermissionSchema,
  listRegistersQuerySchema,
  registerPermissionParamsSchema,
  registerIdParamsSchema,
  updateRegisterSchema
} from "../validators/registers.schemas.js";
import {
  createCustomFieldSchema,
  createCustomFieldOptionSchema,
  createImpactValueSchema,
  createLikelihoodValueSchema,
  createRiskLevelSchema,
  customFieldOptionParamsSchema,
  customFieldParamsSchema,
  impactParamsSchema,
  likelihoodParamsSchema,
  riskLevelParamsSchema,
  updateCustomFieldSchema,
  updateCustomFieldOptionSchema,
  updateImpactValueSchema,
  updateLikelihoodValueSchema,
  updateRiskLevelSchema
} from "../validators/configuration.schemas.js";
import {
  createRiskSchema,
  deleteRiskSchema,
  listRisksQuerySchema,
  riskIdParamsSchema,
  updateRiskSchema
} from "../validators/risks.schemas.js";

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
  router.get(
    "/:registerId/permissions",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(listRegisterPermissionsController)
  );
  router.get(
    "/:registerId/permission-candidates",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(listRegisterPermissionCandidatesController)
  );
  router.post(
    "/:registerId/permissions",
    validateRequest({ params: registerIdParamsSchema, body: createRegisterPermissionSchema }),
    requireRegisterManagement(),
    asyncRoute(addRegisterPermissionController)
  );
  router.delete(
    "/:registerId/permissions/:permissionId",
    validateRequest({ params: registerPermissionParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(removeRegisterPermissionController)
  );
  router.get(
    "/:registerId/risks",
    validateRequest({ params: registerIdParamsSchema, query: listRisksQuerySchema }),
    requireRegisterAccess(),
    asyncRoute(listRisksController)
  );
  router.post(
    "/:registerId/risks",
    validateRequest({ params: registerIdParamsSchema, body: createRiskSchema }),
    requireRegisterAccess(),
    asyncRoute(createRiskController)
  );
  router.get(
    "/:registerId/risks/export",
    validateRequest({ params: registerIdParamsSchema, query: listRisksQuerySchema }),
    requireExportAccess(),
    asyncRoute(exportRisksController)
  );
  router.get(
    "/:registerId/config",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(getRegisterConfigController)
  );
  router.get(
    "/:registerId/risk-form-config",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(getRiskFormConfigController)
  );
  router.get(
    "/:registerId/custom-fields",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(listCustomFieldsController)
  );
  router.post(
    "/:registerId/custom-fields",
    validateRequest({ params: registerIdParamsSchema, body: createCustomFieldSchema }),
    requireRegisterManagement(),
    asyncRoute(createCustomFieldController)
  );
  router.get(
    "/:registerId/custom-fields/:fieldId",
    validateRequest({ params: customFieldParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(getCustomFieldController)
  );
  router.patch(
    "/:registerId/custom-fields/:fieldId",
    validateRequest({ params: customFieldParamsSchema, body: updateCustomFieldSchema }),
    requireRegisterManagement(),
    asyncRoute(updateCustomFieldController)
  );
  router.post(
    "/:registerId/custom-fields/:fieldId/activate",
    validateRequest({ params: customFieldParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(activateCustomFieldController)
  );
  router.post(
    "/:registerId/custom-fields/:fieldId/deactivate",
    validateRequest({ params: customFieldParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(deactivateCustomFieldController)
  );
  router.get(
    "/:registerId/custom-fields/:fieldId/options",
    validateRequest({ params: customFieldParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(listCustomFieldOptionsController)
  );
  router.post(
    "/:registerId/custom-fields/:fieldId/options",
    validateRequest({ params: customFieldParamsSchema, body: createCustomFieldOptionSchema }),
    requireRegisterManagement(),
    asyncRoute(createCustomFieldOptionController)
  );
  router.patch(
    "/:registerId/custom-fields/:fieldId/options/:optionId",
    validateRequest({ params: customFieldOptionParamsSchema, body: updateCustomFieldOptionSchema }),
    requireRegisterManagement(),
    asyncRoute(updateCustomFieldOptionController)
  );
  router.post(
    "/:registerId/custom-fields/:fieldId/options/:optionId/deactivate",
    validateRequest({ params: customFieldOptionParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(deactivateCustomFieldOptionController)
  );
  router.get(
    "/:registerId/likelihood-values",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(listLikelihoodValuesController)
  );
  router.post(
    "/:registerId/likelihood-values",
    validateRequest({ params: registerIdParamsSchema, body: createLikelihoodValueSchema }),
    requireRegisterManagement(),
    asyncRoute(createLikelihoodValueController)
  );
  router.patch(
    "/:registerId/likelihood-values/:likelihoodId",
    validateRequest({ params: likelihoodParamsSchema, body: updateLikelihoodValueSchema }),
    requireRegisterManagement(),
    asyncRoute(updateLikelihoodValueController)
  );
  router.post(
    "/:registerId/likelihood-values/:likelihoodId/deactivate",
    validateRequest({ params: likelihoodParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(deactivateLikelihoodValueController)
  );
  router.get(
    "/:registerId/impact-values",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(listImpactValuesController)
  );
  router.post(
    "/:registerId/impact-values",
    validateRequest({ params: registerIdParamsSchema, body: createImpactValueSchema }),
    requireRegisterManagement(),
    asyncRoute(createImpactValueController)
  );
  router.patch(
    "/:registerId/impact-values/:impactId",
    validateRequest({ params: impactParamsSchema, body: updateImpactValueSchema }),
    requireRegisterManagement(),
    asyncRoute(updateImpactValueController)
  );
  router.post(
    "/:registerId/impact-values/:impactId/deactivate",
    validateRequest({ params: impactParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(deactivateImpactValueController)
  );
  router.get(
    "/:registerId/risk-levels",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(listRiskLevelsController)
  );
  router.post(
    "/:registerId/risk-levels",
    validateRequest({ params: registerIdParamsSchema, body: createRiskLevelSchema }),
    requireRegisterManagement(),
    asyncRoute(createRiskLevelController)
  );
  router.patch(
    "/:registerId/risk-levels/:riskLevelId",
    validateRequest({ params: riskLevelParamsSchema, body: updateRiskLevelSchema }),
    requireRegisterManagement(),
    asyncRoute(updateRiskLevelController)
  );
  router.post(
    "/:registerId/risk-levels/:riskLevelId/deactivate",
    validateRequest({ params: riskLevelParamsSchema }),
    requireRegisterManagement(),
    asyncRoute(deactivateRiskLevelController)
  );
  router.get(
    "/:registerId/risks/:riskId",
    validateRequest({ params: riskIdParamsSchema }),
    requireRiskView(),
    asyncRoute(getRiskDetailController)
  );
  router.patch(
    "/:registerId/risks/:riskId",
    validateRequest({ params: riskIdParamsSchema, body: updateRiskSchema }),
    requireRiskEdit(),
    asyncRoute(updateRiskController)
  );
  router.delete(
    "/:registerId/risks/:riskId",
    validateRequest({ params: riskIdParamsSchema, body: deleteRiskSchema }),
    requireSystemAdmin,
    asyncRoute(deleteRiskController)
  );
  router.get(
    "/:registerId/summary",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(getRegisterSummaryController)
  );
  router.get(
    "/:registerId",
    validateRequest({ params: registerIdParamsSchema }),
    requireRegisterAccess(),
    asyncRoute(getRegisterController)
  );
  router.patch(
    "/:registerId",
    validateRequest({ params: registerIdParamsSchema, body: updateRegisterSchema }),
    requireRegisterManagement(),
    asyncRoute(updateRegisterController)
  );

  return router;
}
