import type { Request, Response } from "express";

import { getRegisterConfig, getRiskFormConfig } from "../services/configuration.service.js";
import { sendData } from "../utils/apiResponse.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

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
