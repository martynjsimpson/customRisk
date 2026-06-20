import type { Request, Response } from "express";

import {
  listActions,
  getAction,
  createAction,
  updateAction,
  deleteAction
} from "../services/responseActions.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  ActionIdParams,
  CreateActionBody,
  UpdateActionBody
} from "../validators/responseActions.schemas.js";
import type { RiskIdParams } from "../validators/risks.schemas.js";

export async function listActionsController(
  request: Request<RiskIdParams>,
  response: Response
) {
  const { registerId, riskId } = request.params;
  const data = await listActions(actorOrThrow(request), registerId, riskId);
  sendData(response, data, 200, { total: data.length });
}

export async function getActionController(
  request: Request<ActionIdParams>,
  response: Response
) {
  const { registerId, riskId, actionId } = request.params;
  sendData(response, await getAction(actorOrThrow(request), registerId, riskId, actionId));
}

export async function createActionController(
  request: Request<RiskIdParams, unknown, CreateActionBody>,
  response: Response
) {
  const { registerId, riskId } = request.params;
  sendData(
    response,
    await createAction(actorOrThrow(request), registerId, riskId, request.body),
    201
  );
}

export async function updateActionController(
  request: Request<ActionIdParams, unknown, UpdateActionBody>,
  response: Response
) {
  const { registerId, riskId, actionId } = request.params;
  sendData(
    response,
    await updateAction(actorOrThrow(request), registerId, riskId, actionId, request.body)
  );
}

export async function deleteActionController(
  request: Request<ActionIdParams>,
  response: Response
) {
  const { registerId, riskId, actionId } = request.params;
  sendData(
    response,
    await deleteAction(actorOrThrow(request), registerId, riskId, actionId)
  );
}
