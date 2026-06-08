import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateLikelihoodValueBody,
  UpdateLikelihoodValueBody
} from "../validators/scoringConfig.schemas.js";
import { buildFieldChanges } from "./audit.service.js";
import { createScoringValueCrud } from "./scoringValueCrud.helper.js";

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

const likelihoodValueCrud = createScoringValueCrud({
  notFoundMessage: "Likelihood value not found",
  duplicateErrorMapper: mapLikelihoodPrismaError,
  activeEntityLabel: "likelihood value",
  activeEntityFieldError: "Cannot deactivate the final active likelihood value",
  findMany: (registerId) =>
    prisma.likelihoodValue.findMany({
      where: { registerId },
      orderBy: { displayOrder: "asc" }
    }),
  findOne: (registerId, likelihoodId) =>
    prisma.likelihoodValue.findFirst({
      where: { id: likelihoodId, registerId }
    }),
  countActive: (registerId, excludeId) =>
    prisma.likelihoodValue.count({
      where: {
        registerId,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined
      }
    }),
  createValue: (tx, registerId, input: CreateLikelihoodValueBody) =>
    tx.likelihoodValue.create({
      data: {
        registerId,
        name: input.name,
        numericValue: input.numericValue,
        displayOrder: input.displayOrder,
        isActive: input.isActive
      }
    }),
  updateValue: (tx, likelihoodId, input: UpdateLikelihoodValueBody) =>
    tx.likelihoodValue.update({
      where: { id: likelihoodId },
      data: {
        name: input.name,
        numericValue: input.numericValue,
        displayOrder: input.displayOrder,
        isActive: input.isActive
      }
    }),
  deactivateValue: (tx, likelihoodId) =>
    tx.likelihoodValue.update({
      where: { id: likelihoodId },
      data: { isActive: false }
    }),
  buildCreatedAuditEvent: (actor, registerId, value) => ({
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
  }),
  buildUpdatedAuditEvent: (actor, registerId, existing, updated) => ({
    action: auditActions.likelihoodValueUpdated,
    actor,
    objectType: "LIKELIHOOD_VALUE",
    objectId: updated.id,
    objectDisplayName: updated.name,
    scopeType: "REGISTER",
    registerId,
    summary: "Likelihood value updated",
    fieldChanges: buildFieldChanges(existing, updated, likelihoodAuditFields)
  }),
  buildDeactivatedAuditEvent: (actor, registerId, existing, updated) => ({
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
  })
});

export async function listLikelihoodValues(registerId: string) {
  return likelihoodValueCrud.list(registerId);
}

export async function createLikelihoodValue(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateLikelihoodValueBody
) {
  return likelihoodValueCrud.create(actor, registerId, input);
}

export async function updateLikelihoodValue(
  actor: AuthenticatedActor,
  registerId: string,
  likelihoodId: string,
  input: UpdateLikelihoodValueBody
) {
  return likelihoodValueCrud.update(actor, registerId, likelihoodId, input);
}

export async function deactivateLikelihoodValue(
  actor: AuthenticatedActor,
  registerId: string,
  likelihoodId: string
) {
  return likelihoodValueCrud.deactivate(actor, registerId, likelihoodId);
}
