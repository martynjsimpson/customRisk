import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateImpactValueBody,
  CreateLikelihoodValueBody,
  CreateRiskLevelBody,
  UpdateImpactValueBody,
  UpdateLikelihoodValueBody,
  UpdateMatrixBody,
  UpdateMatrixCellBody,
  UpdateRiskLevelBody
} from "../validators/scoringConfig.schemas.js";
import { buildFieldChanges, recordAuditEvent } from "./audit.service.js";

const registerConfigSelect = {
  id: true,
  name: true,
  description: true,
  riskIdPrefix: true,
  riskIdZeroPaddingEnabled: true,
  riskIdZeroPaddingWidth: true,
  nextRiskSequence: true,
  defaultNewRiskState: true,
  reviewsEnabled: true,
  defaultReviewFrequencyMonths: true,
  reviewAttestationText: true,
  allowViewerExport: true,
  createdAt: true,
  updatedAt: true
};


async function assertRegisterExists(registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: registerConfigSelect
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  return register;
}


const likelihoodAuditFields = [
  { name: "name", label: "Name", valueType: "TEXT" },
  { name: "numericValue", label: "Numeric value", valueType: "NUMBER" },
  { name: "displayOrder", label: "Display order", valueType: "NUMBER" },
  { name: "isActive", label: "Active", valueType: "BOOLEAN" }
] satisfies Array<{ name: "name" | "numericValue" | "displayOrder" | "isActive"; label: string; valueType: AuditValueType }>;

function mapLikelihoodPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "A likelihood value with this name, numeric value, or display order already exists");
  }

  throw error;
}

async function findLikelihoodValue(registerId: string, likelihoodId: string) {
  const value = await prisma.likelihoodValue.findFirst({
    where: { id: likelihoodId, registerId }
  });

  if (!value) {
    throw new ApiError(404, "NOT_FOUND", "Likelihood value not found");
  }

  return value;
}

async function assertLikelihoodWillKeepActiveValue(registerId: string, excludeId?: string) {
  const activeCount = await prisma.likelihoodValue.count({
    where: {
      registerId,
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined
    }
  });

  if (activeCount === 0) {
    throw new ApiError(422, "UNPROCESSABLE", "At least one active likelihood value must remain", {
      isActive: "Cannot deactivate the final active likelihood value"
    });
  }
}

export async function listLikelihoodValues(registerId: string) {
  await assertRegisterExists(registerId);

  return prisma.likelihoodValue.findMany({
    where: { registerId },
    orderBy: { displayOrder: "asc" }
  });
}

export async function createLikelihoodValue(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateLikelihoodValueBody
) {
  await assertRegisterExists(registerId);

  try {
    return await prisma.$transaction(async (tx) => {
      const value = await tx.likelihoodValue.create({
        data: {
          registerId,
          name: input.name,
          numericValue: input.numericValue,
          displayOrder: input.displayOrder,
          isActive: input.isActive
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.likelihoodValueCreated,
          actor,
          objectType: "LIKELIHOOD_VALUE",
          objectId: value.id,
          objectDisplayName: value.name,
          scopeType: "REGISTER",
          registerId,
          summary: "Likelihood value created",
          metadataJson: {
            numericValue: value.numericValue.toString(),
            displayOrder: value.displayOrder,
            isActive: value.isActive
          }
        },
        tx
      );

      return value;
    });
  } catch (error) {
    mapLikelihoodPrismaError(error);
  }
}

export async function updateLikelihoodValue(
  actor: AuthenticatedActor,
  registerId: string,
  likelihoodId: string,
  input: UpdateLikelihoodValueBody
) {
  const existing = await findLikelihoodValue(registerId, likelihoodId);

  if (input.isActive === false && existing.isActive) {
    await assertLikelihoodWillKeepActiveValue(registerId, likelihoodId);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.likelihoodValue.update({
        where: { id: likelihoodId },
        data: {
          name: input.name,
          numericValue: input.numericValue,
          displayOrder: input.displayOrder,
          isActive: input.isActive
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.likelihoodValueUpdated,
          actor,
          objectType: "LIKELIHOOD_VALUE",
          objectId: updated.id,
          objectDisplayName: updated.name,
          scopeType: "REGISTER",
          registerId,
          summary: "Likelihood value updated",
          fieldChanges: buildFieldChanges(existing, updated, likelihoodAuditFields)
        },
        tx
      );

      return updated;
    });
  } catch (error) {
    mapLikelihoodPrismaError(error);
  }
}

