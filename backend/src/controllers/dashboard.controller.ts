import type { Request, Response } from "express";

import { ApiError } from "../errors/apiError.js";
import {
  getAdminSummary,
  getMyRisks,
  getMyWork
} from "../services/dashboard.service.js";
import type { AuthenticatedActor } from "../types/express.js";
import { sendData } from "../utils/apiResponse.js";

function actorOrThrow(request: { actor?: AuthenticatedActor }) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return request.actor;
}

export async function getMyWorkController(request: Request, response: Response) {
  sendData(response, await getMyWork(actorOrThrow(request)));
}

export async function getMyRisksController(request: Request, response: Response) {
  sendData(response, await getMyRisks(actorOrThrow(request)));
}

export async function getAdminSummaryController(request: Request, response: Response) {
  sendData(response, await getAdminSummary(actorOrThrow(request)));
}
