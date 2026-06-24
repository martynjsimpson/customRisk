import { Prisma } from "@prisma/client";

import { toDateOnlyString, decimalToNumber, decimalOrNull } from "../utils/formatters.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { getEffectiveRegisterRole } from "../permissions/registerAccess.js";
import type { AuthenticatedActor } from "../types/express.js";
import {
  getDueSoonLimit,
  getRiskReviewStatus,
  isRiskOverdue,
  utcDateOnly
} from "./reviewStatus.service.js";
import type { ListRisksQuery } from "../validators/risks.schemas.js";
import { formatPersonDisplay, personReferenceSelect } from "./personReference.service.js";
import { isFieldVisibleToRole, isFieldVisibleToResponseActionOwner } from "./registerConfig.service.js";

export const riskListInclude = {
  owner: { select: { id: true, name: true, email: true } },
  ownerPerson: { select: personReferenceSelect },
  likelihoodValue: { select: { id: true, name: true } },
  impactValue: { select: { id: true, name: true } },
  riskLevel: { select: { id: true, name: true, color: true } },
  responseStrategy: { select: { id: true, name: true } },
  customFieldValues: {
    include: {
      customFieldDefinition: { select: { id: true, fieldName: true, fieldType: true, isActive: true, displayOrder: true, visibleToRoles: true } },
      dropdownOption: { select: { id: true, label: true } },
      personUser: { select: { id: true, name: true, email: true } },
      person: { select: personReferenceSelect }
    }
  },
  multiSelectValues: {
    include: {
      option: { select: { id: true, label: true } },
      customFieldDefinition: { select: { id: true, fieldName: true, displayOrder: true, isActive: true, visibleToRoles: true } }
    },
    orderBy: { option: { displayOrder: "asc" } } as const
  }
} satisfies Prisma.RiskInclude;

export type ValidationContext = {
  blockFieldIds: ReadonlySet<string>;
  warnFieldIds: ReadonlySet<string>;
  multiSelectFieldIds: ReadonlySet<string>; // IDs of fields that are MULTI_SELECT type
};

export const hasValueCondition = [
  { textValue: { not: null as null } },
  { numberValue: { not: null as null } },
  { booleanValue: { not: null as null } },
  { dateValue: { not: null as null } },
  { personUserId: { not: null as null } },
  { personEmail: { not: null as null } },
  { personId: { not: null as null } },
  { dropdownOptionId: { not: null as null } }
] satisfies Prisma.RiskCustomFieldValueWhereInput[];

export function hasPopulatedValue(v: {
  textValue: string | null;
  numberValue: Prisma.Decimal | null;
  booleanValue: boolean | null;
  dateValue: Date | null;
  personUserId: string | null;
  personEmail: string | null;
  personId: string | null;
  dropdownOptionId: string | null;
}) {
  return (
    v.textValue !== null ||
    v.numberValue !== null ||
    v.booleanValue !== null ||
    v.dateValue !== null ||
    v.personUserId !== null ||
    v.personEmail !== null ||
    v.personId !== null ||
    v.dropdownOptionId !== null
  );
}

