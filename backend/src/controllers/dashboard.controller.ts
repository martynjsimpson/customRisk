import type { Request, Response } from "express";

import {
  getAdminSummary,
  getMyRisks,
  getMyWork
} from "../services/dashboard.service.js";
import { exportMyRisksCsv } from "../services/export.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";

export async function getMyWorkController(request: Request, response: Response) {
  sendData(response, await getMyWork(actorOrThrow(request)));
}

export async function getMyRisksController(request: Request, response: Response) {
  sendData(response, await getMyRisks(actorOrThrow(request), request.query));
}

export async function exportMyRisksController(request: Request, response: Response) {
  const result = await exportMyRisksCsv(actorOrThrow(request), request.query);
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  response.status(200).send(result.csv);
}

export async function getAdminSummaryController(request: Request, response: Response) {
  sendData(response, await getAdminSummary(actorOrThrow(request)));
}
