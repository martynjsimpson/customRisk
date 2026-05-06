import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import {
  getDueSoonLimit,
  getRiskReviewStatus,
  isRiskOverdue,
  utcDateOnly
} from "./reviewStatus.service.js";

const dashboardRiskInclude = {
  register: { select: { id: true, name: true, reviewsEnabled: true } },
  owner: { select: { id: true, name: true, email: true } },
  riskLevel: { select: { id: true, name: true, color: true } }
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
    systemUpdatedAt: risk.systemUpdatedAt
  };
}

async function listAdminRegisterIds(actor: AuthenticatedActor) {
  if (actor.isSystemAdmin) {
    const registers = await prisma.register.findMany({ select: { id: true } });
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
    where: { id: registerId },
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

export async function getMyRisks(actor: AuthenticatedActor) {
  const risks = await prisma.risk.findMany({
    where: {
      ownerUserId: actor.id,
      state: { not: "CLOSED" }
    },
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
    prisma.register.count(),
    prisma.user.count(),
    prisma.risk.count({ where: { state: "OPEN" } }),
    prisma.risk.count({
      where: {
        state: { not: "CLOSED" },
        nextReviewDate: { lt: today },
        register: { reviewsEnabled: true }
      }
    }),
    prisma.auditEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 10
    })
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
