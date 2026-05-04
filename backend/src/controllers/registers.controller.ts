import type { Request, Response } from "express";

import { ApiError } from "../errors/apiError.js";
import {
  createRegister,
  getRegister,
  getRegisterSummary,
  addRegisterPermission,
  listRegisters,
  listRegisterPermissionCandidates,
  listRegisterPermissions,
  removeRegisterPermission,
  updateRegister
} from "../services/registers.service.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateRegisterBody,
  CreateRegisterPermissionBody,
  ListRegistersQuery,
  RegisterPermissionParams,
  RegisterIdParams,
  UpdateRegisterBody
} from "../validators/registers.schemas.js";
import type { AuthenticatedActor } from "../types/express.js";

function actorOrThrow(request: { actor?: AuthenticatedActor }) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return request.actor;
}

export async function listRegistersController(
  request: Request<Record<string, string>, unknown, unknown, ListRegistersQuery>,
  response: Response
) {
  const result = await listRegisters(actorOrThrow(request), request.query);
  sendData(response, result.data, 200, result.meta);
}

export async function createRegisterController(
  request: Request<Record<string, string>, unknown, CreateRegisterBody>,
  response: Response
) {
  sendData(response, await createRegister(actorOrThrow(request), request.body), 201);
}

export async function getRegisterController(request: Request<RegisterIdParams>, response: Response) {
  sendData(response, await getRegister(actorOrThrow(request), request.params.registerId));
}

export async function updateRegisterController(
  request: Request<RegisterIdParams, unknown, UpdateRegisterBody>,
  response: Response
) {
  sendData(response, await updateRegister(actorOrThrow(request), request.params.registerId, request.body));
}

export async function getRegisterSummaryController(request: Request<RegisterIdParams>, response: Response) {
  sendData(response, await getRegisterSummary(request.params.registerId));
}

export async function listRegisterPermissionsController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await listRegisterPermissions(request.params.registerId));
}

export async function listRegisterPermissionCandidatesController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await listRegisterPermissionCandidates(request.params.registerId));
}

export async function addRegisterPermissionController(
  request: Request<RegisterIdParams, unknown, CreateRegisterPermissionBody>,
  response: Response
) {
  sendData(
    response,
    await addRegisterPermission(actorOrThrow(request), request.params.registerId, request.body),
    201
  );
}

export async function removeRegisterPermissionController(
  request: Request<RegisterPermissionParams>,
  response: Response
) {
  sendData(
    response,
    await removeRegisterPermission(
      actorOrThrow(request),
      request.params.registerId,
      request.params.permissionId
    )
  );
}
