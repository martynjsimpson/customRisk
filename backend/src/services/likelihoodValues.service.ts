import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateLikelihoodValueBody,
  UpdateLikelihoodValueBody
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
