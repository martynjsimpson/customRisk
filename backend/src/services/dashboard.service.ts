import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import type { MyRisksQuery } from "../validators/dashboard.schemas.js";
import { listAuditEvents } from "./audit.service.js";
import { formatPersonDisplay, personReferenceSelect } from "./personReference.service.js";
import {
  getDueSoonLimit,
  getRiskReviewStatus,
  isRiskOverdue,
  utcDateOnly
} from "./reviewStatus.service.js";

const dashboardRiskInclude = {
  register: { select: { id: true, name: true, reviewsEnabled: true } },
  owner: { select: { id: true, name: true, email: true } },
  riskLevel: { select: { id: true, name: true, color: true } },
  customFieldValues: {
    include: {
      customFieldDefinition: { select: { id: true, fieldName: true, fieldType: true, isActive: true, displayOrder: true } },
      dropdownOption: { select: { id: true, label: true } },
      personUser: { select: { id: true, name: true, email: true } },
      person: { select: personReferenceSelect }
    }
  }
} satisfies Prisma.RiskInclude;

function toDateOnlyString(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function decimalToNumber(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toNumber();
}

function mapDashboardRisk(
  risk: Prisma.RiskGetPayload<{ include: typeof dashboardRiskInclude }>
) {
  return {
    id: risk.id,
    register: {
      id: risk.register.id,
      name: risk.register.name
    },
    displayRiskId: risk.displayRiskId,
    title: risk.title,
    state: risk.state,
    owner: risk.owner,
    riskScore: decimalToNumber(risk.riskScore),
    riskLevel: risk.riskLevel,
    nextReviewDate: toDateOnlyString(risk.nextReviewDate),
    reviewStatus: getRiskReviewStatus({
      reviewsEnabled: risk.register.reviewsEnabled,
      lastReviewedAt: risk.lastReviewedAt,
      nextReviewDate: risk.nextReviewDate
    }),
    isOverdue: isRiskOverdue({
      reviewsEnabled: risk.register.reviewsEnabled,
      nextReviewDate: risk.nextReviewDate,
      state: risk.state
    }),
    systemUpdatedAt: risk.systemUpdatedAt,
    customFieldValues: risk.customFieldValues.map((value) => ({
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
    }))
  };
}

async function listAdminRegisterIds(actor: AuthenticatedActor) {
  if (actor.isSystemAdmin) {
    const registers = await prisma.register.findMany({ where: { isActive: true }, select: { id: true } });
    return registers.map((register) => register.id);
  }

  const permissions = await prisma.registerPermission.findMany({
    where: { userId: actor.id, role: "REGISTER_ADMIN" },
    select: { registerId: true }
  });

  return permissions.map((permission) => permission.registerId);
}

async function listMyOpenRisks(actor: AuthenticatedActor) {
  return prisma.risk.findMany({
    where: {
      ownerUserId: actor.id,
      state: "OPEN"
    },
    include: dashboardRiskInclude,
    orderBy: [{ nextReviewDate: "asc" }, { systemUpdatedAt: "desc" }],
    take: 10
  });
}

async function listMyDueSoonRisks(actor: AuthenticatedActor) {
  const today = utcDateOnly(new Date());
  return prisma.risk.findMany({
    where: {
      ownerUserId: actor.id,
      state: { not: "CLOSED" },
      lastReviewedAt: { not: null },
      nextReviewDate: { gte: today, lte: getDueSoonLimit(today) },
      register: { reviewsEnabled: true }
    },
    include: dashboardRiskInclude,
    orderBy: [{ nextReviewDate: "asc" }, { systemUpdatedAt: "desc" }],
    take: 10
  });
}

async function listMyOverdueRisks(actor: AuthenticatedActor) {
  return prisma.risk.findMany({
    where: {
      ownerUserId: actor.id,
      state: { not: "CLOSED" },
      nextReviewDate: { lt: utcDateOnly(new Date()) },
      register: { reviewsEnabled: true }
    },
    include: dashboardRiskInclude,
    orderBy: [{ nextReviewDate: "asc" }, { systemUpdatedAt: "desc" }],
    take: 10
  });
}

async function buildRegisterSummary(registerId: string) {
  const today = utcDateOnly(new Date());
  const register = await prisma.register.findUnique({
    where: { id: registerId, isActive: true },
    select: { id: true, name: true, reviewsEnabled: true }
  });

  if (!register) {
    return null;
  }

  const [openRisks, overdueReviews, risksByLevel] = await Promise.all([
    prisma.risk.count({ where: { registerId, state: "OPEN" } }),
    prisma.risk.count({
      where: {
        registerId,
        state: { not: "CLOSED" },
        nextReviewDate: { lt: today },
        register: { reviewsEnabled: true }
      }
    }),
    prisma.riskLevel.findMany({
      where: { registerId },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            risks: { where: { state: { not: "CLOSED" } } }
          }
        }
      },
      orderBy: { displayOrder: "asc" }
    })
  ]);

  return {
    register: {
      id: register.id,
      name: register.name
    },
    openRisks,
    overdueReviews,
    unassignedRisks: 0,
    risksByLevel: risksByLevel.map((level) => ({
      id: level.id,
      name: level.name,
      color: level.color,
      count: level._count.risks
    }))
  };
}

