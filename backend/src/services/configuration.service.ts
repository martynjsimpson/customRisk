import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type { CreateCustomFieldBody, UpdateCustomFieldBody } from "../validators/configuration.schemas.js";
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

const customFieldInclude = {
  options: {
    orderBy: { displayOrder: "asc" as const }
  }
};

const customFieldAuditFields = [
  { name: "fieldName", label: "Field name", valueType: "TEXT" },
  { name: "helpText", label: "Help text", valueType: "TEXT" },
  { name: "isRequired", label: "Required", valueType: "BOOLEAN" },
  { name: "displayOrder", label: "Display order", valueType: "NUMBER" },
  { name: "isActive", label: "Active", valueType: "BOOLEAN" }
] satisfies Array<{ name: "fieldName" | "helpText" | "isRequired" | "displayOrder" | "isActive"; label: string; valueType: AuditValueType }>;

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

function mapCustomFieldPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "A custom field with this name or display order already exists");
  }

  throw error;
}

async function findCustomField(registerId: string, fieldId: string) {
  const field = await prisma.customFieldDefinition.findFirst({
    where: { id: fieldId, registerId },
    include: customFieldInclude
  });

  if (!field) {
    throw new ApiError(404, "NOT_FOUND", "Custom field not found");
  }

  return field;
}

async function assertDropdownActivationIsValid(fieldId: string, inputOptionsActive = false) {
  const activeOptionCount = await prisma.customFieldOption.count({
    where: { customFieldDefinitionId: fieldId, isActive: true }
  });

  if (activeOptionCount === 0 && !inputOptionsActive) {
    throw new ApiError(400, "VALIDATION_ERROR", "Active dropdown fields require at least one active option", {
      options: "Add at least one active option before activating this dropdown field"
    });
  }
}

function validateCreateCustomField(input: CreateCustomFieldBody) {
  const hasActiveOptions = (input.options ?? []).some((option) => option.isActive);
  if (input.fieldType === "DROPDOWN" && input.isActive && !hasActiveOptions) {
    throw new ApiError(400, "VALIDATION_ERROR", "Active dropdown fields require at least one active option", {
      options: "Add at least one active option"
    });
  }

  if (input.fieldType !== "DROPDOWN" && input.options && input.options.length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Options are only supported for dropdown fields", {
      options: "Only dropdown fields can have options"
    });
  }
}

async function getReferencedConfigurationIds(registerId: string) {
  const [risks, customFieldValues] = await Promise.all([
    prisma.risk.findMany({
      where: { registerId },
      select: {
        ownerUserId: true,
        likelihoodValueId: true,
        impactValueId: true,
        riskLevelId: true,
        responseStrategyId: true
      }
    }),
    prisma.riskCustomFieldValue.findMany({
      where: { registerId },
      select: {
        customFieldDefinitionId: true,
        dropdownOptionId: true,
        personUserId: true
      }
    })
  ]);

  return {
    userIds: [
      ...new Set([
        ...risks.map((risk) => risk.ownerUserId),
        ...customFieldValues.map((value) => value.personUserId).filter((id): id is string => Boolean(id))
      ])
    ],
    customFieldDefinitionIds: [
      ...new Set(customFieldValues.map((value) => value.customFieldDefinitionId))
    ],
    dropdownOptionIds: [
      ...new Set(customFieldValues.map((value) => value.dropdownOptionId).filter((id): id is string => Boolean(id)))
    ],
    likelihoodValueIds: [...new Set(risks.map((risk) => risk.likelihoodValueId))],
    impactValueIds: [...new Set(risks.map((risk) => risk.impactValueId))],
    riskLevelIds: [...new Set(risks.map((risk) => risk.riskLevelId))],
    responseStrategyIds: [...new Set(risks.map((risk) => risk.responseStrategyId))]
  };
}

export async function listCustomFields(registerId: string) {
  await assertRegisterExists(registerId);

  return prisma.customFieldDefinition.findMany({
    where: { registerId },
    include: customFieldInclude,
    orderBy: { displayOrder: "asc" }
  });
}

export async function getCustomField(registerId: string, fieldId: string) {
  return findCustomField(registerId, fieldId);
}

export async function createCustomField(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateCustomFieldBody
) {
  await assertRegisterExists(registerId);
  validateCreateCustomField(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const field = await tx.customFieldDefinition.create({
        data: {
          registerId,
          fieldName: input.fieldName,
          fieldType: input.fieldType,
          helpText: input.helpText,
          isRequired: input.isRequired,
          displayOrder: input.displayOrder,
          isActive: input.isActive,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
          options:
            input.fieldType === "DROPDOWN" && input.options && input.options.length > 0
              ? {
                  createMany: {
                    data: input.options.map((option) => ({
                      label: option.label,
                      displayOrder: option.displayOrder,
                      isActive: option.isActive
                    }))
                  }
                }
              : undefined
        },
        include: customFieldInclude
      });

      await recordAuditEvent(
        {
          action: auditActions.customFieldCreated,
          actor,
          objectType: "CUSTOM_FIELD",
          objectId: field.id,
          objectDisplayName: field.fieldName,
          scopeType: "REGISTER",
          registerId,
          summary: "Custom field created",
          metadataJson: {
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            isActive: field.isActive
          }
        },
        tx
      );

      return field;
    });
  } catch (error) {
    mapCustomFieldPrismaError(error);
  }
}

