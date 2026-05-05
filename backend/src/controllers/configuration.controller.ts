import type { Request, Response } from "express";

import { ApiError } from "../errors/apiError.js";
import { getRegisterConfig, getRiskFormConfig } from "../services/configuration.service.js";
import {
  activateCustomField,
  createCustomField,
  deactivateCustomField,
  getCustomField,
  listCustomFields,
  updateCustomField
} from "../services/configuration.service.js";
import type { AuthenticatedActor } from "../types/express.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateCustomFieldBody,
  CustomFieldParams,
  UpdateCustomFieldBody
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
