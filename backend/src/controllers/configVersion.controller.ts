import type { Request, Response } from "express";

import {
  analyseImpact,
  createDraft,
  discardDraft,
  getConfigVersionStatus,
  listConfigVersions,
  publishDraft,
  updateDraft
} from "../services/configVersion.service.js";
import { validateScoringFormula } from "../services/formulaEvaluator.service.js";
import { prisma } from "../db/prisma.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";
import type { UpdateDraftBody, ValidateFormulaBody } from "../validators/configVersion.schemas.js";

export async function getConfigVersionStatusController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await getConfigVersionStatus(request.params.registerId));
}

export async function listConfigVersionsController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await listConfigVersions(request.params.registerId));
}

export async function createDraftController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  sendData(
    response,
    await createDraft(request.params.registerId, actor.id, actor.name, actor.email),
    201
  );
}

export async function updateDraftController(
  request: Request<RegisterIdParams, unknown, UpdateDraftBody>,
  response: Response
) {
  const actor = actorOrThrow(request);
  sendData(
    response,
    await updateDraft(request.params.registerId, request.body, actor.id, actor.name, actor.email)
  );
}

export async function discardDraftController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  await discardDraft(request.params.registerId, actor.id, actor.name, actor.email);
  sendData(response, { discarded: true });
}

export async function analyseImpactController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  sendData(
    response,
    await analyseImpact(request.params.registerId, actor.id, actor.name, actor.email)
  );
}

export async function publishDraftController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  sendData(
    response,
    await publishDraft(request.params.registerId, actor.id, actor.name, actor.email)
  );
}

export async function validateFormulaController(
  request: Request<RegisterIdParams, unknown, ValidateFormulaBody>,
  response: Response
) {
  const { registerId } = request.params;
  const { formula } = request.body;

  // Empty formula is always valid (means use default)
  if (formula === "") {
    sendData(response, { valid: true });
    return;
  }

  // Fetch numeric custom field IDs for this register to validate field references
  const numericFields = await prisma.customFieldDefinition.findMany({
    where: {
      registerId,
      fieldType: { in: ["NUMBER", "CALCULATED"] },
      isActive: true
    },
    select: { id: true }
  });

  const availableFieldKeys = numericFields.map((f) => f.id);
  const result = validateScoringFormula(formula, availableFieldKeys);
  sendData(response, result);
}