export async function updateCustomField(
  actor: AuthenticatedActor,
  registerId: string,
  fieldId: string,
  input: UpdateCustomFieldBody
) {
  const existing = await findCustomField(registerId, fieldId);

  if (existing.fieldType === "DROPDOWN" && input.isActive === true) {
    await assertDropdownActivationIsValid(fieldId);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.customFieldDefinition.update({
        where: { id: fieldId },
        data: {
          fieldName: input.fieldName,
          helpText: input.helpText,
          isRequired: input.isRequired,
          displayOrder: input.displayOrder,
          isActive: input.isActive,
          updatedByUserId: actor.id
        },
        include: customFieldInclude
      });

      await recordAuditEvent(
        {
          action: auditActions.customFieldUpdated,
          actor,
          objectType: "CUSTOM_FIELD",
          objectId: updated.id,
          objectDisplayName: updated.fieldName,
          scopeType: "REGISTER",
          registerId,
          summary: "Custom field updated",
          fieldChanges: buildFieldChanges(existing, updated, customFieldAuditFields)
        },
        tx
      );

      return updated;
    });
  } catch (error) {
    mapCustomFieldPrismaError(error);
  }
}

export async function activateCustomField(actor: AuthenticatedActor, registerId: string, fieldId: string) {
  const field = await findCustomField(registerId, fieldId);

  if (field.fieldType === "DROPDOWN") {
    await assertDropdownActivationIsValid(fieldId);
  }

  return setCustomFieldActiveState(actor, registerId, fieldId, true);
}

export async function deactivateCustomField(actor: AuthenticatedActor, registerId: string, fieldId: string) {
  await findCustomField(registerId, fieldId);
  return setCustomFieldActiveState(actor, registerId, fieldId, false);
}

async function setCustomFieldActiveState(
  actor: AuthenticatedActor,
  registerId: string,
  fieldId: string,
  isActive: boolean
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.customFieldDefinition.update({
      where: { id: fieldId },
      data: {
        isActive,
        updatedByUserId: actor.id
      },
      include: customFieldInclude
    });

    await recordAuditEvent(
      {
        action: isActive ? auditActions.customFieldActivated : auditActions.customFieldDeactivated,
        actor,
        objectType: "CUSTOM_FIELD",
        objectId: updated.id,
        objectDisplayName: updated.fieldName,
        scopeType: "REGISTER",
        registerId,
        summary: isActive ? "Custom field activated" : "Custom field deactivated",
        fieldChanges: [
          {
            fieldName: "isActive",
            fieldLabel: "Active",
            previousValue: !isActive,
            newValue: isActive,
            valueType: "BOOLEAN"
          }
        ]
      },
      tx
    );

    return updated;
  });
}

export async function getRegisterConfig(registerId: string) {
  const register = await assertRegisterExists(registerId);

  const [customFields, likelihoodValues, impactValues, riskLevels, matrixCells, responseStrategies] =
    await Promise.all([
      prisma.customFieldDefinition.findMany({
        where: { registerId },
        include: {
          options: {
            orderBy: { displayOrder: "asc" }
          }
        },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.likelihoodValue.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.impactValue.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.riskLevel.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.riskMatrixCell.findMany({
        where: { registerId },
        include: {
          likelihoodValue: true,
          impactValue: true,
          riskLevel: true
        },
        orderBy: [{ likelihoodValue: { displayOrder: "asc" } }, { impactValue: { displayOrder: "asc" } }]
      }),
      prisma.responseStrategy.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      })
    ]);

  return {
    register,
    customFields,
    likelihoodValues,
    impactValues,
    riskLevels,
    matrixCells,
    responseStrategies
  };
}

export async function getRiskFormConfig(registerId: string) {
  const register = await assertRegisterExists(registerId);
  const referencedIds = await getReferencedConfigurationIds(registerId);

  const [users, customFields, likelihoodValues, impactValues, riskLevels, responseStrategies] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ isActive: true }, { id: { in: referencedIds.userIds } }]
      },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    }),
    prisma.customFieldDefinition.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.customFieldDefinitionIds } }]
      },
      include: {
        options: {
          where: {
            OR: [{ isActive: true }, { id: { in: referencedIds.dropdownOptionIds } }]
          },
          orderBy: { displayOrder: "asc" }
        }
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.likelihoodValue.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.likelihoodValueIds } }]
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.impactValue.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.impactValueIds } }]
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.riskLevel.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.riskLevelIds } }]
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.responseStrategy.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.responseStrategyIds } }]
      },
      orderBy: { displayOrder: "asc" }
    })
  ]);

  return {
    states: ["DRAFT", "OPEN", "CLOSED"],
    register,
    users,
    customFields,
    likelihoodValues,
    impactValues,
    riskLevels,
    responseStrategies
  };
}
