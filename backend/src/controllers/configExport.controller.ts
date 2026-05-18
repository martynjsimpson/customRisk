import type { Request, Response } from "express";

import { exportRegisterConfig } from "../services/configExport.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

export async function exportRegisterConfigController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  const { registerId } = request.params;

  const result = await exportRegisterConfig(registerId, actor.id, actor.name, actor.email);

  response.setHeader("Content-Type", "application/json");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="config-${registerId}.json"`
  );

  return response.status(200).json(result);
}
