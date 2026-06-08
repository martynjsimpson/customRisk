import { Prisma, type AuditValueType } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
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
import {
  getDueSoonLimit,
  getRiskReviewStatus,
  isRiskOverdue,
  utcDateOnly
} from "./reviewStatus.service.js";
import type {
  CreateRiskBody,
  DeleteRiskBody,
  ListRisksQuery,
  UpdateRiskBody
} from "../validators/risks.schemas.js";
import { validateCustomFieldValues } from "./customFieldValues.service.js";
import { formatPersonDisplay, personReferenceSelect, resolvePersonInput } from "./personReference.service.js";

type RiskClient = typeof prisma | Prisma.TransactionClient;

function toDateOnlyString(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function decimalToNumber(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toNumber();
}
export { getRiskReviewStatus, isRiskOverdue } from "./reviewStatus.service.js";

function buildRiskOrderBy(query: ListRisksQuery): Prisma.RiskOrderByWithRelationInput[] {
  const direction = query.sortDir;

  switch (query.sortBy) {
    case "title":
      return [{ title: direction }, { riskSequence: "asc" }];
    case "state":
      return [{ state: direction }, { riskSequence: "asc" }];
    case "owner":
      return [{ owner: { name: direction } }, { riskSequence: "asc" }];
    case "riskScore":
      return [{ riskScore: direction }, { riskSequence: "asc" }];
    case "riskLevel":
      return [{ riskLevel: { displayOrder: direction } }, { riskSequence: "asc" }];
    case "nextReviewDate":
      return [{ nextReviewDate: direction }, { riskSequence: "asc" }];
    case "systemUpdatedAt":
      return [{ systemUpdatedAt: direction }, { riskSequence: "asc" }];
    case "riskId":
    default:
      return [{ riskSequence: direction }];
  }
}

function applyReviewFilters(where: Prisma.RiskWhereInput, query: ListRisksQuery, reviewsEnabled: boolean) {
  const today = utcDateOnly(new Date());
  const dueSoonLimit = getDueSoonLimit(today);

  if (!reviewsEnabled && (query.overdue || query.dueForReview)) {
    where.id = "__no_risks_when_reviews_disabled__";
    return;
  }

  if (query.overdue) {
    where.nextReviewDate = { lt: today };
  } else if (query.dueForReview) {
    where.nextReviewDate = { lte: dueSoonLimit };
  }

  if (!query.reviewStatus) {
    return;
  }

  if (query.reviewStatus === "NOT_REQUIRED") {
    where.id = reviewsEnabled ? "__no_risks_when_reviews_enabled__" : where.id;
    return;
  }

  if (!reviewsEnabled) {
    where.id = "__no_risks_when_reviews_disabled__";
    return;
  }

  if (query.reviewStatus === "NOT_REVIEWED") {
    where.lastReviewedAt = null;
    return;
  }

  where.lastReviewedAt = { not: null };

  if (query.reviewStatus === "OVERDUE") {
    where.nextReviewDate = { lt: today };
  } else if (query.reviewStatus === "DUE_SOON") {
    where.nextReviewDate = { gte: today, lte: dueSoonLimit };
  } else if (query.reviewStatus === "NOT_DUE") {
    where.OR = [
      { nextReviewDate: null },
      { nextReviewDate: { gt: dueSoonLimit } }
    ];
  }
}

const riskListInclude = {
  owner: { select: { id: true, name: true, email: true } },
  likelihoodValue: { select: { id: true, name: true } },
  impactValue: { select: { id: true, name: true } },
  riskLevel: { select: { id: true, name: true, color: true } },
  responseStrategy: { select: { id: true, name: true } },
  customFieldValues: {
    include: {
      customFieldDefinition: { select: { id: true, fieldName: true, fieldType: true, isActive: true, displayOrder: true } },
      dropdownOption: { select: { id: true, label: true } },
      personUser: { select: { id: true, name: true, email: true } },
      person: { select: personReferenceSelect }
    }
  }
} satisfies Prisma.RiskInclude;

function mapRiskListCustomFieldValue(
  value: Prisma.RiskCustomFieldValueGetPayload<{
    include: {
      customFieldDefinition: { select: { id: true; fieldName: true; fieldType: true; isActive: true; displayOrder: true } };
      dropdownOption: { select: { id: true; label: true } };
      personUser: { select: { id: true; name: true; email: true } };
      person: { select: typeof personReferenceSelect };
    };
  }>
) {
  return {
    customFieldDefinitionId: value.customFieldDefinitionId,
    fieldName: value.customFieldDefinition.fieldName,
    fieldType: value.customFieldDefinition.fieldType,
    displayOrder: value.customFieldDefinition.displayOrder,
    isActive: value.customFieldDefinition.isActive,
    textValue: value.textValue,
    numberValue: value.numberValue ? decimalToNumber(value.numberValue) : null,
    booleanValue: value.booleanValue,
    dateValue: toDateOnlyString(value.dateValue),
    personUser: value.personUser,
    person: value.person ? { displayName: formatPersonDisplay(value.person).displayName } : null,
    dropdownOption: value.dropdownOption
  };
}

function mapRiskListItem(
  risk: Prisma.RiskGetPayload<{ include: typeof riskListInclude }>,
  reviewsEnabled: boolean
) {
  const reviewStatus = getRiskReviewStatus({
    reviewsEnabled,
    lastReviewedAt: risk.lastReviewedAt,
    nextReviewDate: risk.nextReviewDate
  });

  return {
    id: risk.id,
    displayRiskId: risk.displayRiskId,
    title: risk.title,
    state: risk.state,
    owner: risk.owner,
    likelihood: risk.likelihoodValue,
    impact: risk.impactValue,
    riskScore: decimalToNumber(risk.riskScore),
    riskLevel: risk.riskLevel,
    responseStrategy: risk.responseStrategy,
    nextReviewDate: toDateOnlyString(risk.nextReviewDate),
    reviewStatus,
    isOverdue: isRiskOverdue({
      reviewsEnabled,
      nextReviewDate: risk.nextReviewDate,
      state: risk.state
    }),
    systemUpdatedAt: risk.systemUpdatedAt,
    customFieldValues: risk.customFieldValues.map(mapRiskListCustomFieldValue)
  };
}

function mapCustomFieldValue(
  value: Prisma.RiskCustomFieldValueGetPayload<{
    include: {
      customFieldDefinition: true;
      dropdownOption: true;
      personUser: { select: { id: true; name: true; email: true; isActive: true } };
      person: { select: typeof personReferenceSelect };
    };
  }>
) {
  return {
    id: value.id,
    customFieldDefinition: value.customFieldDefinition,
    textValue: value.textValue,
    numberValue: value.numberValue ? decimalToNumber(value.numberValue) : null,
    booleanValue: value.booleanValue,
    dateValue: toDateOnlyString(value.dateValue),
    person: value.person ? formatPersonDisplay(value.person) : null,
    personUser: value.personUser,
    dropdownOption: value.dropdownOption
  };
}

function mapRiskDetail(
  risk: Prisma.RiskGetPayload<{
    include: {
      owner: { select: { id: true; name: true; email: true; isActive: true } };
      ownerPerson: { select: typeof personReferenceSelect };
      likelihoodValue: true;
      impactValue: true;
      riskLevel: true;
      responseStrategy: true;
      customFieldValues: {
        include: {
          customFieldDefinition: true;
          dropdownOption: true;
          personUser: { select: { id: true; name: true; email: true; isActive: true } };
          person: { select: typeof personReferenceSelect };
        };
      };
      lastReviewedBy: { select: { id: true; name: true; email: true } };
      systemCreatedBy: { select: { id: true; name: true; email: true } };
      systemUpdatedBy: { select: { id: true; name: true; email: true } };
    };
  }>,
  reviewsEnabled: boolean
) {
  return {
    id: risk.id,
    registerId: risk.registerId,
    displayRiskId: risk.displayRiskId,
    riskSequence: risk.riskSequence,
    title: risk.title,
    description: risk.description,
    state: risk.state,
    owner: risk.owner,
    ownerPerson: risk.ownerPerson ? formatPersonDisplay(risk.ownerPerson) : null,
    createdDate: toDateOnlyString(risk.createdDate),
    likelihood: risk.likelihoodValue,
    impact: risk.impactValue,
    riskScore: decimalToNumber(risk.riskScore),
    riskLevel: risk.riskLevel,
    responseStrategy: risk.responseStrategy,
    responseAction: risk.responseAction,
    customFields: risk.customFieldValues.map(mapCustomFieldValue),
    lastReviewedAt: risk.lastReviewedAt,
    lastReviewedBy: risk.lastReviewedBy,
    nextReviewDate: toDateOnlyString(risk.nextReviewDate),
    reviewStatus: getRiskReviewStatus({
      reviewsEnabled,
      lastReviewedAt: risk.lastReviewedAt,
      nextReviewDate: risk.nextReviewDate
    }),
    isOverdue: isRiskOverdue({
      reviewsEnabled,
      nextReviewDate: risk.nextReviewDate,
      state: risk.state
    }),
    systemCreatedAt: risk.systemCreatedAt,
    systemCreatedBy: risk.systemCreatedBy,
    systemUpdatedAt: risk.systemUpdatedAt,
    systemUpdatedBy: risk.systemUpdatedBy
  };
}

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

export async function listRisks(
  actor: AuthenticatedActor,
  registerId: string,
  query: ListRisksQuery
) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true, reviewsEnabled: true }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  const role = await getEffectiveRegisterRole(actor, registerId);
  if (role === "NONE") {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  const where: Prisma.RiskWhereInput = {
    registerId,
    state: query.includeClosed ? undefined : { not: "CLOSED" },
    riskLevelId: query.riskLevelId,
    ownerUserId: query.ownerUserId,
    OR: query.search
      ? [
          { displayRiskId: { contains: query.search, mode: "insensitive" } },
          { title: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } }
        ]
      : undefined
  };

  if (query.state && query.state.length > 0) {
    where.state = query.includeClosed
      ? { in: query.state }
      : { in: query.state.filter((state) => state !== "CLOSED") };
  }

  if (role === "RISK_OWNER") {
    const searchOr = where.OR;
    where.OR = undefined;
    where.ownerUserId = undefined;
    const ownershipFilter: Prisma.RiskWhereInput = {
      OR: [
        { ownerUserId: actor.id },
        { ownerPerson: { userId: actor.id } }
      ]
    };
    where.AND = searchOr ? [ownershipFilter, { OR: searchOr }] : [ownershipFilter];
  }

  applyReviewFilters(where, query, register.reviewsEnabled);

  const [risks, total] = await Promise.all([
    prisma.risk.findMany({
      where,
      include: riskListInclude,
      orderBy: buildRiskOrderBy(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.risk.count({ where })
  ]);

  return {
    data: risks.map((risk) => mapRiskListItem(risk, register.reviewsEnabled)),
    meta: { total, page: query.page, pageSize: query.pageSize }
  };
}

export async function getRiskDetail(_actor: AuthenticatedActor, registerId: string, riskId: string) {
  const risk = await prisma.risk.findFirst({
    where: { id: riskId, registerId },
    include: {
      register: { select: { reviewsEnabled: true } },
      owner: { select: { id: true, name: true, email: true, isActive: true } },
      ownerPerson: { select: personReferenceSelect },
      likelihoodValue: true,
      impactValue: true,
      riskLevel: true,
      responseStrategy: true,
      customFieldValues: {
        include: {
          customFieldDefinition: true,
          dropdownOption: true,
          personUser: { select: { id: true, name: true, email: true, isActive: true } },
          person: { select: personReferenceSelect }
        },
        orderBy: { customFieldDefinition: { displayOrder: "asc" } }
      },
      lastReviewedBy: { select: { id: true, name: true, email: true } },
      systemCreatedBy: { select: { id: true, name: true, email: true } },
      systemUpdatedBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!risk) {
    throw new ApiError(404, "NOT_FOUND", "Risk not found");
  }

  return mapRiskDetail(risk, risk.register.reviewsEnabled);
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
      select: { reviewsEnabled: true, defaultReviewFrequencyMonths: true }
    });
    if (!register) {
      throw new ApiError(404, "NOT_FOUND", "Register not found");
    }

    let newOwnerPersonId: string | undefined;
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
      newOwnerPersonId = await resolvePersonInput({ type: "user", userId: input.ownerUserId }, tx);
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
        ? await resolveRiskScoring({ registerId, likelihoodValueId, impactValueId }, tx)
        : undefined;
    const createdDate = input.createdDate ? utcDateOnly(input.createdDate) : existing.createdDate;
    const shouldRecalculateNextReviewDate =
      input.createdDate !== undefined &&
      existing.lastReviewedAt === null &&
      utcDateOnly(input.createdDate).getTime() !== existing.createdDate.getTime();

    const customFieldValues =
      input.customFieldValues !== undefined
        ? await validateCustomFieldValues(registerId, input.customFieldValues, tx, { riskId })
        : undefined;

    if (customFieldValues !== undefined) {
      await tx.riskCustomFieldValue.deleteMany({
        where: {
          riskId,
          customFieldDefinitionId: {
            in: input.customFieldValues?.map((value) => value.customFieldDefinitionId) ?? []
          }
        }
      });
    }

    const updated = await tx.risk.update({
      where: { id: riskId },
      data: {
        title: input.title,
        description: input.description,
        state: input.state,
        ownerUserId: input.ownerUserId,
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
        fieldChanges: buildRiskUpdateFieldChanges(existing, updated)
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

    const ownerPersonId = await resolvePersonInput({ type: "user", userId: input.ownerUserId }, tx);

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
          owner: { id: risk.owner.id, name: risk.owner.name },
          likelihood: { id: risk.likelihoodValue.id, name: risk.likelihoodValue.name },
          impact: { id: risk.impactValue.id, name: risk.impactValue.name },
          riskScore: decimalToNumber(risk.riskScore),
          riskLevel: { id: risk.riskLevel.id, name: risk.riskLevel.name },
          responseStrategy: { id: risk.responseStrategy.id, name: risk.responseStrategy.name },
          responseAction: risk.responseAction ?? null,
          createdDate: toDateOnlyString(risk.createdDate),
          nextReviewDate: toDateOnlyString(risk.nextReviewDate)
        }
      },
      tx
    );

    return risk;
  });
}
