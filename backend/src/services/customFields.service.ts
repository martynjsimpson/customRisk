import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { validateFormula } from "./formulaEvaluator.service.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateCustomFieldBody,
  CreateCustomFieldOptionBody,
  UpdateCustomFieldBody,
  UpdateCustomFieldOptionBody
} from "../validators/customFields.schemas.js";
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
  { name: "validationMode", label: "Validation mode", valueType: "TEXT" },
  { name: "displayOrder", label: "Display order", valueType: "NUMBER" },
  { name: "isActive", label: "Active", valueType: "BOOLEAN" }
] satisfies Array<{ name: "fieldName" | "helpText" | "isRequired" | "validationMode" | "displayOrder" | "isActive"; label: string; valueType: AuditValueType }>;

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

function isOptionsField(fieldType: string) {
  return fieldType === "DROPDOWN" || fieldType === "MULTI_SELECT";
}

function isCalculatedField(fieldType: string) {
  return fieldType === "CALCULATED";
}

export function extractFormulaDependencies(formula: string): string[] {
  const matches = formula.matchAll(/\{field:([0-9a-f-]{36})\}/gi);
  return [...new Set([...matches].map((m) => m[1]).filter((id): id is string => Boolean(id)))];
}

async function findDropdownField(registerId: string, fieldId: string) {
  const field = await findCustomField(registerId, fieldId);
  if (!isOptionsField(field.fieldType)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Options are only supported for dropdown and multi-select fields", {
      fieldId: "Custom field must be a dropdown or multi-select field"
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
  if (isCalculatedField(input.fieldType)) {
    if (!input.formula) {
      throw new ApiError(400, "VALIDATION_ERROR", "Calculated fields require a formula", {
        formula: "Provide a formula expression for this calculated field"
      });
    }
    const formulaCheck = validateFormula(input.formula);
    if (!formulaCheck.valid) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid formula expression", {
        formula: formulaCheck.error ?? "Formula cannot be evaluated"
      });
    }
    if (input.options && input.options.length > 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Calculated fields cannot have options", {
        options: "Options are not supported for calculated fields"
      });
    }
    if (input.isRequired) {
      throw new ApiError(400, "VALIDATION_ERROR", "Calculated fields cannot be marked as required", {
        isRequired: "Calculated fields are computed automatically and cannot be required"
      });
    }
    return;
  }

  const hasActiveOptions = (input.options ?? []).some((option) => option.isActive);
  if (isOptionsField(input.fieldType) && input.isActive && !hasActiveOptions) {
    throw new ApiError(400, "VALIDATION_ERROR", "Active option-based fields require at least one active option", {
      options: "Add at least one active option"
    });
  }

  if (!isOptionsField(input.fieldType) && input.options && input.options.length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Options are only supported for dropdown and multi-select fields", {
      options: "Only dropdown and multi-select fields can have options"
    });
  }

  if (input.formula) {
    throw new ApiError(400, "VALIDATION_ERROR", "Formulas are only supported for calculated fields", {
      formula: "Only calculated fields can have a formula"
    });
  }
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
      const derivedValidationMode = isCalculatedField(input.fieldType) ? "ALLOW" : (input.validationMode ?? (input.isRequired ? "BLOCK" : "ALLOW"));
      const formulaDependencies = input.formula ? extractFormulaDependencies(input.formula) : [];
      const field = await tx.customFieldDefinition.create({
        data: {
          registerId,
          fieldName: input.fieldName,
          fieldType: input.fieldType,
          helpText: input.helpText,
          isRequired: isCalculatedField(input.fieldType) ? false : input.isRequired,
          validationMode: derivedValidationMode,
          displayOrder: input.displayOrder,
          isActive: input.isActive,
          formula: input.formula ?? null,
          formulaDependencies,
          visibleToRoles: input.visibleToRoles ?? [],
          visibleToRiskResponseOwners: input.visibleToRiskResponseOwners ?? true,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
          options:
            isOptionsField(input.fieldType) && input.options && input.options.length > 0
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
          summary: `Custom field '${field.fieldName}' created (${field.fieldType})`,
          metadataJson: {
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            helpText: field.helpText ?? null,
            isRequired: field.isRequired,
            validationMode: field.validationMode,
            isActive: field.isActive,
            displayOrder: field.displayOrder
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

  if (isOptionsField(existing.fieldType) && input.isActive === true) {
    await assertDropdownActivationIsValid(fieldId);
  }

  if (isCalculatedField(existing.fieldType) && input.isRequired === true) {
    throw new ApiError(400, "VALIDATION_ERROR", "Calculated fields cannot be marked as required", {
      isRequired: "Calculated fields are computed automatically and cannot be required"
    });
  }

  if (!isCalculatedField(existing.fieldType) && input.formula) {
    throw new ApiError(400, "VALIDATION_ERROR", "Formulas are only supported for calculated fields", {
      formula: "Only calculated fields can have a formula"
    });
  }

  if (isCalculatedField(existing.fieldType) && input.formula) {
    const formulaCheck = validateFormula(input.formula);
    if (!formulaCheck.valid) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid formula expression", {
        formula: formulaCheck.error ?? "Formula cannot be evaluated"
      });
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const formulaDependencies = input.formula ? extractFormulaDependencies(input.formula) : undefined;
      const updated = await tx.customFieldDefinition.update({
        where: { id: fieldId },
        data: {
          fieldName: input.fieldName,
          helpText: input.helpText,
          isRequired: isCalculatedField(existing.fieldType) ? false : input.isRequired,
          validationMode: input.validationMode,
          displayOrder: input.displayOrder,
          isActive: input.isActive,
          formula: input.formula,
          formulaDependencies: formulaDependencies,
          visibleToRoles: input.visibleToRoles,
          visibleToRiskResponseOwners: input.visibleToRiskResponseOwners,
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
          summary: `Custom field '${updated.fieldName}' updated`,
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

  if (isOptionsField(field.fieldType)) {
    await assertDropdownActivationIsValid(fieldId);
  }

  return setCustomFieldActiveState(actor, registerId, fieldId, true);
}

export async function deactivateCustomField(actor: AuthenticatedActor, registerId: string, fieldId: string) {
  await findCustomField(registerId, fieldId);
  return setCustomFieldActiveState(actor, registerId, fieldId, false);
}

export async function setCustomFieldActiveState(
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
        summary: isActive
          ? `Custom field '${updated.fieldName}' activated`
          : `Custom field '${updated.fieldName}' deactivated`,
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
          summary: `Dropdown option '${option.label}' added to '${field.fieldName}'`,
          metadataJson: {
            customFieldDefinitionId: field.id,
            fieldName: field.fieldName,
            label: option.label,
            displayOrder: option.displayOrder,
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
  const [field, existing] = await Promise.all([
    findDropdownField(registerId, fieldId),
    findCustomFieldOption(registerId, fieldId, optionId)
  ]);

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
          summary: `Dropdown option '${updated.label}' updated in '${field.fieldName}'`,
          metadataJson: { customFieldDefinitionId: fieldId, fieldName: field.fieldName },
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
  const [field, existing] = await Promise.all([
    findDropdownField(registerId, fieldId),
    findCustomFieldOption(registerId, fieldId, optionId)
  ]);
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
        summary: `Dropdown option '${updated.label}' deactivated in '${field.fieldName}'`,
        metadataJson: { customFieldDefinitionId: fieldId, fieldName: field.fieldName },
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
