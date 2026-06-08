import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import {
  exportRegisterAuditEvents,
  exportSystemAuditEvents,
  getAuditEvent,
  getAuditEventSnapshot,
  listRegisterAuditEvents,
  listRiskAuditEvents,
  listSystemAuditEvents
} from "../services/audit.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type { AuditEventParams, AuditQuery } from "../validators/audit.schemas.js";
import type { RiskIdParams } from "../validators/risks.schemas.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

export async function listSystemAuditController(
  request: Request<ParamsDictionary, unknown, unknown, AuditQuery>,
  response: Response
) {
  const result = await listSystemAuditEvents(actorOrThrow(request), request.query);
  sendData(response, result.data, 200, result.meta);
}

export async function listRegisterAuditController(
  request: Request<RegisterIdParams, unknown, unknown, AuditQuery>,
  response: Response
) {
  const result = await listRegisterAuditEvents(
    actorOrThrow(request),
    request.params.registerId,
    request.query
  );
  sendData(response, result.data, 200, result.meta);
}

export async function listRiskAuditController(
  request: Request<RiskIdParams, unknown, unknown, AuditQuery>,
  response: Response
) {
  const result = await listRiskAuditEvents(
    actorOrThrow(request),
    request.params.registerId,
    request.params.riskId,
    request.query
  );
  sendData(response, result.data, 200, result.meta);
}

export async function getAuditEventController(
  request: Request<AuditEventParams>,
  response: Response
) {
  sendData(response, await getAuditEvent(actorOrThrow(request), request.params.auditEventId));
}

export async function getAuditEventSnapshotController(
  request: Request<AuditEventParams>,
  response: Response
) {
  sendData(response, await getAuditEventSnapshot(actorOrThrow(request), request.params.auditEventId));
}

export async function exportSystemAuditController(
  request: Request<ParamsDictionary, unknown, unknown, AuditQuery>,
  response: Response
) {
  const csv = await exportSystemAuditEvents(actorOrThrow(request), request.query);
  const date = new Date().toISOString().slice(0, 10);
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="audit-export-${date}.csv"`);
  response.send(csv);
}

export async function exportRegisterAuditController(
  request: Request<RegisterIdParams, unknown, unknown, AuditQuery>,
  response: Response
) {
  const csv = await exportRegisterAuditEvents(actorOrThrow(request), request.params.registerId, request.query);
  const date = new Date().toISOString().slice(0, 10);
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="audit-export-${date}.csv"`);
  response.send(csv);
}