export async function deactivateLikelihoodValue(
  actor: AuthenticatedActor,
  registerId: string,
  likelihoodId: string
) {
  const existing = await findLikelihoodValue(registerId, likelihoodId);

  if (existing.isActive) {
    await assertLikelihoodWillKeepActiveValue(registerId, likelihoodId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.likelihoodValue.update({
      where: { id: likelihoodId },
      data: { isActive: false }
    });

    await recordAuditEvent(
      {
        action: auditActions.likelihoodValueDeactivated,
        actor,
        objectType: "LIKELIHOOD_VALUE",
        objectId: updated.id,
        objectDisplayName: updated.name,
        scopeType: "REGISTER",
        registerId,
        summary: "Likelihood value deactivated",
        fieldChanges: [
          {
            fieldName: "isActive",
            fieldLabel: "Active",
            previousValue: existing.isActive,
            newValue: false,
            valueType: "BOOLEAN"
          }
        ]
      },
      tx
    );

    return updated;
  });
}

// --- Impact Value ---

const impactAuditFields = [
  { name: "name", label: "Name", valueType: "TEXT" },
  { name: "numericValue", label: "Numeric value", valueType: "NUMBER" },
  { name: "displayOrder", label: "Display order", valueType: "NUMBER" },
  { name: "isActive", label: "Active", valueType: "BOOLEAN" }
] satisfies Array<{ name: "name" | "numericValue" | "displayOrder" | "isActive"; label: string; valueType: AuditValueType }>;

function mapImpactPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "An impact value with this name, numeric value, or display order already exists");
  }

  throw error;
}

async function findImpactValue(registerId: string, impactId: string) {
  const value = await prisma.impactValue.findFirst({
    where: { id: impactId, registerId }
  });

  if (!value) {
    throw new ApiError(404, "NOT_FOUND", "Impact value not found");
  }

  return value;
}

async function assertImpactWillKeepActiveValue(registerId: string, excludeId?: string) {
  const activeCount = await prisma.impactValue.count({
    where: {
      registerId,
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined
    }
  });

  if (activeCount === 0) {
    throw new ApiError(422, "UNPROCESSABLE", "At least one active impact value must remain", {
      isActive: "Cannot deactivate the final active impact value"
    });
  }
}

export async function listImpactValues(registerId: string) {
  await assertRegisterExists(registerId);

  return prisma.impactValue.findMany({
    where: { registerId },
    orderBy: { displayOrder: "asc" }
  });
}

export async function createImpactValue(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateImpactValueBody
) {
  await assertRegisterExists(registerId);

  try {
    return await prisma.$transaction(async (tx) => {
      const value = await tx.impactValue.create({
        data: {
          registerId,
          name: input.name,
          numericValue: input.numericValue,
          displayOrder: input.displayOrder,
          isActive: input.isActive
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.impactValueCreated,
          actor,
          objectType: "IMPACT_VALUE",
          objectId: value.id,
          objectDisplayName: value.name,
          scopeType: "REGISTER",
          registerId,
          summary: "Impact value created",
          metadataJson: {
            numericValue: value.numericValue.toString(),
            displayOrder: value.displayOrder,
            isActive: value.isActive
          }
        },
        tx
      );

      return value;
    });
  } catch (error) {
    mapImpactPrismaError(error);
  }
}

export async function updateImpactValue(
  actor: AuthenticatedActor,
  registerId: string,
  impactId: string,
  input: UpdateImpactValueBody
) {
  const existing = await findImpactValue(registerId, impactId);

  if (input.isActive === false && existing.isActive) {
    await assertImpactWillKeepActiveValue(registerId, impactId);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.impactValue.update({
        where: { id: impactId },
        data: {
          name: input.name,
          numericValue: input.numericValue,
          displayOrder: input.displayOrder,
          isActive: input.isActive
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.impactValueUpdated,
          actor,
          objectType: "IMPACT_VALUE",
          objectId: updated.id,
          objectDisplayName: updated.name,
          scopeType: "REGISTER",
          registerId,
          summary: "Impact value updated",
          fieldChanges: buildFieldChanges(existing, updated, impactAuditFields)
        },
        tx
      );

      return updated;
    });
  } catch (error) {
    mapImpactPrismaError(error);
  }
}

export async function deactivateImpactValue(
  actor: AuthenticatedActor,
  registerId: string,
  impactId: string
) {
  const existing = await findImpactValue(registerId, impactId);

  if (existing.isActive) {
    await assertImpactWillKeepActiveValue(registerId, impactId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.impactValue.update({
      where: { id: impactId },
      data: { isActive: false }
    });

    await recordAuditEvent(
      {
        action: auditActions.impactValueDeactivated,
        actor,
        objectType: "IMPACT_VALUE",
        objectId: updated.id,
        objectDisplayName: updated.name,
        scopeType: "REGISTER",
        registerId,
        summary: "Impact value deactivated",
        fieldChanges: [
          {
            fieldName: "isActive",
            fieldLabel: "Active",
            previousValue: existing.isActive,
            newValue: false,
            valueType: "BOOLEAN"
          }
        ]
      },
      tx
    );

    return updated;
  });
}

