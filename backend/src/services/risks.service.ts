import { CustomFieldType, Prisma } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { getEffectiveRegisterRole } from "../permissions/registerAccess.js";
import {
  createRiskRecord,
  reserveNextRiskId
} from "../repositories/risks.repository.js";
import type { AuthenticatedActor } from "../types/express.js";
import { calculateNextReviewDate, resolveRiskScoring } from "./scoring.service.js";
import { recordAuditEvent } from "./audit.service.js";
import type {
  CreateRiskBody,
  RiskCustomFieldValueBody
} from "../validators/risks.schemas.js";

type RiskClient = typeof prisma | Prisma.TransactionClient;

function utcDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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
  value: RiskCustomFieldValueBody | undefined
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

export async function validateCustomFieldValues(
  registerId: string,
  values: RiskCustomFieldValueBody[],
  client: RiskClient = prisma
) {
  const definitions = await client.customFieldDefinition.findMany({
    where: { registerId, isActive: true },
    select: { id: true, fieldName: true, fieldType: true, isRequired: true }
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

    if (countProvidedValues(value) > 1) {
      fields[`customFieldValues.${index}`] = "Provide only the value matching the custom field type";
      return;
    }

    if (!hasValueForType(definition.fieldType, value)) {
      fields[`customFieldValues.${index}`] = `Value must match ${definition.fieldType}`;
    }
  });

  definitions
    .filter((definition) => definition.isRequired)
    .forEach((definition) => {
      const value = valuesByDefinitionId.get(definition.id);
      if (!hasValueForType(definition.fieldType, value)) {
        fields[`customFields.${definition.id}`] = `${definition.fieldName} is required`;
      }
    });

  const personUserIds = values
    .map((value) => value.personUserId)
    .filter((id): id is string => Boolean(id));
  if (personUserIds.length > 0) {
    const activeUsers = await client.user.count({
      where: { id: { in: [...new Set(personUserIds)] }, isActive: true }
    });
    if (activeUsers !== new Set(personUserIds).size) {
      fields.personUserId = "Person picker values must reference active local users";
    }
  }

  const dropdownOptionIds = values
    .map((value) => value.dropdownOptionId)
    .filter((id): id is string => Boolean(id));
  if (dropdownOptionIds.length > 0) {
    const activeOptions = await client.customFieldOption.findMany({
      where: {
        id: { in: [...new Set(dropdownOptionIds)] },
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

      const option = activeOptionsById.get(value.dropdownOptionId);
      if (!option || option.customFieldDefinitionId !== value.customFieldDefinitionId) {
        fields[`customFieldValues.${index}.dropdownOptionId`] =
          "Dropdown value must reference an active option for this custom field";
      }
    });

    if (activeOptions.length !== new Set(dropdownOptionIds).size) {
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

async function assertCreateRiskAccess(
  actor: AuthenticatedActor,
  registerId: string,
  client: RiskClient
) {
  if (actor.isSystemAdmin) {
    return;
  }

  const role = await getEffectiveRegisterRole(actor, registerId, client);
  if (role !== "REGISTER_ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Only System Admins and Register Admins can create risks");
  }
}

export async function createRisk(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateRiskBody
) {
  return prisma.$transaction(async (tx) => {
    await assertCreateRiskAccess(actor, registerId, tx);

    const owner = await tx.user.findUnique({
      where: { id: input.ownerUserId },
      select: { id: true, isActive: true }
    });
    if (!owner?.isActive) {
      throw new ApiError(400, "VALIDATION_ERROR", "Risk owner must be an active local user", {
        ownerUserId: "Risk owner must be an active local user"
      });
    }

    const responseStrategy = await tx.responseStrategy.findFirst({
      where: { id: input.responseStrategyId, registerId, isActive: true },
      select: { id: true }
    });
    if (!responseStrategy) {
      throw new ApiError(400, "VALIDATION_ERROR", "Response strategy must be active for this register", {
        responseStrategyId: "Response strategy must be active for this register"
      });
    }

    const { register, riskSequence, displayRiskId } = await reserveNextRiskId(tx, registerId);
    const createdDate = input.createdDate ? utcDateOnly(input.createdDate) : utcDateOnly(new Date());
    const scoring = await resolveRiskScoring(
      {
        registerId,
        likelihoodValueId: input.likelihoodValueId,
        impactValueId: input.impactValueId
      },
      tx
    );
    const customFieldValues = await validateCustomFieldValues(
      registerId,
      input.customFieldValues,
      tx
    );
    const nextReviewDate = calculateNextReviewDate({
      reviewsEnabled: register.reviewsEnabled,
      baseDate: createdDate,
      defaultReviewFrequencyMonths: register.defaultReviewFrequencyMonths
    });

    const risk = await createRiskRecord(tx, {
      register: { connect: { id: registerId } },
      displayRiskId,
      riskSequence,
      title: input.title,
      description: input.description,
      state: input.state ?? register.defaultNewRiskState,
      owner: { connect: { id: input.ownerUserId } },
      createdDate,
      likelihoodValue: { connect: { id: input.likelihoodValueId } },
      impactValue: { connect: { id: input.impactValueId } },
      riskScore: scoring.riskScore,
      riskLevel: { connect: { id: scoring.riskLevelId } },
      responseStrategy: { connect: { id: input.responseStrategyId } },
      responseAction: input.responseAction,
      nextReviewDate,
      systemCreatedBy: { connect: { id: actor.id } },
      systemUpdatedBy: { connect: { id: actor.id } },
      customFieldValues:
        customFieldValues.length > 0
          ? { createMany: { data: customFieldValues } }
          : undefined
    });

    await recordAuditEvent(
      {
        action: auditActions.riskCreated,
        actor,
        objectType: "RISK",
        objectId: risk.id,
        objectDisplayName: risk.displayRiskId,
        scopeType: "RISK",
        registerId,
        riskId: risk.id,
        displayRiskId: risk.displayRiskId,
        summary: "Risk created"
      },
      tx
    );

    return risk;
  });
}
