import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateImpactValueBody,
  UpdateImpactValueBody
} from "../validators/scoringConfig.schemas.js";
import { buildFieldChanges } from "./audit.service.js";
import { createScoringValueCrud } from "./scoringValueCrud.helper.js";

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

const impactValueCrud = createScoringValueCrud({
  notFoundMessage: "Impact value not found",
  duplicateErrorMapper: mapImpactPrismaError,
  activeEntityLabel: "impact value",
  activeEntityFieldError: "Cannot deactivate the final active impact value",
  findMany: (registerId) =>
    prisma.impactValue.findMany({
      where: { registerId },
      orderBy: { displayOrder: "asc" }
    }),
  findOne: (registerId, impactId) =>
    prisma.impactValue.findFirst({
      where: { id: impactId, registerId }
    }),
  countActive: (registerId, excludeId) =>
    prisma.impactValue.count({
      where: {
        registerId,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined
      }
    }),
  createValue: (tx, registerId, input: CreateImpactValueBody) =>
    tx.impactValue.create({
      data: {
        registerId,
        name: input.name,
        numericValue: input.numericValue,
        displayOrder: input.displayOrder,
        isActive: input.isActive
      }
    }),
  updateValue: (tx, impactId, input: UpdateImpactValueBody) =>
    tx.impactValue.update({
      where: { id: impactId },
      data: {
        name: input.name,
        numericValue: input.numericValue,
        displayOrder: input.displayOrder,
        isActive: input.isActive
      }
    }),
  deactivateValue: (tx, impactId) =>
    tx.impactValue.update({
      where: { id: impactId },
      data: { isActive: false }
    }),
  buildCreatedAuditEvent: (actor, registerId, value) => ({
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
  }),
  buildUpdatedAuditEvent: (actor, registerId, existing, updated) => ({
    action: auditActions.impactValueUpdated,
    actor,
    objectType: "IMPACT_VALUE",
    objectId: updated.id,
    objectDisplayName: updated.name,
    scopeType: "REGISTER",
    registerId,
    summary: "Impact value updated",
    fieldChanges: buildFieldChanges(existing, updated, impactAuditFields)
  }),
  buildDeactivatedAuditEvent: (actor, registerId, existing, updated) => ({
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
  })
});

export async function listImpactValues(registerId: string) {
  return impactValueCrud.list(registerId);
}

export async function createImpactValue(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateImpactValueBody
) {
  return impactValueCrud.create(actor, registerId, input);
}

export async function updateImpactValue(
  actor: AuthenticatedActor,
  registerId: string,
  impactId: string,
  input: UpdateImpactValueBody
) {
  return impactValueCrud.update(actor, registerId, impactId, input);
}

export async function deactivateImpactValue(
  actor: AuthenticatedActor,
  registerId: string,
  impactId: string
) {
  return impactValueCrud.deactivate(actor, registerId, impactId);
}
