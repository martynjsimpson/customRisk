import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import {
  adminRevokeApiKey,
  createApiKey,
  listApiKeys,
  listMyApiKeys,
  revokeMyApiKey
} from "../services/apiKeys.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type { ApiKeyIdParams, CreateApiKeyBody } from "../validators/apiKeys.schemas.js";

// ---------------------------------------------------------------------------
// Admin controllers
// ---------------------------------------------------------------------------

export async function listApiKeysController(
  request: Request<ParamsDictionary>,
  response: Response
) {
  sendData(response, await listApiKeys(actorOrThrow(request)));
}

export async function adminRevokeApiKeyController(
  request: Request<ApiKeyIdParams>,
  response: Response
) {
  sendData(response, await adminRevokeApiKey(actorOrThrow(request), request.params.id));
}

// ---------------------------------------------------------------------------
// User self-service controllers (/users/me/api-keys)
// ---------------------------------------------------------------------------

export async function listMyApiKeysController(
  request: Request<ParamsDictionary>,
  response: Response
) {
  sendData(response, await listMyApiKeys(actorOrThrow(request)));
}

export async function createApiKeyController(
  request: Request<ParamsDictionary, unknown, CreateApiKeyBody>,
  response: Response
) {
  sendData(response, await createApiKey(actorOrThrow(request), request.body), 201);
}

export async function revokeMyApiKeyController(
  request: Request<ApiKeyIdParams>,
  response: Response
) {
  sendData(response, await revokeMyApiKey(actorOrThrow(request), request.params.id));
}
