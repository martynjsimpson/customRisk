import type { Request, Response } from "express";

import { ApiError } from "../errors/apiError.js";
import {
  activateCustomField,
  createCustomField,
  createCustomFieldOption,
  createImpactValue,
  createLikelihoodValue,
  createRiskLevel,
  deactivateCustomField,
  deactivateCustomFieldOption,
  deactivateImpactValue,
  deactivateLikelihoodValue,
  deactivateRiskLevel,
  getCustomField,
  getMatrix,
  listCustomFields,
  listCustomFieldOptions,
  listImpactValues,
  listLikelihoodValues,
  listRiskLevels,
  getRegisterConfig,
  getRiskFormConfig,
  updateCustomField,
  updateCustomFieldOption,
  updateImpactValue,
  updateLikelihoodValue,
  updateMatrix,
  updateMatrixCell,
  updateRiskLevel
} from "../services/configuration.service.js";
import type { AuthenticatedActor } from "../types/express.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateCustomFieldBody,
  CreateCustomFieldOptionBody,
  CreateImpactValueBody,
  CreateLikelihoodValueBody,
  CreateRiskLevelBody,
  CustomFieldOptionParams,
  CustomFieldParams,
  ImpactParams,
  LikelihoodParams,
  MatrixCellParams,
  RiskLevelParams,
  UpdateCustomFieldBody,
  UpdateCustomFieldOptionBody,
  UpdateImpactValueBody,
  UpdateLikelihoodValueBody,
  UpdateMatrixBody,
  UpdateMatrixCellBody,
  UpdateRiskLevelBody
} from "../validators/configuration.schemas.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

function actorOrThrow(request: { actor?: AuthenticatedActor }) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return request.actor;
}

export async function getRegisterConfigController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await getRegisterConfig(request.params.registerId));
}

export async function getRiskFormConfigController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await getRiskFormConfig(request.params.registerId));
}

export async function listCustomFieldsController(request: Request<RegisterIdParams>, response: Response) {
  sendData(response, await listCustomFields(request.params.registerId));
}

export async function createCustomFieldController(
  request: Request<RegisterIdParams, unknown, CreateCustomFieldBody>,
  response: Response
) {
  sendData(
    response,
    await createCustomField(actorOrThrow(request), request.params.registerId, request.body),
    201
  );
}

export async function getCustomFieldController(request: Request<CustomFieldParams>, response: Response) {
  sendData(response, await getCustomField(request.params.registerId, request.params.fieldId));
}

export async function updateCustomFieldController(
  request: Request<CustomFieldParams, unknown, UpdateCustomFieldBody>,
  response: Response
) {
  sendData(
    response,
    await updateCustomField(actorOrThrow(request), request.params.registerId, request.params.fieldId, request.body)
  );
}

export async function activateCustomFieldController(request: Request<CustomFieldParams>, response: Response) {
  sendData(
    response,
    await activateCustomField(actorOrThrow(request), request.params.registerId, request.params.fieldId)
  );
}

export async function deactivateCustomFieldController(request: Request<CustomFieldParams>, response: Response) {
  sendData(
    response,
    await deactivateCustomField(actorOrThrow(request), request.params.registerId, request.params.fieldId)
  );
}

export async function listCustomFieldOptionsController(request: Request<CustomFieldParams>, response: Response) {
  sendData(response, await listCustomFieldOptions(request.params.registerId, request.params.fieldId));
}

export async function createCustomFieldOptionController(
  request: Request<CustomFieldParams, unknown, CreateCustomFieldOptionBody>,
  response: Response
) {
  sendData(
    response,
    await createCustomFieldOption(
      actorOrThrow(request),
      request.params.registerId,
      request.params.fieldId,
      request.body
    ),
    201
  );
}

export async function updateCustomFieldOptionController(
  request: Request<CustomFieldOptionParams, unknown, UpdateCustomFieldOptionBody>,
  response: Response
) {
  sendData(
    response,
    await updateCustomFieldOption(
      actorOrThrow(request),
      request.params.registerId,
      request.params.fieldId,
      request.params.optionId,
      request.body
    )
  );
}

