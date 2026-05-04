import { Prisma } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { getEffectiveRegisterRole, listAccessibleRegisterIds } from "../permissions/registerAccess.js";
import type { AuthenticatedActor } from "../types/express.js";
import { buildFieldChanges, recordAuditEvent } from "./audit.service.js";
import type {
  CreateRegisterPermissionBody,
  CreateRegisterBody,
  ListRegistersQuery,
  UpdateRegisterBody
} from "../validators/registers.schemas.js";

const registerSelect = {
  id: true,
  name: true,
  description: true,
  riskIdPrefix: true,
  riskIdZeroPaddingEnabled: true,
  riskIdZeroPaddingWidth: true,
  nextRiskSequence: true,
  defaultNewRiskState: true,
  reviewsEnabled: true,
  defaultReviewFrequencyMonths: true,
  reviewAttestationText: true,
  allowViewerExport: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.RegisterSelect;

const permissionCandidateUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  isSystemAdmin: true
} satisfies Prisma.UserSelect;

const likelihoodDefaults = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const impactDefaults = ["Insignificant", "Minor", "Moderate", "Major", "Severe"];
const riskLevelDefaults = ["Low", "Medium", "High", "Critical"];
const responseStrategyDefaults = ["Accept", "Mitigate", "Transfer", "Avoid"];
const matrixLevelNames = [
  ["Low", "Low", "Low", "Medium", "Medium"],
  ["Low", "Low", "Medium", "Medium", "High"],
  ["Low", "Medium", "Medium", "High", "High"],
  ["Medium", "Medium", "High", "High", "Critical"],
  ["Medium", "High", "High", "Critical", "Critical"]
];

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "A register with this name already exists");
  }

  throw error;
}

async function decorateRegister(
  register: Prisma.RegisterGetPayload<{ select: typeof registerSelect }>,
  actor: AuthenticatedActor
) {
  const [openRisksCount, overdueRisksCount, effectiveRole] = await Promise.all([
    prisma.risk.count({ where: { registerId: register.id, state: "OPEN" } }),
    prisma.risk.count({
      where: {
        registerId: register.id,
        state: { not: "CLOSED" },
        nextReviewDate: { lt: new Date() }
      }
    }),
    getEffectiveRegisterRole(actor, register.id)
  ]);

  return {
    ...register,
    effectiveRole,
    openRisksCount,
    overdueRisksCount
  };
}

export async function listRegisters(actor: AuthenticatedActor, query: ListRegistersQuery) {
  const accessibleRegisterIds = await listAccessibleRegisterIds(actor);
  const where: Prisma.RegisterWhereInput = {
    id: actor.isSystemAdmin ? undefined : { in: accessibleRegisterIds },
    OR: query.search
      ? [
          { name: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } }
        ]
      : undefined
  };

  const [registers, total] = await Promise.all([
    prisma.register.findMany({
      where,
      select: registerSelect,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.register.count({ where })
  ]);

  return {
    data: await Promise.all(registers.map((register) => decorateRegister(register, actor))),
    meta: { total, page: query.page, pageSize: query.pageSize }
  };
}

async function assertUsersExist(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) {
    return uniqueIds;
  }

  const found = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: { id: true }
  });

  if (found.length !== uniqueIds.length) {
    throw new ApiError(400, "VALIDATION_ERROR", "Initial Register Admin users must exist and be active", {
      initialRegisterAdminUserIds: "One or more users do not exist or are inactive"
    });
  }

  return uniqueIds;
}

