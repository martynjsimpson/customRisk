import type { Request, Response } from "express";

import {
  getAdminSummary,
  getMyRisks,
  getMyWork
} from "../services/dashboard.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";

export async function getMyWorkController(request: Request, response: Response) {
  sendData(response, await getMyWork(actorOrThrow(request)));
}

export async function getMyRisksController(request: Request, response: Response) {
  sendData(response, await getMyRisks(actorOrThrow(request)));
}

export async function getAdminSummaryController(request: Request, response: Response) {
  sendData(response, await getAdminSummary(actorOrThrow(request)));
}