export function buildRiskOrderBy(query: ListRisksQuery): Prisma.RiskOrderByWithRelationInput[] {
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

export function applyReviewFilters(where: Prisma.RiskWhereInput, query: ListRisksQuery, reviewsEnabled: boolean) {
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

export function computeValidationStatus(
  scalarValues: Array<{ customFieldDefinitionId: string; textValue: string | null; numberValue: Prisma.Decimal | null; booleanValue: boolean | null; dateValue: Date | null; personUserId: string | null; personEmail: string | null; personId: string | null; dropdownOptionId: string | null }>,
  multiSelectValues: Array<{ customFieldDefinitionId: string }>,
  ctx: ValidationContext
): "BLOCK" | "WARN" | "OK" {
  const scalarPopulated = new Set(scalarValues.filter(hasPopulatedValue).map((v) => v.customFieldDefinitionId));
  const multiSelectPopulated = new Set(multiSelectValues.map((v) => v.customFieldDefinitionId));

  function isPopulated(id: string) {
    return ctx.multiSelectFieldIds.has(id) ? multiSelectPopulated.has(id) : scalarPopulated.has(id);
  }

  for (const id of ctx.blockFieldIds) {
    if (!isPopulated(id)) return "BLOCK";
  }
  for (const id of ctx.warnFieldIds) {
    if (!isPopulated(id)) return "WARN";
  }
  return "OK";
}

export function applyValidationIssuesFilter(
  where: Prisma.RiskWhereInput,
  scalarFieldIds: string[],
  multiSelectFieldIds: string[]
) {
  if (scalarFieldIds.length === 0 && multiSelectFieldIds.length === 0) return;

  const orClauses: Prisma.RiskWhereInput[] = [
    ...scalarFieldIds.map((fieldId) => ({
      NOT: { customFieldValues: { some: { customFieldDefinitionId: fieldId, OR: hasValueCondition } } }
    })),
    ...multiSelectFieldIds.map((fieldId) => ({
      NOT: { multiSelectValues: { some: { customFieldDefinitionId: fieldId } } }
    }))
  ];

  const filter: Prisma.RiskWhereInput = { OR: orClauses };
  if (Array.isArray(where.AND)) {
    (where.AND as Prisma.RiskWhereInput[]).push(filter);
  } else if (where.AND) {
    where.AND = [where.AND as Prisma.RiskWhereInput, filter];
  } else {
    where.AND = [filter];
  }
}

export function mapRiskListCustomFieldValue(
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

export function buildMergedCustomFieldValues(
  risk: Prisma.RiskGetPayload<{ include: typeof riskListInclude }>
) {
  const scalarValues = risk.customFieldValues.map(mapRiskListCustomFieldValue);

  // Group multi-select options by definition
  const multiSelectByDefinitionId = new Map<string, { id: string; label: string }[]>();
  const multiSelectDefById = new Map<string, { id: string; fieldName: string; displayOrder: number; isActive: boolean }>();
  for (const msv of risk.multiSelectValues) {
    const existing = multiSelectByDefinitionId.get(msv.customFieldDefinitionId) ?? [];
    existing.push(msv.option);
    multiSelectByDefinitionId.set(msv.customFieldDefinitionId, existing);
    if (!multiSelectDefById.has(msv.customFieldDefinitionId)) {
      multiSelectDefById.set(msv.customFieldDefinitionId, msv.customFieldDefinition);
    }
  }

  const multiSelectValues = [...multiSelectDefById.entries()].map(([defId, def]) => ({
    customFieldDefinitionId: defId,
    fieldName: def.fieldName,
    fieldType: "MULTI_SELECT" as const,
    displayOrder: def.displayOrder,
    isActive: def.isActive,
    textValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    personUser: null,
    person: null,
    dropdownOption: null,
    selectedOptions: multiSelectByDefinitionId.get(defId) ?? []
  }));

  return [...scalarValues, ...multiSelectValues];
}

export function mapCustomFieldValue(
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

export function mapRiskDetail(
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
      multiSelectValues: {
        include: {
          option: { select: { id: true; label: true } };
          customFieldDefinition: { select: { id: true; fieldName: true; displayOrder: true; isActive: true; fieldType: true; helpText: true; isRequired: true; validationMode: true } };
        };
      };
      lastReviewedBy: { select: { id: true; name: true; email: true } };
      systemCreatedBy: { select: { id: true; name: true; email: true } };
      systemUpdatedBy: { select: { id: true; name: true; email: true } };
    };
  }>,
  reviewsEnabled: boolean
) {
  const scalarCustomFields = risk.customFieldValues.map(mapCustomFieldValue);

  // Synthesize one entry per MULTI_SELECT field with all selected options grouped
  const multiSelectByDef = new Map<string, { id: string; label: string }[]>();
  const multiSelectDefs = new Map<string, { id: string; fieldName: string; fieldType: "MULTI_SELECT"; helpText: string | null; isRequired: boolean; validationMode: string; displayOrder: number; isActive: boolean }>();
  for (const msv of risk.multiSelectValues) {
    const arr = multiSelectByDef.get(msv.customFieldDefinitionId) ?? [];
    arr.push(msv.option);
    multiSelectByDef.set(msv.customFieldDefinitionId, arr);
    if (!multiSelectDefs.has(msv.customFieldDefinitionId)) {
      const def = msv.customFieldDefinition;
      multiSelectDefs.set(msv.customFieldDefinitionId, {
        id: def.id,
        fieldName: def.fieldName,
        fieldType: "MULTI_SELECT" as const,
        helpText: def.helpText,
        isRequired: def.isRequired,
        validationMode: def.validationMode,
        displayOrder: def.displayOrder,
        isActive: def.isActive
      });
    }
  }
  const multiSelectCustomFields = [...multiSelectDefs.entries()].map(([defId, def]) => ({
    id: defId,
    customFieldDefinition: def,
    textValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    person: null,
    personUser: null,
    dropdownOption: null,
    selectedOptions: multiSelectByDef.get(defId) ?? []
  }));

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
    customFields: ([...scalarCustomFields, ...multiSelectCustomFields] as ReturnType<typeof mapCustomFieldValue>[]),
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

export function mapRiskListItem(
  risk: Prisma.RiskGetPayload<{ include: typeof riskListInclude }>,
  reviewsEnabled: boolean,
  validationContext: ValidationContext
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
    owner: risk.owner ?? (risk.ownerPerson ? { id: risk.ownerPerson.userId ?? risk.ownerPerson.id, name: risk.ownerPerson.displayName, email: risk.ownerPerson.email } : null),
    ownerPerson: risk.ownerPerson ? formatPersonDisplay(risk.ownerPerson) : null,
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
    validationStatus: computeValidationStatus(risk.customFieldValues, risk.multiSelectValues, validationContext),
    systemUpdatedAt: risk.systemUpdatedAt,
    customFieldValues: buildMergedCustomFieldValues(risk)
  };
}

export async function listRisks(
  actor: AuthenticatedActor,
  registerId: string,
  query: ListRisksQuery
) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true, reviewsEnabled: true, customFieldValidationEnabled: true }
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

  const activeValidationFields = register.customFieldValidationEnabled
    ? await prisma.customFieldDefinition.findMany({
        where: { registerId, isActive: true, validationMode: { in: ["WARN", "BLOCK"] } },
        select: { id: true, validationMode: true, fieldType: true }
      })
    : [];
  const blockFieldIds = new Set(
    activeValidationFields.filter((f) => f.validationMode === "BLOCK").map((f) => f.id)
  );
  const warnFieldIds = new Set(
    activeValidationFields.filter((f) => f.validationMode === "WARN").map((f) => f.id)
  );
  const multiSelectFieldIds = new Set(
    activeValidationFields.filter((f) => f.fieldType === "MULTI_SELECT").map((f) => f.id)
  );
  const validationContext: ValidationContext = { blockFieldIds, warnFieldIds, multiSelectFieldIds };

  if (register.customFieldValidationEnabled && query.validationIssues) {
    const scalarIds = activeValidationFields.filter((f) => f.fieldType !== "MULTI_SELECT").map((f) => f.id);
    const msIds = activeValidationFields.filter((f) => f.fieldType === "MULTI_SELECT").map((f) => f.id);
    applyValidationIssuesFilter(where, scalarIds, msIds);
  }

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
    data: risks.map((risk) => {
      const visibleRisk = {
        ...risk,
        customFieldValues: risk.customFieldValues.filter(
          (v) => isFieldVisibleToRole(v.customFieldDefinition.visibleToRoles, role)
        ),
        multiSelectValues: risk.multiSelectValues.filter(
          (v) => isFieldVisibleToRole(v.customFieldDefinition.visibleToRoles, role)
        )
      };
      return mapRiskListItem(visibleRisk, register.reviewsEnabled, validationContext);
    }),
    meta: { total, page: query.page, pageSize: query.pageSize }
  };
}

