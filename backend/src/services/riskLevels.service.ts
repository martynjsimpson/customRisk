import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateRiskLevelBody,
  UpdateRiskLevelBody
} from "../validators/scoringConfig.schemas.js";
import { buildFieldChanges, recordAuditEvent } from "./audit.service.js";

async function assertRegisterExists(registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }
}

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