export async function deactivateCustomFieldOptionController(
  request: Request<CustomFieldOptionParams>,
  response: Response
) {
  sendData(
    response,
    await deactivateCustomFieldOption(
      actorOrThrow(request),
      request.params.registerId,
      request.params.fieldId,
      request.params.optionId
    )
  );
}

export async function listLikelihoodValuesController(
  request: Request<{ registerId: string }>,
  response: Response
) {
  sendData(response, await listLikelihoodValues(request.params.registerId));
}

export async function createLikelihoodValueController(
  request: Request<{ registerId: string }, unknown, CreateLikelihoodValueBody>,
  response: Response
) {
  sendData(
    response,
    await createLikelihoodValue(actorOrThrow(request), request.params.registerId, request.body),
    201
  );
}

export async function updateLikelihoodValueController(
  request: Request<LikelihoodParams, unknown, UpdateLikelihoodValueBody>,
  response: Response
) {
  sendData(
    response,
    await updateLikelihoodValue(
      actorOrThrow(request),
      request.params.registerId,
      request.params.likelihoodId,
      request.body
    )
  );
}

export async function deactivateLikelihoodValueController(
  request: Request<LikelihoodParams>,
  response: Response
) {
  sendData(
    response,
    await deactivateLikelihoodValue(
      actorOrThrow(request),
      request.params.registerId,
      request.params.likelihoodId
    )
  );
}

export async function listImpactValuesController(
  request: Request<{ registerId: string }>,
  response: Response
) {
  sendData(response, await listImpactValues(request.params.registerId));
}

export async function createImpactValueController(
  request: Request<{ registerId: string }, unknown, CreateImpactValueBody>,
  response: Response
) {
  sendData(
    response,
    await createImpactValue(actorOrThrow(request), request.params.registerId, request.body),
    201
  );
}

export async function updateImpactValueController(
  request: Request<ImpactParams, unknown, UpdateImpactValueBody>,
  response: Response
) {
  sendData(
    response,
    await updateImpactValue(
      actorOrThrow(request),
      request.params.registerId,
      request.params.impactId,
      request.body
    )
  );
}

export async function deactivateImpactValueController(
  request: Request<ImpactParams>,
  response: Response
) {
  sendData(
    response,
    await deactivateImpactValue(
      actorOrThrow(request),
      request.params.registerId,
      request.params.impactId
    )
  );
}

export async function listRiskLevelsController(
  request: Request<{ registerId: string }>,
  response: Response
) {
  sendData(response, await listRiskLevels(request.params.registerId));
}

export async function createRiskLevelController(
  request: Request<{ registerId: string }, unknown, CreateRiskLevelBody>,
  response: Response
) {
  sendData(
    response,
    await createRiskLevel(actorOrThrow(request), request.params.registerId, request.body),
    201
  );
}

export async function updateRiskLevelController(
  request: Request<RiskLevelParams, unknown, UpdateRiskLevelBody>,
  response: Response
) {
  sendData(
    response,
    await updateRiskLevel(
      actorOrThrow(request),
      request.params.registerId,
      request.params.riskLevelId,
      request.body
    )
  );
}

export async function deactivateRiskLevelController(
  request: Request<RiskLevelParams>,
  response: Response
) {
  sendData(
    response,
    await deactivateRiskLevel(
      actorOrThrow(request),
      request.params.registerId,
      request.params.riskLevelId
    )
  );
}

export async function getMatrixController(
  request: Request<{ registerId: string }>,
  response: Response
) {
  sendData(response, await getMatrix(request.params.registerId));
}

export async function updateMatrixController(
  request: Request<{ registerId: string }, unknown, UpdateMatrixBody>,
  response: Response
) {
  sendData(
    response,
    await updateMatrix(actorOrThrow(request), request.params.registerId, request.body)
  );
}

export async function updateMatrixCellController(
  request: Request<MatrixCellParams, unknown, UpdateMatrixCellBody>,
  response: Response
) {
  sendData(
    response,
    await updateMatrixCell(
      actorOrThrow(request),
      request.params.registerId,
      request.params.cellId,
      request.body
    )
  );
}