export async function getMyRisks(actor: AuthenticatedActor, query: MyRisksQuery = {}) {
  const ownershipFilter: Prisma.RiskWhereInput = {
    OR: [
      { ownerUserId: actor.id },
      { ownerPerson: { userId: actor.id } }
    ]
  };

  const where: Prisma.RiskWhereInput = {
    AND: [ownershipFilter]
  };

  // Default: exclude closed risks unless caller explicitly requests a specific state
  if (!query.state) {
    (where.AND as Prisma.RiskWhereInput[]).push({ state: { not: "CLOSED" } });
  } else {
    (where.AND as Prisma.RiskWhereInput[]).push({ state: query.state });
  }

  if (query.search) {
    (where.AND as Prisma.RiskWhereInput[]).push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } }
      ]
    });
  }

  if (query.riskLevel) {
    (where.AND as Prisma.RiskWhereInput[]).push({
      riskLevel: { name: { equals: query.riskLevel, mode: "insensitive" } }
    });
  }

  if (query.registerId) {
    (where.AND as Prisma.RiskWhereInput[]).push({ registerId: query.registerId });
  }

  const risks = await prisma.risk.findMany({
    where,
    include: dashboardRiskInclude,
    orderBy: [{ nextReviewDate: "asc" }, { systemUpdatedAt: "desc" }]
  });

  return risks.map(mapDashboardRisk);
}

export async function getAdminSummary(actor: AuthenticatedActor) {
  const adminRegisterIds = await listAdminRegisterIds(actor);
  if (!actor.isSystemAdmin && adminRegisterIds.length === 0) {
    throw new ApiError(403, "FORBIDDEN", "Register Admin or System Admin permission is required");
  }

  const adminRegisterSummaries = (
    await Promise.all(adminRegisterIds.map((registerId) => buildRegisterSummary(registerId)))
  ).filter((summary) => summary !== null);

  if (!actor.isSystemAdmin) {
    return {
      adminRegisterSummaries,
      systemSummary: null,
      recentAuditActivity: []
    };
  }

  const today = utcDateOnly(new Date());
  const [totalRegisters, totalUsers, openRisks, overdueReviews, recentAuditActivity] = await Promise.all([
    prisma.register.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.risk.count({ where: { state: "OPEN" } }),
    prisma.risk.count({
      where: {
        state: { not: "CLOSED" },
        nextReviewDate: { lt: today },
        register: { reviewsEnabled: true }
      }
    }),
    listAuditEvents({ pageSize: 10 }).then((r) => r.data)
  ]);

  return {
    adminRegisterSummaries,
    systemSummary: {
      totalRegisters,
      totalUsers,
      openRisks,
      overdueReviews
    },
    recentAuditActivity
  };
}

export async function getMyWork(actor: AuthenticatedActor) {
  const [myOpenRisks, myDueSoonRisks, myOverdueRisks, adminSummary] = await Promise.all([
    listMyOpenRisks(actor),
    listMyDueSoonRisks(actor),
    listMyOverdueRisks(actor),
    getAdminSummary(actor).catch((error: unknown) => {
      if (error instanceof ApiError && error.statusCode === 403) {
        return {
          adminRegisterSummaries: [],
          systemSummary: null,
          recentAuditActivity: []
        };
      }
      throw error;
    })
  ]);

  return {
    myOpenRisks: myOpenRisks.map(mapDashboardRisk),
    myDueSoonRisks: myDueSoonRisks.map(mapDashboardRisk),
    myOverdueRisks: myOverdueRisks.map(mapDashboardRisk),
    ...adminSummary
  };
}
