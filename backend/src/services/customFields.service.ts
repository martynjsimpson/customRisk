import { CustomFieldType, Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateCustomFieldBody,
  CreateCustomFieldOptionBody,
  UpdateCustomFieldBody,
  UpdateCustomFieldOptionBody
} from "../validators/customFields.schemas.js";
import type { RiskCustomFieldValueBody } from "../validators/risks.schemas.js";
import { buildFieldChanges, recordAuditEvent } from "./audit.service.js";

type CustomFieldClient = typeof prisma | Prisma.TransactionClient;

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

function toDateOnlyString(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function countProvidedValues(value: RiskCustomFieldValueBody) {
  return [
    value.textValue,
    value.numberValue,
    value.booleanValue,
    value.dateValue,
    value.personUserId,
    value.dropdownOptionId
  ].filter((entry) => entry !== undefined && entry !== null && entry !== "").length;
}

function hasValueForType(
  fieldType: CustomFieldType,
  value: RiskCustomFieldValueBody | ExistingCustomFieldValue | undefined
) {
  if (!value) {
    return false;
  }

  switch (fieldType) {
    case "TEXT":
    case "MULTILINE_TEXT":
      return Boolean(value.textValue);
    case "NUMBER":
      return value.numberValue !== undefined;
    case "BOOLEAN":
      return value.booleanValue !== undefined;
    case "DATE":
      return value.dateValue !== undefined;
    case "PERSON_PICKER":
      return Boolean(value.personUserId);
    case "DROPDOWN":
      return Boolean(value.dropdownOptionId);
  }
}

function buildCustomFieldCreateInput(
  registerId: string,
  definition: { id: string; fieldType: CustomFieldType },
  value: RiskCustomFieldValueBody
): Prisma.RiskCustomFieldValueCreateManyRiskInput {
  return {
    registerId,
    customFieldDefinitionId: definition.id,
    textValue:
      definition.fieldType === "TEXT" || definition.fieldType === "MULTILINE_TEXT"
        ? value.textValue
        : undefined,
    numberValue: definition.fieldType === "NUMBER" ? value.numberValue : undefined,
    booleanValue: definition.fieldType === "BOOLEAN" ? value.booleanValue : undefined,
    dateValue: definition.fieldType === "DATE" ? value.dateValue : undefined,
    personUserId: definition.fieldType === "PERSON_PICKER" ? value.personUserId : undefined,
    dropdownOptionId: definition.fieldType === "DROPDOWN" ? value.dropdownOptionId : undefined
  };
}

type ExistingCustomFieldValue = Prisma.RiskCustomFieldValueGetPayload<{
  select: {
    customFieldDefinitionId: true;
    textValue: true;
    numberValue: true;
    booleanValue: true;
    dateValue: true;
    personUserId: true;
    dropdownOptionId: true;
  };
}>;

function dateValuesMatch(input: Date | undefined, existing: Date | null) {
  return Boolean(input && existing && toDateOnlyString(input) === toDateOnlyString(existing));
}

function customFieldValueMatchesExisting(
  fieldType: CustomFieldType,
  value: RiskCustomFieldValueBody,
  existing: ExistingCustomFieldValue | undefined
) {
  if (!existing) {
    return false;
  }

  switch (fieldType) {
    case "TEXT":
    case "MULTILINE_TEXT":
      return value.textValue === existing.textValue;
    case "NUMBER":
      return (
        value.numberValue !== undefined &&
        existing.numberValue !== null &&
        new Prisma.Decimal(value.numberValue).equals(existing.numberValue)
      );
    case "BOOLEAN":
      return value.booleanValue === existing.booleanValue;
    case "DATE":
      return dateValuesMatch(value.dateValue, existing.dateValue);
    case "PERSON_PICKER":
      return Boolean(value.personUserId && value.personUserId === existing.personUserId);
    case "DROPDOWN":
      return Boolean(value.dropdownOptionId && value.dropdownOptionId === existing.dropdownOptionId);
  }
}

function mergeExistingAndInputValues(
  existingValuesByDefinitionId: Map<string, ExistingCustomFieldValue>,
  inputValuesByDefinitionId: Map<string, RiskCustomFieldValueBody>
) {
  const merged = new Map<string, RiskCustomFieldValueBody | ExistingCustomFieldValue>();
  for (const existing of existingValuesByDefinitionId.values()) {
    merged.set(existing.customFieldDefinitionId, existing);
  }
  for (const [definitionId, value] of inputValuesByDefinitionId.entries()) {
    merged.set(definitionId, value);
  }
  return merged;
}

export async function validateCustomFieldValues(
  registerId: string,
  values: RiskCustomFieldValueBody[],
  client: CustomFieldClient = prisma,
  options: { riskId?: string } = {}
) {
  const existingValues = options.riskId
    ? await client.riskCustomFieldValue.findMany({
        where: { registerId, riskId: options.riskId },
        select: {
          customFieldDefinitionId: true,
          textValue: true,
          numberValue: true,
          booleanValue: true,
          dateValue: true,
          personUserId: true,
          dropdownOptionId: true
        }
      })
    : [];
  const existingValuesByDefinitionId = new Map(
    existingValues.map((value) => [value.customFieldDefinitionId, value])
  );
  const definitions = await client.customFieldDefinition.findMany({
    where: {
      registerId,
      OR: [{ isActive: true }, { id: { in: [...existingValuesByDefinitionId.keys()] } }]
    },
    select: { id: true, fieldName: true, fieldType: true, isRequired: true, isActive: true }
  });
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const valuesByDefinitionId = new Map<string, RiskCustomFieldValueBody>();
  const fields: Record<string, string> = {};

  values.forEach((value, index) => {
    if (valuesByDefinitionId.has(value.customFieldDefinitionId)) {
      fields[`customFieldValues.${index}.customFieldDefinitionId`] =
        "Custom field value was provided more than once";
    }
    valuesByDefinitionId.set(value.customFieldDefinitionId, value);

    const definition = definitionsById.get(value.customFieldDefinitionId);
    if (!definition) {
      fields[`customFieldValues.${index}.customFieldDefinitionId`] =
        "Custom field must exist and be active for this register";
      return;
    }

    if (
      !definition.isActive &&
      !customFieldValueMatchesExisting(
        definition.fieldType,
        value,
        existingValuesByDefinitionId.get(value.customFieldDefinitionId)
      )
    ) {
      fields[`customFieldValues.${index}.customFieldDefinitionId`] =
        "Inactive custom field values can only be retained on the existing risk";
      return;
    }

    if (countProvidedValues(value) > 1) {
      fields[`customFieldValues.${index}`] = "Provide only the value matching the custom field type";
      return;
    }

    if (countProvidedValues(value) > 0 && !hasValueForType(definition.fieldType, value)) {
      fields[`customFieldValues.${index}`] = `Value must match ${definition.fieldType}`;
    }
  });

  const mergedValuesByDefinitionId = mergeExistingAndInputValues(
    existingValuesByDefinitionId,
    valuesByDefinitionId
  );

  definitions
    .filter((definition) => definition.isActive && definition.isRequired)
    .forEach((definition) => {
      const value = mergedValuesByDefinitionId.get(definition.id);
      if (!hasValueForType(definition.fieldType, value)) {
        fields[`customFields.${definition.id}`] = `${definition.fieldName} is required`;
      }
    });

  const personUserIds = values.flatMap((value) => {
    if (!value.personUserId) {
      return [];
    }

    const definition = definitionsById.get(value.customFieldDefinitionId);
    const existing = existingValuesByDefinitionId.get(value.customFieldDefinitionId);
    if (definition && customFieldValueMatchesExisting(definition.fieldType, value, existing)) {
      return [];
    }

    return [value.personUserId];
  });
  const uniquePersonUserIds = [...new Set(personUserIds)];
  if (uniquePersonUserIds.length > 0) {
    const activeUsers = await client.user.count({
      where: { id: { in: uniquePersonUserIds }, isActive: true }
    });
    if (activeUsers !== uniquePersonUserIds.length) {
      fields.personUserId = "Person picker values must reference active local users";
    }
  }

  const dropdownOptionIds = values.flatMap((value) => {
    if (!value.dropdownOptionId) {
      return [];
    }

    const definition = definitionsById.get(value.customFieldDefinitionId);
    const existing = existingValuesByDefinitionId.get(value.customFieldDefinitionId);
    if (definition && customFieldValueMatchesExisting(definition.fieldType, value, existing)) {
      return [];
    }

    return [value.dropdownOptionId];
  });
  const uniqueDropdownOptionIds = [...new Set(dropdownOptionIds)];
  if (uniqueDropdownOptionIds.length > 0) {
    const activeOptions = await client.customFieldOption.findMany({
      where: {
        id: { in: uniqueDropdownOptionIds },
        isActive: true,
        customFieldDefinition: { registerId, isActive: true }
      },
      select: { id: true, customFieldDefinitionId: true }
    });
    const activeOptionsById = new Map(activeOptions.map((option) => [option.id, option]));

    values.forEach((value, index) => {
      if (!value.dropdownOptionId) {
        return;
      }

      const definition = definitionsById.get(value.customFieldDefinitionId);
      const existing = existingValuesByDefinitionId.get(value.customFieldDefinitionId);
      if (definition && customFieldValueMatchesExisting(definition.fieldType, value, existing)) {
        return;
      }

      const option = activeOptionsById.get(value.dropdownOptionId);
      if (!option || option.customFieldDefinitionId !== value.customFieldDefinitionId) {
        fields[`customFieldValues.${index}.dropdownOptionId`] =
          "Dropdown value must reference an active option for this custom field";
      }
    });

    if (activeOptions.length !== uniqueDropdownOptionIds.length) {
      fields.dropdownOptionId = "Dropdown values must reference active options for this register";
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Custom field values are invalid", fields);
  }

  return values
    .map((value) => {
      const definition = definitionsById.get(value.customFieldDefinitionId);
      if (!definition || !hasValueForType(definition.fieldType, value)) {
        return null;
      }

      return buildCustomFieldCreateInput(registerId, definition, value);
    })
    .filter(
      (value): value is Prisma.RiskCustomFieldValueCreateManyRiskInput => value !== null
    );
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
