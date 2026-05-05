import type { Request, Response } from "express";

import { getRiskFormConfig } from "../services/configuration.service.js";
import { sendData } from "../utils/apiResponse.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

export async function getRiskFormConfigController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await getRiskFormConfig(request.params.registerId));
}