export async function getRiskDetail(actor: AuthenticatedActor, registerId: string, riskId: string) {
  const [risk, actorRole] = await Promise.all([
    prisma.risk.findFirst({
      where: { id: riskId, registerId },
      include: {
        register: { select: { reviewsEnabled: true, responseActionMode: true } },
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
        multiSelectValues: {
          include: {
            option: { select: { id: true, label: true } },
            customFieldDefinition: { select: { id: true, fieldName: true, displayOrder: true, isActive: true, fieldType: true, helpText: true, isRequired: true, validationMode: true, visibleToRoles: true, visibleToRiskResponseOwners: true } }
          },
          orderBy: { option: { displayOrder: "asc" } }
        },
        lastReviewedBy: { select: { id: true, name: true, email: true } },
        systemCreatedBy: { select: { id: true, name: true, email: true } },
        systemUpdatedBy: { select: { id: true, name: true, email: true } }
      }
    }),
    getEffectiveRegisterRole(actor, registerId)
  ]);

  if (!risk) {
    throw new ApiError(404, "NOT_FOUND", "Risk not found");
  }

  const isResponseActionOwnerOnly = actorRole === "RESPONSE_ACTION_OWNER";
  const inChildRecordsMode = risk.register.responseActionMode === "CHILD_RECORDS";

  const filteredRisk = {
    ...risk,
    customFieldValues: risk.customFieldValues.filter((v) => {
      if (!isFieldVisibleToRole(v.customFieldDefinition.visibleToRoles, actorRole)) return false;
      if (isResponseActionOwnerOnly && inChildRecordsMode) {
        return isFieldVisibleToResponseActionOwner(v.customFieldDefinition.visibleToRiskResponseOwners);
      }
      return true;
    }),
    multiSelectValues: risk.multiSelectValues.filter((v) => {
      if (!isFieldVisibleToRole(v.customFieldDefinition.visibleToRoles, actorRole)) return false;
      if (isResponseActionOwnerOnly && inChildRecordsMode) {
        return isFieldVisibleToResponseActionOwner(v.customFieldDefinition.visibleToRiskResponseOwners);
      }
      return true;
    })
  };

  const detail = mapRiskDetail(filteredRisk, risk.register.reviewsEnabled);

  // For Response Action Owners in Child Records mode, strip restricted fields
  if (isResponseActionOwnerOnly && inChildRecordsMode) {
    return {
      id: detail.id,
      registerId: detail.registerId,
      displayRiskId: detail.displayRiskId,
      title: detail.title,
      state: detail.state,
      customFields: detail.customFields,
      responseActionMode: risk.register.responseActionMode
    };
  }

  return { ...detail, responseActionMode: risk.register.responseActionMode };
}