export async function createRegister(actor: AuthenticatedActor, input: CreateRegisterBody) {
  const initialAdminIds = await assertUsersExist(input.initialRegisterAdminUserIds);

  try {
    return await prisma.$transaction(async (tx) => {
      const register = await tx.register.create({
        data: {
          name: input.name,
          description: input.description,
          riskIdPrefix: input.riskIdPrefix,
          riskIdZeroPaddingEnabled: input.riskIdZeroPaddingEnabled,
          riskIdZeroPaddingWidth: input.riskIdZeroPaddingWidth,
          createdByUserId: actor.id,
          updatedByUserId: actor.id
        },
        select: registerSelect
      });

      const likelihoodValues = await Promise.all(
        likelihoodDefaults.map((name, index) =>
          tx.likelihoodValue.create({
            data: {
              registerId: register.id,
              name,
              numericValue: index + 1,
              displayOrder: index + 1
            }
          })
        )
      );
      const impactValues = await Promise.all(
        impactDefaults.map((name, index) =>
          tx.impactValue.create({
            data: {
              registerId: register.id,
              name,
              numericValue: index + 1,
              displayOrder: index + 1
            }
          })
        )
      );
      const riskLevels = await Promise.all(
        riskLevelDefaults.map((name, index) =>
          tx.riskLevel.create({
            data: {
              registerId: register.id,
              name,
              displayOrder: index + 1
            }
          })
        )
      );
      await Promise.all(
        responseStrategyDefaults.map((name, index) =>
          tx.responseStrategy.create({
            data: {
              registerId: register.id,
              name,
              displayOrder: index + 1
            }
          })
        )
      );

      const riskLevelByName = new Map(riskLevels.map((level) => [level.name, level.id]));
      await Promise.all(
        impactValues.flatMap((impact, impactIndex) =>
          likelihoodValues.map((likelihood, likelihoodIndex) =>
            tx.riskMatrixCell.create({
              data: {
                registerId: register.id,
                likelihoodValueId: likelihood.id,
                impactValueId: impact.id,
                riskLevelId: riskLevelByName.get(matrixLevelNames[impactIndex]?.[likelihoodIndex] ?? "Low")!
              }
            })
          )
        )
      );

      await Promise.all(
        initialAdminIds.map((userId) =>
          tx.registerPermission.create({
            data: {
              registerId: register.id,
              userId,
              role: "REGISTER_ADMIN",
              createdByUserId: actor.id
            }
          })
        )
      );

      await recordAuditEvent(
        {
          action: auditActions.registerCreated,
          actor,
          objectType: "REGISTER",
          objectId: register.id,
          objectDisplayName: register.name,
          scopeType: "SYSTEM",
          registerId: register.id,
          summary: "Register created"
        },
        tx
      );

      for (const userId of initialAdminIds) {
        await recordAuditEvent(
          {
            action: auditActions.registerAdminAdded,
            actor,
            objectType: "REGISTER_PERMISSION",
            objectId: `${register.id}:${userId}:REGISTER_ADMIN`,
            objectDisplayName: register.name,
            scopeType: "REGISTER",
            registerId: register.id,
            summary: "Register Admin added"
          },
          tx
        );
      }

      return register;
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function getRegister(actor: AuthenticatedActor, registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: registerSelect
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  return decorateRegister(register, actor);
}

export async function updateRegister(
  actor: AuthenticatedActor,
  registerId: string,
  input: UpdateRegisterBody
) {
  const existing = await prisma.register.findUnique({
    where: { id: registerId },
    select: registerSelect
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.register.update({
        where: { id: registerId },
        data: {
          name: input.name,
          description: input.description,
          riskIdPrefix: input.riskIdPrefix,
          riskIdZeroPaddingEnabled: input.riskIdZeroPaddingEnabled,
          riskIdZeroPaddingWidth: input.riskIdZeroPaddingWidth,
          reviewsEnabled: input.reviewsEnabled,
          defaultReviewFrequencyMonths: input.defaultReviewFrequencyMonths,
          allowViewerExport: input.allowViewerExport,
          updatedByUserId: actor.id
        },
        select: registerSelect
      });

      await recordAuditEvent(
        {
          action: auditActions.registerSettingsUpdated,
          actor,
          objectType: "REGISTER",
          objectId: updated.id,
          objectDisplayName: updated.name,
          scopeType: "REGISTER",
          registerId: updated.id,
          summary: "Register settings updated",
          fieldChanges: buildFieldChanges(existing, updated, [
            { name: "name", label: "Name", valueType: "TEXT" },
            { name: "description", label: "Description", valueType: "TEXT" },
            { name: "riskIdPrefix", label: "Risk ID prefix", valueType: "TEXT" },
            { name: "riskIdZeroPaddingEnabled", label: "Risk ID zero padding", valueType: "BOOLEAN" },
            { name: "riskIdZeroPaddingWidth", label: "Risk ID zero padding width", valueType: "NUMBER" },
            { name: "reviewsEnabled", label: "Reviews enabled", valueType: "BOOLEAN" },
            { name: "defaultReviewFrequencyMonths", label: "Default review frequency", valueType: "NUMBER" },
            { name: "allowViewerExport", label: "Allow viewer export", valueType: "BOOLEAN" }
          ])
        },
        tx
      );

      return updated;
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function getRegisterSummary(registerId: string) {
  const [openRisks, overdueRisks, risksByLevel] = await Promise.all([
    prisma.risk.count({ where: { registerId, state: "OPEN" } }),
    prisma.risk.count({
      where: {
        registerId,
        state: { not: "CLOSED" },
        nextReviewDate: { lt: new Date() }
      }
    }),
    prisma.risk.groupBy({
      by: ["riskLevelId"],
      where: { registerId, state: { not: "CLOSED" } },
      _count: { _all: true }
    })
  ]);

  return {
    openRisks,
    overdueRisks,
    risksByLevel
  };
}

export async function listRegisterPermissions(registerId: string) {
  return prisma.registerPermission.findMany({
    where: { registerId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          isSystemAdmin: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });
}

export async function listRegisterPermissionCandidates(registerId: string) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      registerPermissions: {
        none: { registerId }
      }
    },
    select: permissionCandidateUserSelect,
    orderBy: [{ name: "asc" }, { email: "asc" }]
  });
}

export async function addRegisterPermission(
  actor: AuthenticatedActor,
  registerId: string,
  input: CreateRegisterPermissionBody
) {
  const [register, user] = await Promise.all([
    prisma.register.findUnique({ where: { id: registerId }, select: { id: true, name: true } }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, email: true, isActive: true }
    })
  ]);

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  if (!user || !user.isActive) {
    throw new ApiError(400, "VALIDATION_ERROR", "User must exist and be active", {
      userId: "User must exist and be active"
    });
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const permission = await tx.registerPermission.create({
        data: {
          registerId,
          userId: input.userId,
          role: input.role,
          createdByUserId: actor.id
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              isSystemAdmin: true
            }
          }
        }
      });

      await recordAuditEvent(
        {
          action:
            input.role === "REGISTER_ADMIN"
              ? auditActions.registerAdminAdded
              : auditActions.registerViewerAdded,
          actor,
          objectType: "REGISTER_PERMISSION",
          objectId: permission.id,
          objectDisplayName: user.email,
          scopeType: "REGISTER",
          registerId,
          summary:
            input.role === "REGISTER_ADMIN"
              ? "Register Admin added"
              : "Register Viewer added",
          metadataJson: {
            userId: user.id,
            role: input.role
          }
        },
        tx
      );

      return permission;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "CONFLICT", "Register permission already exists");
    }
    throw error;
  }
}

