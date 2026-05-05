import type { Request, Response } from "express";

import { ApiError } from "../errors/apiError.js";
import { createRisk, getRiskDetail, listRisks } from "../services/risks.service.js";
import type { AuthenticatedActor } from "../types/express.js";
import { sendData } from "../utils/apiResponse.js";
import type { CreateRiskBody, ListRisksQuery, RiskIdParams } from "../validators/risks.schemas.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

function actorOrThrow(request: { actor?: AuthenticatedActor }) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return request.actor;
}

export async function listRisksController(
  request: Request<RegisterIdParams, unknown, unknown, ListRisksQuery>,
  response: Response
) {
  const result = await listRisks(actorOrThrow(request), request.params.registerId, request.query);
  sendData(response, result.data, 200, result.meta);
}

export async function createRiskController(
  request: Request<RegisterIdParams, unknown, CreateRiskBody>,
  response: Response
) {
  sendData(response, await createRisk(actorOrThrow(request), request.params.registerId, request.body), 201);
}

export async function getRiskDetailController(request: Request<RiskIdParams>, response: Response) {
  sendData(
    response,
    await getRiskDetail(actorOrThrow(request), request.params.registerId, request.params.riskId)
  );
}
