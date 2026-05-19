import type { Request, Response } from "express";

import {
  createRisk,
  deleteRisk,
  getRiskDetail,
  listRisks,
  updateRisk
} from "../services/risks.service.js";
import { exportRisksCsv } from "../services/export.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateRiskBody,
  DeleteRiskBody,
  ListRisksQuery,
  RiskIdParams,
  UpdateRiskBody
} from "../validators/risks.schemas.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

export async function listRisksController(
  request: Request<RegisterIdParams, unknown, unknown, ListRisksQuery>,
  response: Response
) {
  const result = await listRisks(actorOrThrow(request), request.params.registerId, request.query);
  sendData(response, result.data, 200, result.meta);
}

export async function createRiskController(
  request: Request<RegisterIdParams, unknown, CreateRiskBody>,
  response: Response
) {
  sendData(response, await createRisk(actorOrThrow(request), request.params.registerId, request.body), 201);
}

export async function getRiskDetailController(request: Request<RiskIdParams>, response: Response) {
  sendData(
    response,
    await getRiskDetail(actorOrThrow(request), request.params.registerId, request.params.riskId)
  );
}

export async function updateRiskController(
  request: Request<RiskIdParams, unknown, UpdateRiskBody>,
  response: Response
) {
  sendData(
    response,
    await updateRisk(
      actorOrThrow(request),
      request.params.registerId,
      request.params.riskId,
      request.body
    )
  );
}

export async function deleteRiskController(
  request: Request<RiskIdParams, unknown, DeleteRiskBody>,
  response: Response
) {
  sendData(
    response,
    await deleteRisk(
      actorOrThrow(request),
      request.params.registerId,
      request.params.riskId,
      request.body
    )
  );
}

export async function exportRisksController(
  request: Request<RegisterIdParams, unknown, unknown, ListRisksQuery>,
  response: Response
) {
  const result = await exportRisksCsv(actorOrThrow(request), request.params.registerId, request.query);
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  response.status(200).send(result.csv);
}
