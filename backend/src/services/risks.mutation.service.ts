import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { toDateOnlyString, decimalToNumber } from "../utils/formatters.js";
import { buildRiskDeleteSnapshot } from "../audit/snapshotBuilder.js";
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
import { utcDateOnly } from "./reviewStatus.service.js";
import type {
  CreateRiskBody,
  DeleteRiskBody,
  UpdateRiskBody
} from "../validators/risks.schemas.js";
import { validateCustomFieldValues } from "./customFieldValues.service.js";
import { formatPersonDisplay, personReferenceSelect, resolvePersonInput } from "./personReference.service.js";
import { evaluateAndStoreCalculatedFields } from "./risks.calculatedFields.service.js";
import { getRiskDetail } from "./risks.query.service.js";

type RiskClient = typeof prisma | Prisma.TransactionClient;

function auditValue(value: unknown): Prisma.InputJsonValue | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Prisma.Decimal) {
    return value.toString();
  }

  if (value === undefined) {
    return null;
  }

  return value as Prisma.InputJsonValue | null;
}

const riskAuditSelect = {
  id: true,
  displayRiskId: true,
  title: true,
  description: true,
  state: true,
  ownerUserId: true,
  ownerPersonId: true,
  ownerPerson: { select: { userId: true } },
  createdDate: true,
  likelihoodValueId: true,
  impactValueId: true,
  riskScore: true,
  riskLevelId: true,
  responseStrategyId: true,
  responseAction: true,
  nextReviewDate: true,
  lastReviewedAt: true
} satisfies Prisma.RiskSelect;

function buildRiskUpdateFieldChanges(
  previous: Prisma.RiskGetPayload<{ select: typeof riskAuditSelect }>,
  next: Prisma.RiskGetPayload<{ select: typeof riskAuditSelect }>
) {
  const fields: Array<{
    name: keyof typeof riskAuditSelect & keyof typeof previous;
    label: string;
    valueType: AuditValueType;
  }> = [
    { name: "title", label: "Risk Title", valueType: "TEXT" },
    { name: "description", label: "Risk Description", valueType: "TEXT" },
    { name: "state", label: "State", valueType: "TEXT" },
    { name: "ownerUserId", label: "Risk Owner (legacy)", valueType: "USER" },
    { name: "ownerPersonId", label: "Risk Owner", valueType: "UUID" },
    { name: "createdDate", label: "Created Date", valueType: "DATE" },
    { name: "likelihoodValueId", label: "Likelihood", valueType: "UUID" },
    { name: "impactValueId", label: "Impact", valueType: "UUID" },
    { name: "riskScore", label: "Risk Score", valueType: "NUMBER" },
    { name: "riskLevelId", label: "Risk Level", valueType: "UUID" },
    { name: "responseStrategyId", label: "Response Strategy", valueType: "UUID" },
    { name: "responseAction", label: "Risk Response Action", valueType: "TEXT" },
    { name: "nextReviewDate", label: "Next Review Date", valueType: "DATE" }
  ];

  return fields
    .filter((field) => String(previous[field.name] ?? "") !== String(next[field.name] ?? ""))
    .map((field) => ({
      fieldName: field.name,
      fieldLabel: field.label,
      previousValue: auditValue(previous[field.name]),
      newValue: auditValue(next[field.name]),
      valueType: field.valueType
    }));
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

    let resolvedOwnerUserId: string | undefined;
    let ownerPersonId: string;

    if (input.ownerUserId) {
      const owner = await tx.user.findUnique({
        where: { id: input.ownerUserId },
        select: { id: true, isActive: true }
      });
      if (!owner?.isActive) {
        throw new ApiError(400, "VALIDATION_ERROR", "Risk owner must be an active local user", {
          ownerUserId: "Risk owner must be an active local user"
        });
      }
      resolvedOwnerUserId = input.ownerUserId;
      ownerPersonId = await resolvePersonInput({ type: "user", userId: input.ownerUserId }, tx);
    } else {
      // ownerEmail path — schema guarantees one of the two is present
      ownerPersonId = await resolvePersonInput({ type: "email", email: input.ownerEmail! }, tx);
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
    const { values: customFieldValues, multiSelectEntries, warnings } = await validateCustomFieldValues(
      registerId,
      input.customFieldValues,
      tx,
      { acknowledgedWarnings: input.acknowledgedWarnings, validationEnabled: register.customFieldValidationEnabled }
    );
    if (warnings.length > 0) {
      throw new ApiError(422, "VALIDATION_WARNING", "One or more fields have warnings", undefined, warnings);
    }
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
      ...(resolvedOwnerUserId ? { owner: { connect: { id: resolvedOwnerUserId } } } : {}),
      ownerPerson: { connect: { id: ownerPersonId } },
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

    if (multiSelectEntries.length > 0) {
      await tx.riskCustomFieldMultiSelectValue.createMany({
        data: multiSelectEntries.map((entry) => ({ ...entry, riskId: risk.id }))
      });
    }

    await evaluateAndStoreCalculatedFields(risk.id, registerId, tx);

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
        summary: `Risk ${risk.displayRiskId} created: ${risk.title}`,
        metadataJson: {
          title: risk.title,
          state: risk.state,
          owner: { id: risk.owner?.id ?? "", name: risk.owner?.name ?? "" },
          likelihood: { id: risk.likelihoodValue.id, name: risk.likelihoodValue.name },
          impact: { id: risk.impactValue.id, name: risk.impactValue.name },
          riskScore: decimalToNumber(risk.riskScore),
          riskLevel: { id: risk.riskLevel.id, name: risk.riskLevel.name },
          responseStrategy: { id: risk.responseStrategy.id, name: risk.responseStrategy.name },
          responseAction: risk.responseAction ?? null,
          createdDate: toDateOnlyString(risk.createdDate),
          nextReviewDate: toDateOnlyString(risk.nextReviewDate),
          ...(input.acknowledgedWarnings ? { acknowledgedWarnings: true } : {})
        }
      },
      tx
    );

    return risk;
  });
}

