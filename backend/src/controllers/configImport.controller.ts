import type { Request, Response } from "express";

import { importRegisterConfig } from "../services/configImport.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

export async function importRegisterConfigController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  const { registerId } = request.params;

  const result = await importRegisterConfig(registerId, request.body, actor.id, actor.name, actor.email);

  return sendData(response, result, 201);
}
