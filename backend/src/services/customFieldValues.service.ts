import { CustomFieldType, Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { RiskCustomFieldValueBody } from "../validators/risks.schemas.js";
import { resolvePersonInput, upsertPersonReference } from "./personReference.service.js";

export type CustomFieldClient = typeof prisma | Prisma.TransactionClient;

type ExistingCustomFieldValue = Prisma.RiskCustomFieldValueGetPayload<{
  select: {
    customFieldDefinitionId: true;
    textValue: true;
    numberValue: true;
    booleanValue: true;
    dateValue: true;
    personUserId: true;
    personId: true;
    dropdownOptionId: true;
    person: { select: { email: true } };
  };
}>;

function toDateOnlyString(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function countProvidedValues(value: RiskCustomFieldValueBody) {
  return [
    value.textValue,
    value.numberValue,
    value.booleanValue,
    value.dateValue,
    value.personUserId ?? value.personEmail,
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
      return Boolean(value.personUserId) || ("personEmail" in value && Boolean((value as RiskCustomFieldValueBody).personEmail));
    case "DROPDOWN":
      return Boolean(value.dropdownOptionId);
  }
}

function buildCustomFieldCreateInput(
  registerId: string,
  definition: { id: string; fieldType: CustomFieldType },
  value: RiskCustomFieldValueBody,
  resolvedPersonId?: string
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
    personId: definition.fieldType === "PERSON_PICKER" ? resolvedPersonId : undefined,
    dropdownOptionId: definition.fieldType === "DROPDOWN" ? value.dropdownOptionId : undefined
  };
}

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
      // New-style record (personId set): compare submitted email against PersonReference email
      if (existing.person) {
        const submittedEmail = ("personEmail" in value ? (value as RiskCustomFieldValueBody).personEmail : undefined)
          ?? undefined;
        return submittedEmail !== undefined && submittedEmail.toLowerCase() === existing.person.email;
      }
      // Old-style MVP record: compare personUserId directly
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
          personId: true,
          dropdownOptionId: true,
          person: { select: { email: true } }
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

  // Validate personUserId values (must be active local users)
  const personUserIds = values.flatMap((value) => {
    if (!value.personUserId) return [];
    const definition = definitionsById.get(value.customFieldDefinitionId);
    const existing = existingValuesByDefinitionId.get(value.customFieldDefinitionId);
    if (definition && customFieldValueMatchesExisting(definition.fieldType, value, existing)) return [];
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

  // Validate personEmail values (email format already enforced by Zod)
  values.forEach((value, i) => {
    if (!value.personEmail) return;
    const definition = definitionsById.get(value.customFieldDefinitionId);
    if (!definition || definition.fieldType !== "PERSON_PICKER") return;
    if (value.personUserId) {
      fields[`customFieldValues.${i}`] = "Provide either personUserId or personEmail, not both";
    }
  });

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

  // Resolve PersonReferences for all PERSON_PICKER values
  const resolvedPersonIds = new Map<string, string>();
  for (const value of values) {
    const definition = definitionsById.get(value.customFieldDefinitionId);
    if (!definition || definition.fieldType !== "PERSON_PICKER") continue;
    if (!hasValueForType(definition.fieldType, value)) continue;

    if (value.personUserId) {
      const personId = await resolvePersonInput({ type: "user", userId: value.personUserId }, client);
      resolvedPersonIds.set(value.customFieldDefinitionId, personId);
    } else if (value.personEmail) {
      const personId = await upsertPersonReference(value.personEmail, undefined, client);
      resolvedPersonIds.set(value.customFieldDefinitionId, personId);
    }
  }

  return values
    .map((value) => {
      const definition = definitionsById.get(value.customFieldDefinitionId);
      if (!definition || !hasValueForType(definition.fieldType, value)) {
        return null;
      }

      return buildCustomFieldCreateInput(
        registerId,
        definition,
        value,
        resolvedPersonIds.get(value.customFieldDefinitionId)
      );
    })
    .filter(
      (value): value is Prisma.RiskCustomFieldValueCreateManyRiskInput => value !== null
    );
}
