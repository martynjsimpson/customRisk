import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type {
  CreateRiskLevelBody,
  UpdateRiskLevelBody
} from "../validators/scoringConfig.schemas.js";
import { buildFieldChanges } from "./audit.service.js";
import { createScoringValueCrud } from "./scoringValueCrud.helper.js";

const riskLevelAuditFields = [
  { name: "name", label: "Name", valueType: "TEXT" },
  { name: "description", label: "Description", valueType: "TEXT" },
  { name: "color", label: "Color", valueType: "TEXT" },
  { name: "displayOrder", label: "Display order", valueType: "NUMBER" },
  { name: "isActive", label: "Active", valueType: "BOOLEAN" }
] satisfies Array<{ name: "name" | "description" | "color" | "displayOrder" | "isActive"; label: string; valueType: AuditValueType }>;

function mapRiskLevelPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "A risk level with this name or display order already exists");
  }

  throw error;
}

const riskLevelCrud = createScoringValueCrud({
  notFoundMessage: "Risk level not found",
  duplicateErrorMapper: mapRiskLevelPrismaError,
  activeEntityLabel: "risk level",
  activeEntityFieldError: "Cannot deactivate the final active risk level",
  findMany: (registerId) =>
    prisma.riskLevel.findMany({
      where: { registerId },
      orderBy: { displayOrder: "asc" }
    }),
  findOne: (registerId, riskLevelId) =>
    prisma.riskLevel.findFirst({
      where: { id: riskLevelId, registerId }
    }),
  countActive: (registerId, excludeId) =>
    prisma.riskLevel.count({
      where: {
        registerId,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined
      }
    }),
  createValue: (tx, registerId, input: CreateRiskLevelBody) =>
    tx.riskLevel.create({
      data: {
        registerId,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? null,
        displayOrder: input.displayOrder,
        isActive: input.isActive
      }
    }),
  updateValue: (tx, riskLevelId, input: UpdateRiskLevelBody) =>
    tx.riskLevel.update({
      where: { id: riskLevelId },
      data: {
        name: input.name,
        description: input.description,
        color: input.color,
        displayOrder: input.displayOrder,
        isActive: input.isActive
      }
    }),
  deactivateValue: (tx, riskLevelId) =>
    tx.riskLevel.update({
      where: { id: riskLevelId },
      data: { isActive: false }
    }),
  buildCreatedAuditEvent: (actor, registerId, value) => ({
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
  }),
  buildUpdatedAuditEvent: (actor, registerId, existing, updated) => ({
    action: auditActions.riskLevelUpdated,
    actor,
    objectType: "RISK_LEVEL",
    objectId: updated.id,
    objectDisplayName: updated.name,
    scopeType: "REGISTER",
    registerId,
    summary: "Risk level updated",
    fieldChanges: buildFieldChanges(existing, updated, riskLevelAuditFields)
  }),
  buildDeactivatedAuditEvent: (actor, registerId, existing, updated) => ({
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
  })
});

export async function listRiskLevels(registerId: string) {
  return riskLevelCrud.list(registerId);
}

export async function createRiskLevel(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateRiskLevelBody
) {
  return riskLevelCrud.create(actor, registerId, input);
}

export async function updateRiskLevel(
  actor: AuthenticatedActor,
  registerId: string,
  riskLevelId: string,
  input: UpdateRiskLevelBody
) {
  return riskLevelCrud.update(actor, registerId, riskLevelId, input);
}

export async function deactivateRiskLevel(
  actor: AuthenticatedActor,
  registerId: string,
  riskLevelId: string
) {
  return riskLevelCrud.deactivate(actor, registerId, riskLevelId);
}
