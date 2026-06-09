import { Router } from "express";

import {
  activateCustomFieldController,
  createCustomFieldController,
  createCustomFieldOptionController,
  deactivateCustomFieldController,
  deactivateCustomFieldOptionController,
  getCustomFieldController,
  getRegisterConfigController,
  getRiskFormConfigController,
  listCustomFieldOptionsController,
  listCustomFieldsController,
  migrateCustomFieldTypeController,
  previewFieldTypeMigrationController,
  updateCustomFieldController,
  updateCustomFieldOptionController
} from "../controllers/customFields.controller.js";
import {
  createImpactValueController,
  createLikelihoodValueController,
  createRiskLevelController,
  deactivateImpactValueController,
  deactivateLikelihoodValueController,
  deactivateRiskLevelController,
  getMatrixController,
  listImpactValuesController,
  listLikelihoodValuesController,
  listRiskLevelsController,
  updateImpactValueController,
  updateLikelihoodValueController,
  updateMatrixCellController,
  updateMatrixController,
  updateRiskLevelController
} from "../controllers/scoringConfig.controller.js";
import {
  requireRegisterAccess,
  requireRegisterManagement
} from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  createCustomFieldOptionSchema,
  createCustomFieldSchema,
  customFieldOptionParamsSchema,
  customFieldParamsSchema,
  migrateFieldTypeQuerySchema,
  migrateFieldTypeSchema,
  updateCustomFieldOptionSchema,
  updateCustomFieldSchema
} from "../validators/customFields.schemas.js";
import {
  createImpactValueSchema,
  createLikelihoodValueSchema,
  createRiskLevelSchema,
  impactParamsSchema,
  likelihoodParamsSchema,
  matrixCellParamsSchema,
  riskLevelParamsSchema,
  updateImpactValueSchema,
  updateLikelihoodValueSchema,
  updateMatrixCellSchema,
  updateMatrixSchema,
  updateRiskLevelSchema
} from "../validators/scoringConfig.schemas.js";
import { registerIdParamsSchema } from "../validators/registers.schemas.js";

export function createConfigurationSubRouter() {
  const router = Router({ mergeParams: true });

  router.get("/:registerId/config", validateRequest({ params: registerIdParamsSchema }), requireRegisterManagement(), asyncRoute(getRegisterConfigController));
  router.get("/:registerId/risk-form-config", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(getRiskFormConfigController));
  router.get("/:registerId/custom-fields", validateRequest({ params: registerIdParamsSchema }), requireRegisterManagement(), asyncRoute(listCustomFieldsController));
  router.post("/:registerId/custom-fields", validateRequest({ params: registerIdParamsSchema, body: createCustomFieldSchema }), requireRegisterManagement(), asyncRoute(createCustomFieldController));
  router.get("/:registerId/custom-fields/:fieldId", validateRequest({ params: customFieldParamsSchema }), requireRegisterManagement(), asyncRoute(getCustomFieldController));
  router.patch("/:registerId/custom-fields/:fieldId", validateRequest({ params: customFieldParamsSchema, body: updateCustomFieldSchema }), requireRegisterManagement(), asyncRoute(updateCustomFieldController));
  router.post("/:registerId/custom-fields/:fieldId/activate", validateRequest({ params: customFieldParamsSchema }), requireRegisterManagement(), asyncRoute(activateCustomFieldController));
  router.post("/:registerId/custom-fields/:fieldId/deactivate", validateRequest({ params: customFieldParamsSchema }), requireRegisterManagement(), asyncRoute(deactivateCustomFieldController));
  router.get("/:registerId/custom-fields/:fieldId/type-migration-preview", validateRequest({ params: customFieldParamsSchema, query: migrateFieldTypeQuerySchema }), requireRegisterManagement(), asyncRoute(previewFieldTypeMigrationController));
  router.post("/:registerId/custom-fields/:fieldId/migrate-type", validateRequest({ params: customFieldParamsSchema, body: migrateFieldTypeSchema }), requireRegisterManagement(), asyncRoute(migrateCustomFieldTypeController));
  router.get("/:registerId/custom-fields/:fieldId/options", validateRequest({ params: customFieldParamsSchema }), requireRegisterManagement(), asyncRoute(listCustomFieldOptionsController));
  router.post("/:registerId/custom-fields/:fieldId/options", validateRequest({ params: customFieldParamsSchema, body: createCustomFieldOptionSchema }), requireRegisterManagement(), asyncRoute(createCustomFieldOptionController));
  router.patch("/:registerId/custom-fields/:fieldId/options/:optionId", validateRequest({ params: customFieldOptionParamsSchema, body: updateCustomFieldOptionSchema }), requireRegisterManagement(), asyncRoute(updateCustomFieldOptionController));
  router.post("/:registerId/custom-fields/:fieldId/options/:optionId/deactivate", validateRequest({ params: customFieldOptionParamsSchema }), requireRegisterManagement(), asyncRoute(deactivateCustomFieldOptionController));
  router.get("/:registerId/likelihood-values", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(listLikelihoodValuesController));
  router.post("/:registerId/likelihood-values", validateRequest({ params: registerIdParamsSchema, body: createLikelihoodValueSchema }), requireRegisterManagement(), asyncRoute(createLikelihoodValueController));
  router.patch("/:registerId/likelihood-values/:likelihoodId", validateRequest({ params: likelihoodParamsSchema, body: updateLikelihoodValueSchema }), requireRegisterManagement(), asyncRoute(updateLikelihoodValueController));
  router.post("/:registerId/likelihood-values/:likelihoodId/deactivate", validateRequest({ params: likelihoodParamsSchema }), requireRegisterManagement(), asyncRoute(deactivateLikelihoodValueController));
  router.get("/:registerId/impact-values", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(listImpactValuesController));
  router.post("/:registerId/impact-values", validateRequest({ params: registerIdParamsSchema, body: createImpactValueSchema }), requireRegisterManagement(), asyncRoute(createImpactValueController));
  router.patch("/:registerId/impact-values/:impactId", validateRequest({ params: impactParamsSchema, body: updateImpactValueSchema }), requireRegisterManagement(), asyncRoute(updateImpactValueController));
  router.post("/:registerId/impact-values/:impactId/deactivate", validateRequest({ params: impactParamsSchema }), requireRegisterManagement(), asyncRoute(deactivateImpactValueController));
  router.get("/:registerId/risk-levels", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(listRiskLevelsController));
  router.post("/:registerId/risk-levels", validateRequest({ params: registerIdParamsSchema, body: createRiskLevelSchema }), requireRegisterManagement(), asyncRoute(createRiskLevelController));
  router.patch("/:registerId/risk-levels/:riskLevelId", validateRequest({ params: riskLevelParamsSchema, body: updateRiskLevelSchema }), requireRegisterManagement(), asyncRoute(updateRiskLevelController));
  router.post("/:registerId/risk-levels/:riskLevelId/deactivate", validateRequest({ params: riskLevelParamsSchema }), requireRegisterManagement(), asyncRoute(deactivateRiskLevelController));
  router.get("/:registerId/matrix", validateRequest({ params: registerIdParamsSchema }), requireRegisterAccess(), asyncRoute(getMatrixController));
  router.put("/:registerId/matrix", validateRequest({ params: registerIdParamsSchema, body: updateMatrixSchema }), requireRegisterManagement(), asyncRoute(updateMatrixController));
  router.patch("/:registerId/matrix/:cellId", validateRequest({ params: matrixCellParamsSchema, body: updateMatrixCellSchema }), requireRegisterManagement(), asyncRoute(updateMatrixCellController));

  return router;
}
