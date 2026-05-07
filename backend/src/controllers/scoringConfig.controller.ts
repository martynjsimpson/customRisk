import type { Request, Response } from "express";

import { createImpactValue, deactivateImpactValue, listImpactValues, updateImpactValue } from "../services/impactValues.service.js";
import { createLikelihoodValue, deactivateLikelihoodValue, listLikelihoodValues, updateLikelihoodValue } from "../services/likelihoodValues.service.js";
import { getMatrix, updateMatrix, updateMatrixCell } from "../services/matrix.service.js";
import { createRiskLevel, deactivateRiskLevel, listRiskLevels, updateRiskLevel } from "../services/riskLevels.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateImpactValueBody,
  CreateLikelihoodValueBody,
  CreateRiskLevelBody,
  ImpactParams,
  LikelihoodParams,
  MatrixCellParams,
  RiskLevelParams,
  UpdateImpactValueBody,
  UpdateLikelihoodValueBody,
  UpdateMatrixBody,
  UpdateMatrixCellBody,
  UpdateRiskLevelBody
} from "../validators/scoringConfig.schemas.js";

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
