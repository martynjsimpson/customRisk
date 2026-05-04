import type { Request, Response } from "express";

import { ApiError } from "../errors/apiError.js";
import {
  createUser,
  getUser,
  listUsers,
  setUserActive,
  unlockUser,
  updateUser
} from "../services/users.service.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateUserBody,
  ListUsersQuery,
  UpdateUserBody,
  UserIdParams
} from "../validators/users.schemas.js";

function actorOrThrow(request: Request) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return request.actor;
}

export async function listUsersController(
  request: Request<Record<string, string>, unknown, unknown, ListUsersQuery>,
  response: Response
) {
  const result = await listUsers(request.query);
  sendData(response, result.data, 200, result.meta);
}

export async function createUserController(
  request: Request<Record<string, string>, unknown, CreateUserBody>,
  response: Response
) {
  sendData(response, await createUser(actorOrThrow(request), request.body), 201);
}

export async function getUserController(request: Request<UserIdParams>, response: Response) {
  sendData(response, await getUser(request.params.userId));
}

export async function updateUserController(
  request: Request<UserIdParams, unknown, UpdateUserBody>,
  response: Response
) {
  sendData(response, await updateUser(actorOrThrow(request), request.params.userId, request.body));
}

export async function activateUserController(request: Request<UserIdParams>, response: Response) {
  sendData(response, await setUserActive(actorOrThrow(request), request.params.userId, true));
}

export async function deactivateUserController(request: Request<UserIdParams>, response: Response) {
  sendData(response, await setUserActive(actorOrThrow(request), request.params.userId, false));
}

export async function unlockUserController(request: Request<UserIdParams>, response: Response) {
  sendData(response, await unlockUser(actorOrThrow(request), request.params.userId));
}