// --- Risk Level ---

const riskLevelAuditFields = [
  { name: "name", label: "Name", valueType: "TEXT" },
  { name: "description", label: "Description", valueType: "TEXT" },
  { name: "color", label: "Color", valueType: "TEXT" },
  { name: "displayOrder", label: "Display order", valueType: "NUMBER" },
  { name: "isActive", label: "Active", valueType: "BOOLEAN" }
] satisfies Array<{ name: "name" | "description" | "color" | "displayOrder" | "isActive"; label: string; valueType: AuditValueType }>;

function mapRiskLevelPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "A risk level with this name or display order already exists");
  }

  throw error;
}

async function findRiskLevel(registerId: string, riskLevelId: string) {
  const value = await prisma.riskLevel.findFirst({
    where: { id: riskLevelId, registerId }
  });

  if (!value) {
    throw new ApiError(404, "NOT_FOUND", "Risk level not found");
  }

  return value;
}

async function assertRiskLevelWillKeepActiveValue(registerId: string, excludeId?: string) {
  const activeCount = await prisma.riskLevel.count({
    where: {
      registerId,
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined
    }
  });

  if (activeCount === 0) {
    throw new ApiError(422, "UNPROCESSABLE", "At least one active risk level must remain", {
      isActive: "Cannot deactivate the final active risk level"
    });
  }
}

export async function listRiskLevels(registerId: string) {
  await assertRegisterExists(registerId);

  return prisma.riskLevel.findMany({
    where: { registerId },
    orderBy: { displayOrder: "asc" }
  });
}

export async function createRiskLevel(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateRiskLevelBody
) {
  await assertRegisterExists(registerId);

  try {
    return await prisma.$transaction(async (tx) => {
      const value = await tx.riskLevel.create({
        data: {
          registerId,
          name: input.name,
          description: input.description ?? null,
          color: input.color ?? null,
          displayOrder: input.displayOrder,
          isActive: input.isActive
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.riskLevelCreated,
          actor,
          objectType: "RISK_LEVEL",
          objectId: value.id,
          objectDisplayName: value.name,
          scopeType: "REGISTER",
          registerId,
          summary: "Risk level created",
          metadataJson: {
            displayOrder: value.displayOrder,
            isActive: value.isActive
          }
        },
        tx
      );

      return value;
    });
  } catch (error) {
    mapRiskLevelPrismaError(error);
  }
}

export async function updateRiskLevel(
  actor: AuthenticatedActor,
  registerId: string,
  riskLevelId: string,
  input: UpdateRiskLevelBody
) {
  const existing = await findRiskLevel(registerId, riskLevelId);

  if (input.isActive === false && existing.isActive) {
    await assertRiskLevelWillKeepActiveValue(registerId, riskLevelId);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.riskLevel.update({
        where: { id: riskLevelId },
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          displayOrder: input.displayOrder,
          isActive: input.isActive
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.riskLevelUpdated,
          actor,
          objectType: "RISK_LEVEL",
          objectId: updated.id,
          objectDisplayName: updated.name,
          scopeType: "REGISTER",
          registerId,
          summary: "Risk level updated",
          fieldChanges: buildFieldChanges(existing, updated, riskLevelAuditFields)
        },
        tx
      );

      return updated;
    });
  } catch (error) {
    mapRiskLevelPrismaError(error);
  }
}

export async function deactivateRiskLevel(
  actor: AuthenticatedActor,
  registerId: string,
  riskLevelId: string
) {
  const existing = await findRiskLevel(registerId, riskLevelId);

  if (existing.isActive) {
    await assertRiskLevelWillKeepActiveValue(registerId, riskLevelId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.riskLevel.update({
      where: { id: riskLevelId },
      data: { isActive: false }
    });

    await recordAuditEvent(
      {
        action: auditActions.riskLevelDeactivated,
        actor,
        objectType: "RISK_LEVEL",
        objectId: updated.id,
        objectDisplayName: updated.name,
        scopeType: "REGISTER",
        registerId,
        summary: "Risk level deactivated",
        fieldChanges: [
          {
            fieldName: "isActive",
            fieldLabel: "Active",
            previousValue: existing.isActive,
            newValue: false,
            valueType: "BOOLEAN"
          }
        ]
      },
      tx
    );

    return updated;
  });
}

// --- Risk Matrix ---

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

async function recalculateRiskLevels(
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
