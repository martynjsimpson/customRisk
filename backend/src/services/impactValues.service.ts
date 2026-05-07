import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateImpactValueBody,
  UpdateImpactValueBody
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