export async function updateRisk(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  input: UpdateRiskBody
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.risk.findFirst({
      where: { id: riskId, registerId },
      select: riskAuditSelect
    });

    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Risk not found");
    }

    const role = await getEffectiveRegisterRole(actor, registerId, tx);
    if (role === "NONE" || role === "REGISTER_VIEWER") {
      throw new ApiError(404, "NOT_FOUND", "Risk not found");
    }
    if (role === "RISK_OWNER" && existing.ownerUserId !== actor.id && existing.ownerPerson?.userId !== actor.id) {
      throw new ApiError(404, "NOT_FOUND", "Risk not found");
    }
    if (role === "RISK_OWNER" && input.createdDate !== undefined) {
      throw new ApiError(403, "FORBIDDEN", "Risk Owners cannot edit Created Date");
    }

    const register = await tx.register.findUnique({
      where: { id: registerId },
      select: { reviewsEnabled: true, defaultReviewFrequencyMonths: true, customFieldValidationEnabled: true }
    });
    if (!register) {
      throw new ApiError(404, "NOT_FOUND", "Register not found");
    }

    let newOwnerPersonId: string | undefined;
    let newOwnerUserId: string | null | undefined; // undefined = no change

    if (input.ownerUserId) {
      const owner = await tx.user.findUnique({
        where: { id: input.ownerUserId },
        select: { id: true, isActive: true }
      });
      if (!owner?.isActive) {
        throw new ApiError(400, "VALIDATION_ERROR", "Risk owner must be an active local user", {
          ownerUserId: "Risk owner must be an active local user"
        });
      }
      newOwnerUserId = input.ownerUserId;
      newOwnerPersonId = await resolvePersonInput({ type: "user", userId: input.ownerUserId }, tx);
    } else if (input.ownerEmail) {
      newOwnerUserId = null; // clear the user link; owner is now an unresolved person
      newOwnerPersonId = await resolvePersonInput({ type: "email", email: input.ownerEmail }, tx);
    }

    // Guard: must not end up with both ownerUserId and ownerPersonId null
    const resultingOwnerUserId = newOwnerUserId !== undefined ? newOwnerUserId : existing.ownerUserId;
    const resultingOwnerPersonId = newOwnerPersonId !== undefined ? newOwnerPersonId : existing.ownerPersonId;
    if (resultingOwnerUserId === null && resultingOwnerPersonId === null) {
      throw new ApiError(400, "VALIDATION_ERROR", "A risk must have an owner", {
        ownerUserId: "A risk must have an owner"
      });
    }

    if (input.responseStrategyId) {
      const responseStrategy = await tx.responseStrategy.findFirst({
        where: { id: input.responseStrategyId, registerId, isActive: true },
        select: { id: true }
      });
      if (!responseStrategy) {
        throw new ApiError(400, "VALIDATION_ERROR", "Response strategy must be active for this register", {
          responseStrategyId: "Response strategy must be active for this register"
        });
      }
    }

    const likelihoodValueId = input.likelihoodValueId ?? existing.likelihoodValueId;
    const impactValueId = input.impactValueId ?? existing.impactValueId;
    const scoring =
      input.likelihoodValueId || input.impactValueId
        ? await resolveRiskScoring({ registerId, likelihoodValueId, impactValueId }, tx, riskId)
        : undefined;
    const createdDate = input.createdDate ? utcDateOnly(input.createdDate) : existing.createdDate;
    const shouldRecalculateNextReviewDate =
      input.createdDate !== undefined &&
      existing.lastReviewedAt === null &&
      utcDateOnly(input.createdDate).getTime() !== existing.createdDate.getTime();

    let customFieldValues: Awaited<ReturnType<typeof validateCustomFieldValues>>["values"] | undefined;
    let multiSelectEntries: Awaited<ReturnType<typeof validateCustomFieldValues>>["multiSelectEntries"] | undefined;
    if (input.customFieldValues !== undefined) {
      const result = await validateCustomFieldValues(registerId, input.customFieldValues, tx, {
        riskId,
        acknowledgedWarnings: input.acknowledgedWarnings,
        validationEnabled: register.customFieldValidationEnabled
      });
      if (result.warnings.length > 0) {
        throw new ApiError(422, "VALIDATION_WARNING", "One or more fields have warnings", undefined, result.warnings);
      }
      customFieldValues = result.values;
      multiSelectEntries = result.multiSelectEntries;
    }

    if (customFieldValues !== undefined || multiSelectEntries !== undefined) {
      const fieldIds = input.customFieldValues?.map((v) => v.customFieldDefinitionId) ?? [];
      await tx.riskCustomFieldValue.deleteMany({
        where: { riskId, customFieldDefinitionId: { in: fieldIds } }
      });
      await tx.riskCustomFieldMultiSelectValue.deleteMany({
        where: { riskId, customFieldDefinitionId: { in: fieldIds } }
      });
    }

    const updated = await tx.risk.update({
      where: { id: riskId },
      data: {
        title: input.title,
        description: input.description,
        state: input.state,
        ownerUserId: newOwnerUserId,
        ownerPersonId: newOwnerPersonId,
        createdDate: input.createdDate ? createdDate : undefined,
        likelihoodValueId: input.likelihoodValueId,
        impactValueId: input.impactValueId,
        riskScore: scoring?.riskScore,
        riskLevelId: scoring?.riskLevelId,
        responseStrategyId: input.responseStrategyId,
        responseAction: input.responseAction,
        nextReviewDate: shouldRecalculateNextReviewDate
          ? calculateNextReviewDate({
              reviewsEnabled: register.reviewsEnabled,
              baseDate: createdDate,
              defaultReviewFrequencyMonths: register.defaultReviewFrequencyMonths
            })
          : undefined,
        systemUpdatedByUserId: actor.id,
        customFieldValues:
          customFieldValues && customFieldValues.length > 0
            ? { createMany: { data: customFieldValues } }
            : undefined
      },
      select: riskAuditSelect
    });

    if (multiSelectEntries && multiSelectEntries.length > 0) {
      await tx.riskCustomFieldMultiSelectValue.createMany({
        data: multiSelectEntries.map((entry) => ({ ...entry, riskId: updated.id }))
      });
    }

    await evaluateAndStoreCalculatedFields(updated.id, registerId, tx);

    await recordAuditEvent(
      {
        action: auditActions.riskUpdated,
        actor,
        objectType: "RISK",
        objectId: updated.id,
        objectDisplayName: updated.displayRiskId,
        scopeType: "RISK",
        registerId,
        riskId: updated.id,
        displayRiskId: updated.displayRiskId,
        summary: "Risk updated",
        fieldChanges: buildRiskUpdateFieldChanges(existing, updated),
        ...(input.acknowledgedWarnings ? { metadataJson: { acknowledgedWarnings: true } } : {})
      },
      tx
    );

    return getRiskDetail(actor, registerId, riskId);
  });
}

