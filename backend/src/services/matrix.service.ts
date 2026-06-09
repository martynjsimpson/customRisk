import type { Prisma } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { RegisterConfigSnapshot } from "../types/configSnapshot.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  UpdateMatrixBody,
  UpdateMatrixCellBody
} from "../validators/scoringConfig.schemas.js";
import { recordAuditEvent } from "./audit.service.js";

async function assertRegisterExists(registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }
}

async function findMatrixCell(registerId: string, cellId: string) {
  const cell = await prisma.riskMatrixCell.findFirst({
    where: { id: cellId, registerId }
  });

  if (!cell) {
    throw new ApiError(404, "NOT_FOUND", "Matrix cell not found");
  }

  return cell;
}

async function assertMatrixIsComplete(
  registerId: string,
  cells: Array<{ likelihoodValueId: string; impactValueId: string; riskLevelId: string }>
) {
  const [activeLikelihoods, activeImpacts] = await Promise.all([
    prisma.likelihoodValue.findMany({ where: { registerId, isActive: true }, select: { id: true } }),
    prisma.impactValue.findMany({ where: { registerId, isActive: true }, select: { id: true } })
  ]);

  const cellKeys = new Set(cells.map((c) => `${c.likelihoodValueId}:${c.impactValueId}`));
  const missing: string[] = [];

  for (const l of activeLikelihoods) {
    for (const i of activeImpacts) {
      if (!cellKeys.has(`${l.id}:${i.id}`)) {
        missing.push(`${l.id}:${i.id}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new ApiError(
      422,
      "UNPROCESSABLE",
      "Matrix is incomplete: every active likelihood and impact combination must have a risk level assignment",
      { cells: `Missing ${missing.length} cell(s) for active likelihood/impact combinations` }
    );
  }
}

async function assertMatrixCellIdsExist(
  registerId: string,
  cells: Array<{ likelihoodValueId: string; impactValueId: string; riskLevelId: string }>
) {
  const likelihoodIds = [...new Set(cells.map((c) => c.likelihoodValueId))];
  const impactIds = [...new Set(cells.map((c) => c.impactValueId))];
  const riskLevelIds = [...new Set(cells.map((c) => c.riskLevelId))];

  const [likelihoods, impacts, riskLevels] = await Promise.all([
    prisma.likelihoodValue.findMany({
      where: { registerId, id: { in: likelihoodIds } },
      select: { id: true }
    }),
    prisma.impactValue.findMany({
      where: { registerId, id: { in: impactIds } },
      select: { id: true }
    }),
    prisma.riskLevel.findMany({
      where: { registerId, id: { in: riskLevelIds }, isActive: true },
      select: { id: true }
    })
  ]);

  const validLikelihoods = new Set(likelihoods.map((l) => l.id));
  const validImpacts = new Set(impacts.map((i) => i.id));
  const validRiskLevels = new Set(riskLevels.map((r) => r.id));

  const fields: Record<string, string> = {};

  if (likelihoodIds.some((id) => !validLikelihoods.has(id))) {
    fields.cells = "One or more likelihood value IDs do not belong to this register";
  }
  if (impactIds.some((id) => !validImpacts.has(id))) {
    fields.cells = "One or more impact value IDs do not belong to this register";
  }
  if (riskLevelIds.some((id) => !validRiskLevels.has(id))) {
    fields.cells = "One or more risk level IDs do not belong to this register or are inactive";
  }

  if (Object.keys(fields).length > 0) {
    throw new ApiError(422, "UNPROCESSABLE", "Matrix cells reference invalid configuration values", fields);
  }
}

export async function recalculateRiskLevels(
  actor: AuthenticatedActor,
  registerId: string,
  cells: Array<{ likelihoodValueId: string; impactValueId: string; riskLevelId: string }>,
  tx: Prisma.TransactionClient
) {
  const risks = await tx.risk.findMany({
    where: { registerId, state: { not: "CLOSED" } },
    select: { id: true, displayRiskId: true, likelihoodValueId: true, impactValueId: true, riskLevelId: true }
  });

  if (risks.length === 0) {
    return 0;
  }

  const cellMap = new Map(cells.map((c) => [`${c.likelihoodValueId}:${c.impactValueId}`, c.riskLevelId]));
  let updatedCount = 0;

  for (const risk of risks) {
    const newRiskLevelId = cellMap.get(`${risk.likelihoodValueId}:${risk.impactValueId}`);
    if (newRiskLevelId && newRiskLevelId !== risk.riskLevelId) {
      await tx.risk.update({
        where: { id: risk.id },
        data: { riskLevelId: newRiskLevelId }
      });

      await recordAuditEvent(
        {
          action: auditActions.riskUpdated,
          actor,
          objectType: "RISK",
          objectId: risk.id,
          objectDisplayName: risk.displayRiskId,
          scopeType: "REGISTER",
          registerId,
          summary: "Risk level recalculated due to matrix update",
          fieldChanges: [
            {
              fieldName: "riskLevelId",
              fieldLabel: "Risk level",
              previousValue: risk.riskLevelId,
              newValue: newRiskLevelId,
              valueType: "UUID"
            }
          ]
        },
        tx
      );

      updatedCount++;
    }
  }

  return updatedCount;
}

export async function getMatrix(registerId: string) {
  await assertRegisterExists(registerId);

  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { draftConfigVersionId: true }
  });

  if (register?.draftConfigVersionId) {
    const draft = await prisma.registerConfigVersion.findUnique({
      where: { id: register.draftConfigVersionId },
      select: { snapshotJson: true }
    });

    if (draft) {
      const snapshot = draft.snapshotJson as unknown as RegisterConfigSnapshot;
      const likelihoodById = new Map(snapshot.likelihoodValues.map((value) => [value.id, value]));
      const impactById = new Map(snapshot.impactValues.map((value) => [value.id, value]));
      const riskLevelById = new Map(snapshot.riskLevels.map((value) => [value.id, value]));

      return {
        likelihoodValues: snapshot.likelihoodValues,
        impactValues: snapshot.impactValues,
        riskLevels: snapshot.riskLevels,
        cells: snapshot.matrixCells.map((cell) => ({
          ...cell,
          registerId,
          likelihoodValue: likelihoodById.get(cell.likelihoodValueId) ?? null,
          impactValue: impactById.get(cell.impactValueId) ?? null,
          riskLevel: riskLevelById.get(cell.riskLevelId) ?? null
        }))
      };
    }
  }

  const [likelihoodValues, impactValues, riskLevels, cells] = await Promise.all([
    prisma.likelihoodValue.findMany({ where: { registerId }, orderBy: { displayOrder: "asc" } }),
    prisma.impactValue.findMany({ where: { registerId }, orderBy: { displayOrder: "asc" } }),
    prisma.riskLevel.findMany({ where: { registerId }, orderBy: { displayOrder: "asc" } }),
    prisma.riskMatrixCell.findMany({
      where: { registerId },
      include: {
        likelihoodValue: { select: { id: true, name: true, numericValue: true, displayOrder: true, isActive: true } },
        impactValue: { select: { id: true, name: true, numericValue: true, displayOrder: true, isActive: true } },
        riskLevel: { select: { id: true, name: true, color: true, displayOrder: true, isActive: true } }
      },
      orderBy: [
        { likelihoodValue: { displayOrder: "asc" } },
        { impactValue: { displayOrder: "asc" } }
      ]
    })
  ]);

  return { likelihoodValues, impactValues, riskLevels, cells };
}

export async function updateMatrix(
  actor: AuthenticatedActor,
  registerId: string,
  input: UpdateMatrixBody
) {
  await assertRegisterExists(registerId);
  await assertMatrixCellIdsExist(registerId, input.cells);
  await assertMatrixIsComplete(registerId, input.cells);

  return prisma.$transaction(async (tx) => {
    await tx.riskMatrixCell.deleteMany({ where: { registerId } });

    const newCells = await tx.riskMatrixCell.createManyAndReturn({
      data: input.cells.map((c) => ({
        registerId,
        likelihoodValueId: c.likelihoodValueId,
        impactValueId: c.impactValueId,
        riskLevelId: c.riskLevelId
      }))
    });

    let risksRecalculated = 0;
    if (input.recalculateExistingRisks) {
      risksRecalculated = await recalculateRiskLevels(actor, registerId, input.cells, tx);
    }

    await recordAuditEvent(
      {
        action: auditActions.riskMatrixUpdated,
        actor,
        objectType: "RISK_MATRIX",
        objectId: registerId,
        objectDisplayName: "Risk matrix",
        scopeType: "REGISTER",
        registerId,
        summary: "Risk matrix updated",
        metadataJson: {
          cellCount: newCells.length,
          recalculateExistingRisks: input.recalculateExistingRisks,
          risksRecalculated
        }
      },
      tx
    );

    return { cells: newCells, risksRecalculated };
  });
}

export async function updateMatrixCell(
  actor: AuthenticatedActor,
  registerId: string,
  cellId: string,
  input: UpdateMatrixCellBody
) {
  const existing = await findMatrixCell(registerId, cellId);

  const riskLevel = await prisma.riskLevel.findFirst({
    where: { id: input.riskLevelId, registerId, isActive: true },
    select: { id: true, name: true }
  });

  if (!riskLevel) {
    throw new ApiError(422, "UNPROCESSABLE", "Risk level does not belong to this register or is inactive", {
      riskLevelId: "Must be an active risk level for this register"
    });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.riskMatrixCell.update({
      where: { id: cellId },
      data: { riskLevelId: input.riskLevelId }
    });

    await recordAuditEvent(
      {
        action: auditActions.riskMatrixUpdated,
        actor,
        objectType: "RISK_MATRIX",
        objectId: registerId,
        objectDisplayName: "Risk matrix",
        scopeType: "REGISTER",
        registerId,
        summary: "Matrix cell updated",
        metadataJson: {
          cellId,
          likelihoodValueId: existing.likelihoodValueId,
          impactValueId: existing.impactValueId,
          previousRiskLevelId: existing.riskLevelId,
          newRiskLevelId: input.riskLevelId
        }
      },
      tx
    );

    return updated;
  });
}
