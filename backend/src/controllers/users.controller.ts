import type { Request, Response } from "express";

import { ApiError } from "../errors/apiError.js";
import {
  changeMyPassword,
  createUser,
  getMyPreferences,
  getUser,
  listUsers,
  setUserActive,
  unlockUser,
  updateMyPreferences,
  updateMyProfile,
  updateUser
} from "../services/users.service.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  ChangePasswordBody,
  CreateUserBody,
  ListUsersQuery,
  UpdateMyProfileBody,
  UpdatePreferencesBody,
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

export async function updateMyProfileController(
  request: Request<Record<string, string>, unknown, UpdateMyProfileBody>,
  response: Response
) {
  sendData(response, await updateMyProfile(actorOrThrow(request), request.body));
}

export async function changeMyPasswordController(
  request: Request<Record<string, string>, unknown, ChangePasswordBody>,
  response: Response
) {
  await changeMyPassword(actorOrThrow(request), request.body);
  sendData(response, { success: true });
}

export async function getMyPreferencesController(request: Request, response: Response) {
  sendData(response, await getMyPreferences(actorOrThrow(request).id));
}

export async function updateMyPreferencesController(
  request: Request<Record<string, string>, unknown, UpdatePreferencesBody>,
  response: Response
) {
  sendData(response, await updateMyPreferences(actorOrThrow(request), request.body));
}