export async function deleteRisk(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  input: DeleteRiskBody
) {
  if (!actor.isSystemAdmin) {
    throw new ApiError(403, "FORBIDDEN", "System Admin permission is required");
  }

  return prisma.$transaction(async (tx) => {
    const risk = await tx.risk.findFirst({
      where: { id: riskId, registerId },
      include: {
        register: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true, isActive: true } },
        likelihoodValue: true,
        impactValue: true,
        riskLevel: true,
        responseStrategy: true,
        lastReviewedBy: { select: { id: true, name: true, email: true } },
        systemCreatedBy: { select: { id: true, name: true, email: true } },
        systemUpdatedBy: { select: { id: true, name: true, email: true } },
        customFieldValues: {
          include: {
            customFieldDefinition: true,
            dropdownOption: true,
            personUser: { select: { id: true, name: true, email: true, isActive: true } },
            person: { select: personReferenceSelect }
          }
        },
        reviews: {
          include: {
            reviewedBy: { select: { id: true, name: true, email: true } }
          },
          orderBy: { reviewedAt: "asc" }
        }
      }
    });

    if (!risk) {
      throw new ApiError(404, "NOT_FOUND", "Risk not found");
    }

    const snapshotJson = buildRiskDeleteSnapshot(risk, actor, input.deletionReason);
    const auditEvent = await recordAuditEvent(
      {
        action: auditActions.riskDeleted,
        actor,
        objectType: "RISK",
        objectId: risk.id,
        objectDisplayName: risk.displayRiskId,
        scopeType: "RISK",
        registerId,
        riskId: risk.id,
        displayRiskId: risk.displayRiskId,
        summary: "Risk deleted",
        metadataJson: {
          deletionReason: input.deletionReason ?? null
        }
      },
      tx
    );

    await tx.auditRiskSnapshot.create({
      data: {
        auditEventId: auditEvent.id,
        riskInternalId: risk.id,
        registerId,
        displayRiskId: risk.displayRiskId,
        snapshotJson,
        deletionReason: input.deletionReason
      }
    });

    await tx.risk.delete({ where: { id: risk.id } });

    return { id: risk.id, displayRiskId: risk.displayRiskId, deleted: true };
  });
}
