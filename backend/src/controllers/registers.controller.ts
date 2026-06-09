import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import {
  createRegister,
  deleteRegister,
  getRegister,
  getRegisterSummary,
  addRegisterPermission,
  listRegisters,
  listRegisterPermissionCandidates,
  listRegisterPermissions,
  removeRegisterPermission,
  updateRegister,
  unlinkRegisterFromTemplate
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
import { actorOrThrow } from "../utils/actorOrThrow.js";

export async function listRegistersController(
  request: Request<ParamsDictionary, unknown, unknown, ListRegistersQuery>,
  response: Response
) {
  const result = await listRegisters(actorOrThrow(request), request.query);
  sendData(response, result.data, 200, result.meta);
}

export async function createRegisterController(
  request: Request<ParamsDictionary, unknown, CreateRegisterBody>,
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

export async function deleteRegisterController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  await deleteRegister(actorOrThrow(request), request.params.registerId);
  response.status(204).end();
}

export async function unlinkRegisterFromTemplateController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  await unlinkRegisterFromTemplate(
    request.params.registerId,
    actor.id,
    actor.name,
    actor.email
  );
  sendData(response, { success: true });
}
