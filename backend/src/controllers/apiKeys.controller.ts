import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import { createApiKey, listApiKeys, revokeApiKey } from "../services/apiKeys.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type { ApiKeyIdParams, CreateApiKeyBody } from "../validators/apiKeys.schemas.js";

export async function listApiKeysController(
  request: Request<ParamsDictionary>,
  response: Response
) {
  sendData(response, await listApiKeys(actorOrThrow(request)));
}

export async function createApiKeyController(
  request: Request<ParamsDictionary, unknown, CreateApiKeyBody>,
  response: Response
) {
  sendData(response, await createApiKey(actorOrThrow(request), request.body), 201);
}

export async function revokeApiKeyController(
  request: Request<ApiKeyIdParams>,
  response: Response
) {
  sendData(response, await revokeApiKey(actorOrThrow(request), request.params.id));
}