export async function getRiskValidationSummary(
  actor: AuthenticatedActor,
  registerId: string
) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true, customFieldValidationEnabled: true }
  });
  if (!register) throw new ApiError(404, "NOT_FOUND", "Register not found");

  const role = await getEffectiveRegisterRole(actor, registerId);
  if (role === "NONE") throw new ApiError(404, "NOT_FOUND", "Register not found");

  if (!register.customFieldValidationEnabled) {
    const total = await prisma.risk.count({
      where: role === "RISK_OWNER"
        ? { registerId, state: { not: "CLOSED" }, AND: [{ OR: [{ ownerUserId: actor.id }, { ownerPerson: { userId: actor.id } }] }] }
        : { registerId, state: { not: "CLOSED" } }
    });
    return { blockCount: 0, warnCount: 0, total };
  }

  const activeValidationFields = await prisma.customFieldDefinition.findMany({
    where: { registerId, isActive: true, validationMode: { in: ["WARN", "BLOCK"] } },
    select: { id: true, validationMode: true, fieldType: true }
  });

  const blockFieldIds = activeValidationFields.filter((f) => f.validationMode === "BLOCK").map((f) => f.id);
  const warnFieldIds = activeValidationFields.filter((f) => f.validationMode === "WARN").map((f) => f.id);
  const blockScalarIds = blockFieldIds.filter((id) => activeValidationFields.find((f) => f.id === id)?.fieldType !== "MULTI_SELECT");
  const blockMsIds = blockFieldIds.filter((id) => activeValidationFields.find((f) => f.id === id)?.fieldType === "MULTI_SELECT");
  const warnScalarIds = warnFieldIds.filter((id) => activeValidationFields.find((f) => f.id === id)?.fieldType !== "MULTI_SELECT");
  const warnMsIds = warnFieldIds.filter((id) => activeValidationFields.find((f) => f.id === id)?.fieldType === "MULTI_SELECT");

  const baseWhere: Prisma.RiskWhereInput = { registerId, state: { not: "CLOSED" } };
  if (role === "RISK_OWNER") {
    baseWhere.AND = [{ OR: [{ ownerUserId: actor.id }, { ownerPerson: { userId: actor.id } }] }];
  }

  const total = await prisma.risk.count({ where: baseWhere });

  if (blockFieldIds.length === 0 && warnFieldIds.length === 0) {
    return { blockCount: 0, warnCount: 0, total };
  }

  let blockCount = 0;
  if (blockFieldIds.length > 0) {
    const blockWhere: Prisma.RiskWhereInput = { ...baseWhere };
    applyValidationIssuesFilter(blockWhere, blockScalarIds, blockMsIds);
    blockCount = await prisma.risk.count({ where: blockWhere });
  }

  let warnCount = 0;
  if (warnFieldIds.length > 0) {
    const warnWhere: Prisma.RiskWhereInput = { ...baseWhere };
    applyValidationIssuesFilter(warnWhere, warnScalarIds, warnMsIds);
    // Exclude risks already counted in blockCount
    if (blockFieldIds.length > 0) {
      const notBlockedClauses: Prisma.RiskWhereInput[] = [
        ...blockScalarIds.map((fieldId) => ({
          customFieldValues: { some: { customFieldDefinitionId: fieldId, OR: hasValueCondition } }
        })),
        ...blockMsIds.map((fieldId) => ({
          multiSelectValues: { some: { customFieldDefinitionId: fieldId } }
        }))
      ];
      const notBlockFilter: Prisma.RiskWhereInput = { AND: notBlockedClauses };
      if (Array.isArray(warnWhere.AND)) {
        (warnWhere.AND as Prisma.RiskWhereInput[]).push(notBlockFilter);
      } else if (warnWhere.AND) {
        warnWhere.AND = [warnWhere.AND as Prisma.RiskWhereInput, notBlockFilter];
      } else {
        warnWhere.AND = [notBlockFilter];
      }
    }
    warnCount = await prisma.risk.count({ where: warnWhere });
  }

  return { blockCount, warnCount, total };
}