export async function removeRegisterPermission(
  actor: AuthenticatedActor,
  registerId: string,
  permissionId: string
) {
  const permission = await prisma.registerPermission.findFirst({
    where: { id: permissionId, registerId },
    include: {
      register: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } }
    }
  });

  if (!permission) {
    throw new ApiError(404, "NOT_FOUND", "Register permission not found");
  }

  if (permission.role === "REGISTER_ADMIN" && !actor.isSystemAdmin) {
    const adminCount = await prisma.registerPermission.count({
      where: { registerId, role: "REGISTER_ADMIN" }
    });

    if (adminCount <= 1) {
      throw new ApiError(422, "UNPROCESSABLE", "Cannot remove the final Register Admin");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.registerPermission.delete({
      where: { id: permission.id }
    });

    await recordAuditEvent(
      {
        action:
          permission.role === "REGISTER_ADMIN"
            ? auditActions.registerAdminRemoved
            : auditActions.registerViewerRemoved,
        actor,
        objectType: "REGISTER_PERMISSION",
        objectId: permission.id,
        objectDisplayName: permission.user.email,
        scopeType: "REGISTER",
        registerId,
        summary:
          permission.role === "REGISTER_ADMIN"
            ? "Register Admin removed"
            : "Register Viewer removed",
        metadataJson: {
          userId: permission.userId,
          role: permission.role
        }
      },
      tx
    );
  });

  return { success: true };
}
