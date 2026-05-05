import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateCustomFieldBody,
  CreateCustomFieldOptionBody,
  CreateImpactValueBody,
  CreateLikelihoodValueBody,
  CreateRiskLevelBody,
  UpdateCustomFieldBody,
  UpdateCustomFieldOptionBody,
  UpdateImpactValueBody,
  UpdateLikelihoodValueBody,
  UpdateRiskLevelBody
} from "../validators/configuration.schemas.js";
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

const optionAuditFields = [
  { name: "label", label: "Label", valueType: "TEXT" },
  { name: "displayOrder", label: "Display order", valueType: "NUMBER" },
  { name: "isActive", label: "Active", valueType: "BOOLEAN" }
] satisfies Array<{ name: "label" | "displayOrder" | "isActive"; label: string; valueType: AuditValueType }>;

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

function mapCustomFieldOptionPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "A dropdown option with this label or display order already exists");
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

async function findDropdownField(registerId: string, fieldId: string) {
  const field = await findCustomField(registerId, fieldId);
  if (field.fieldType !== "DROPDOWN") {
    throw new ApiError(400, "VALIDATION_ERROR", "Options are only supported for dropdown fields", {
      fieldId: "Custom field must be a dropdown field"
    });
  }

  return field;
}

async function findCustomFieldOption(registerId: string, fieldId: string, optionId: string) {
  await findDropdownField(registerId, fieldId);
  const option = await prisma.customFieldOption.findFirst({
    where: {
      id: optionId,
      customFieldDefinitionId: fieldId
    }
  });

  if (!option) {
    throw new ApiError(404, "NOT_FOUND", "Dropdown option not found");
  }

  return option;
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

async function assertDropdownWillKeepActiveOption(fieldId: string, optionId: string | null = null) {
  const field = await prisma.customFieldDefinition.findUnique({
    where: { id: fieldId },
    select: { isActive: true }
  });

  if (!field?.isActive) {
    return;
  }

  const activeOptionCount = await prisma.customFieldOption.count({
    where: {
      customFieldDefinitionId: fieldId,
      isActive: true,
      id: optionId ? { not: optionId } : undefined
    }
  });

  if (activeOptionCount === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Active dropdown fields require at least one active option", {
      isActive: "Cannot deactivate the final active option on an active dropdown field"
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

export async function listCustomFieldOptions(registerId: string, fieldId: string) {
  await findDropdownField(registerId, fieldId);

  return prisma.customFieldOption.findMany({
    where: { customFieldDefinitionId: fieldId },
    orderBy: { displayOrder: "asc" }
  });
}

export async function createCustomFieldOption(
  actor: AuthenticatedActor,
  registerId: string,
  fieldId: string,
  input: CreateCustomFieldOptionBody
) {
  const field = await findDropdownField(registerId, fieldId);

  if (!input.isActive) {
    await assertDropdownWillKeepActiveOption(fieldId);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const option = await tx.customFieldOption.create({
        data: {
          customFieldDefinitionId: fieldId,
          label: input.label,
          displayOrder: input.displayOrder,
          isActive: input.isActive
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.customFieldOptionCreated,
          actor,
          objectType: "CUSTOM_FIELD_OPTION",
          objectId: option.id,
          objectDisplayName: option.label,
          scopeType: "REGISTER",
          registerId,
          summary: "Dropdown option created",
          metadataJson: {
            customFieldDefinitionId: field.id,
            fieldName: field.fieldName,
            isActive: option.isActive
          }
        },
        tx
      );

      return option;
    });
  } catch (error) {
    mapCustomFieldOptionPrismaError(error);
  }
}

export async function updateCustomFieldOption(
  actor: AuthenticatedActor,
  registerId: string,
  fieldId: string,
  optionId: string,
  input: UpdateCustomFieldOptionBody
) {
  const existing = await findCustomFieldOption(registerId, fieldId, optionId);

  if (input.isActive === false && existing.isActive) {
    await assertDropdownWillKeepActiveOption(fieldId, optionId);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.customFieldOption.update({
        where: { id: optionId },
        data: {
          label: input.label,
          displayOrder: input.displayOrder,
          isActive: input.isActive
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.customFieldOptionUpdated,
          actor,
          objectType: "CUSTOM_FIELD_OPTION",
          objectId: updated.id,
          objectDisplayName: updated.label,
          scopeType: "REGISTER",
          registerId,
          summary: "Dropdown option updated",
          metadataJson: { customFieldDefinitionId: fieldId },
          fieldChanges: buildFieldChanges(existing, updated, optionAuditFields)
        },
        tx
      );

      return updated;
    });
  } catch (error) {
    mapCustomFieldOptionPrismaError(error);
  }
}

export async function deactivateCustomFieldOption(
  actor: AuthenticatedActor,
  registerId: string,
  fieldId: string,
  optionId: string
) {
  const existing = await findCustomFieldOption(registerId, fieldId, optionId);
  if (existing.isActive) {
    await assertDropdownWillKeepActiveOption(fieldId, optionId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.customFieldOption.update({
      where: { id: optionId },
      data: { isActive: false }
    });

    await recordAuditEvent(
      {
        action: auditActions.customFieldOptionDeactivated,
        actor,
        objectType: "CUSTOM_FIELD_OPTION",
        objectId: updated.id,
        objectDisplayName: updated.label,
        scopeType: "REGISTER",
        registerId,
        summary: "Dropdown option deactivated",
        metadataJson: { customFieldDefinitionId: fieldId },
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

// --- Likelihood Value ---

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
  { name: "displayOrder", label: "Display order", valueType: "NUMBER" },
  { name: "isActive", label: "Active", valueType: "BOOLEAN" }
] satisfies Array<{ name: "name" | "description" | "displayOrder" | "isActive"; label: string; valueType: AuditValueType }>;

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
