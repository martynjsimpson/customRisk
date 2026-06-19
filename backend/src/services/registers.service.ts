import { Prisma } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { getEffectiveRegisterRole, listAccessibleRegisterIds } from "../permissions/registerAccess.js";
import type { RegisterConfigSnapshot } from "../types/configSnapshot.js";
import type { AuthenticatedActor } from "../types/express.js";
import { buildFieldChanges, recordAuditEvent } from "./audit.service.js";
import { utcDateOnly } from "./reviewStatus.service.js";
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
  isActive: true,
  riskIdPrefix: true,
  riskIdZeroPaddingEnabled: true,
  riskIdZeroPaddingWidth: true,
  nextRiskSequence: true,
  defaultNewRiskState: true,
  reviewsEnabled: true,
  defaultReviewFrequencyMonths: true,
  reviewAttestationText: true,
  allowViewerExport: true,
  customFieldValidationEnabled: true,
  reviewStatusPosition: true,
  createdAt: true,
  updatedAt: true,
  linkedTemplateVersion: {
    select: {
      id: true,
      versionNumber: true,
      template: {
        select: {
          id: true,
          name: true,
          isActive: true,
          versions: {
            where: { status: "PUBLISHED" as const },
            orderBy: { versionNumber: "desc" as const },
            take: 1,
            select: { id: true, versionNumber: true }
          }
        }
      }
    }
  }
} satisfies Prisma.RegisterSelect;

const permissionCandidateUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  isSystemAdmin: true
} satisfies Prisma.UserSelect;

const likelihoodDefaults = ["Low", "Medium", "High"];
const impactDefaults = ["Low", "Medium", "High"];
const riskLevelDefaults = ["Low", "Medium", "High"] as const;
const riskLevelDefaultColors = {
  Low: "#2f9e44",
  Medium: "#f59f00",
  High: "#e03131"
} satisfies Record<(typeof riskLevelDefaults)[number], string>;
const responseStrategyDefaults = ["Accept", "Mitigate", "Transfer", "Avoid"];
const matrixLevelNames = [
  ["Low",    "Medium", "Medium"],
  ["Medium", "Medium", "High"],
  ["Medium", "High",   "High"]
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
  const today = utcDateOnly(new Date());
  const [openRisksCount, overdueRisksCount, effectiveRole] = await Promise.all([
    prisma.risk.count({ where: { registerId: register.id, state: "OPEN" } }),
    prisma.risk.count({
      where: {
        registerId: register.id,
        state: { not: "CLOSED" },
        nextReviewDate: { lt: today },
        register: { reviewsEnabled: true }
      }
    }),
    getEffectiveRegisterRole(actor, register.id)
  ]);

  return {
    ...register,
    effectiveRole,
    openRisksCount,
    overdueRisksCount,
    linkedTemplate: register.linkedTemplateVersion
      ? {
          templateId: register.linkedTemplateVersion.template.id,
          templateName: register.linkedTemplateVersion.template.name,
          templateIsActive: register.linkedTemplateVersion.template.isActive,
          linkedVersionId: register.linkedTemplateVersion.id,
          linkedVersionNumber: register.linkedTemplateVersion.versionNumber,
          latestPublishedVersionId: register.linkedTemplateVersion.template.versions[0]?.id ?? null,
          latestPublishedVersionNumber: register.linkedTemplateVersion.template.versions[0]?.versionNumber ?? null,
          isLatest: register.linkedTemplateVersion.template.versions[0]?.versionNumber === register.linkedTemplateVersion.versionNumber
        }
      : null,
  };
}

export async function listRegisters(actor: AuthenticatedActor, query: ListRegistersQuery) {
  const accessibleRegisterIds = await listAccessibleRegisterIds(actor);
  const where: Prisma.RegisterWhereInput = {
    isActive: true,
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
              color: riskLevelDefaultColors[name],
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

  if (!register || !register.isActive) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  return decorateRegister(register, actor);
}

export async function deleteRegister(actor: AuthenticatedActor, registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true, name: true, isActive: true }
  });

  if (!register || !register.isActive) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  await prisma.register.update({
    where: { id: registerId },
    data: { isActive: false, updatedByUserId: actor.id }
  });

  await recordAuditEvent({
    action: auditActions.registerDeleted,
    actor: { id: actor.id, name: actor.name, email: actor.email },
    objectType: "REGISTER",
    objectId: registerId,
    objectDisplayName: register.name,
    scopeType: "SYSTEM",
    registerId,
    summary: `Register "${register.name}" deleted`
  });
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
          customFieldValidationEnabled: input.customFieldValidationEnabled,
          reviewStatusPosition: input.reviewStatusPosition,
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
            { name: "allowViewerExport", label: "Allow viewer export", valueType: "BOOLEAN" },
            { name: "customFieldValidationEnabled", label: "Custom field validation enabled", valueType: "BOOLEAN" },
            { name: "reviewStatusPosition", label: "Review status position", valueType: "NUMBER" }
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
  const today = utcDateOnly(new Date());
  const [openRisks, overdueRisks, risksByLevel] = await Promise.all([
    prisma.risk.count({ where: { registerId, state: "OPEN" } }),
    prisma.risk.count({
      where: {
        registerId,
        state: { not: "CLOSED" },
        nextReviewDate: { lt: today },
        register: { reviewsEnabled: true }
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

// ---------------------------------------------------------------------------
// PM4-10: Create Register From Template
// ---------------------------------------------------------------------------

export async function createRegisterFromTemplate(
  templateVersionId: string,
  registerName: string,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const templateVersion = await prisma.registerTemplateVersion.findUnique({
    where: { id: templateVersionId },
    include: {
      template: { select: { id: true, name: true, isActive: true } }
    }
  });

  if (!templateVersion) {
    throw new ApiError(404, "NOT_FOUND", "Template version not found");
  }

  if (templateVersion.status !== "PUBLISHED") {
    throw new ApiError(422, "UNPROCESSABLE", "Cannot create a register from a DRAFT template version");
  }

  if (!templateVersion.template.isActive) {
    throw new ApiError(422, "UNPROCESSABLE", "Cannot create a register from an inactive template");
  }

  const snapshot = templateVersion.snapshotJson as unknown as RegisterConfigSnapshot;

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the Register using settings from snapshot but with user-supplied name
      const regSettings = snapshot.register;
      const register = await tx.register.create({
        data: {
          name: registerName,
          description: regSettings.description,
          riskIdPrefix: regSettings.riskIdPrefix,
          riskIdZeroPaddingEnabled: regSettings.riskIdZeroPaddingEnabled,
          riskIdZeroPaddingWidth: regSettings.riskIdZeroPaddingWidth,
          defaultNewRiskState: regSettings.defaultNewRiskState as "DRAFT" | "OPEN" | "CLOSED",
          reviewsEnabled: regSettings.reviewsEnabled,
          defaultReviewFrequencyMonths: regSettings.defaultReviewFrequencyMonths,
          reviewAttestationText: regSettings.reviewAttestationText,
          allowViewerExport: regSettings.allowViewerExport,
          customFieldValidationEnabled: regSettings.customFieldValidationEnabled,
          nextRiskSequence: 1,
          createdByUserId: actorId,
          updatedByUserId: actorId
        },
        select: registerSelect
      });

      // 2. Create config rows from snapshot with NEW UUIDs
      // Build ID mapping tables: templateId -> newId

      // Likelihood values
      const likelihoodIdMap = new Map<string, string>();
      const newLikelihoodValues = await Promise.all(
        snapshot.likelihoodValues.map((lv) =>
          tx.likelihoodValue.create({
            data: {
              registerId: register.id,
              name: lv.name,
              numericValue: parseFloat(lv.numericValue),
              displayOrder: lv.displayOrder,
              isActive: lv.isActive
            }
          })
        )
      );
      snapshot.likelihoodValues.forEach((lv, i) => {
        likelihoodIdMap.set(lv.id, newLikelihoodValues[i]!.id);
      });

      // Impact values
      const impactIdMap = new Map<string, string>();
      const newImpactValues = await Promise.all(
        snapshot.impactValues.map((iv) =>
          tx.impactValue.create({
            data: {
              registerId: register.id,
              name: iv.name,
              numericValue: parseFloat(iv.numericValue),
              displayOrder: iv.displayOrder,
              isActive: iv.isActive
            }
          })
        )
      );
      snapshot.impactValues.forEach((iv, i) => {
        impactIdMap.set(iv.id, newImpactValues[i]!.id);
      });

      // Risk levels
      const riskLevelIdMap = new Map<string, string>();
      const newRiskLevels = await Promise.all(
        snapshot.riskLevels.map((rl) =>
          tx.riskLevel.create({
            data: {
              registerId: register.id,
              name: rl.name,
              description: rl.description,
              color: rl.color,
              displayOrder: rl.displayOrder,
              isActive: rl.isActive
            }
          })
        )
      );
      snapshot.riskLevels.forEach((rl, i) => {
        riskLevelIdMap.set(rl.id, newRiskLevels[i]!.id);
      });

      // Response strategies
      const responseStrategyIdMap = new Map<string, string>();
      const newResponseStrategies = await Promise.all(
        snapshot.responseStrategies.map((rs) =>
          tx.responseStrategy.create({
            data: {
              registerId: register.id,
              name: rs.name,
              displayOrder: rs.displayOrder,
              isActive: rs.isActive
            }
          })
        )
      );
      snapshot.responseStrategies.forEach((rs, i) => {
        responseStrategyIdMap.set(rs.id, newResponseStrategies[i]!.id);
      });

      // Matrix cells (using mapped IDs)
      const matrixCellIdMap = new Map<string, string>();
      const newMatrixCells = await Promise.all(
        snapshot.matrixCells.map((cell) => {
          const newLikelihoodId = likelihoodIdMap.get(cell.likelihoodValueId);
          const newImpactId = impactIdMap.get(cell.impactValueId);
          const newRiskLevelId = riskLevelIdMap.get(cell.riskLevelId);

          if (!newLikelihoodId || !newImpactId || !newRiskLevelId) {
            throw new ApiError(
              422,
              "UNPROCESSABLE",
              "Template snapshot contains inconsistent matrix cell references"
            );
          }

          return tx.riskMatrixCell.create({
            data: {
              registerId: register.id,
              likelihoodValueId: newLikelihoodId,
              impactValueId: newImpactId,
              riskLevelId: newRiskLevelId
            }
          });
        })
      );
      snapshot.matrixCells.forEach((cell, i) => {
        matrixCellIdMap.set(cell.id, newMatrixCells[i]!.id);
      });

      // Custom fields with options
      const customFieldIdMap = new Map<string, string>();
      const customFieldOptionIdMap = new Map<string, string>();

      for (const field of snapshot.customFields) {
        const newField = await tx.customFieldDefinition.create({
          data: {
            registerId: register.id,
            fieldName: field.fieldName,
            fieldType: field.fieldType as "TEXT" | "MULTILINE_TEXT" | "BOOLEAN" | "NUMBER" | "DATE" | "DROPDOWN" | "PERSON_PICKER",
            helpText: field.helpText,
            isRequired: field.isRequired,
            validationMode: field.validationMode ?? (field.isRequired ? "BLOCK" : "ALLOW"),
            displayOrder: field.displayOrder,
            isActive: field.isActive,
            createdByUserId: actorId,
            updatedByUserId: actorId
          }
        });
        customFieldIdMap.set(field.id, newField.id);

        for (const opt of field.options) {
          const newOpt = await tx.customFieldOption.create({
            data: {
              customFieldDefinitionId: newField.id,
              label: opt.label,
              displayOrder: opt.displayOrder,
              isActive: opt.isActive
            }
          });
          customFieldOptionIdMap.set(opt.id, newOpt.id);
        }
      }

      // 3. Build a new snapshotJson with updated IDs for the config version
      const newSnapshotJson: RegisterConfigSnapshot = {
        register: {
          ...regSettings,
          name: registerName
        },
        customFields: snapshot.customFields.map((field) => ({
          ...field,
          id: customFieldIdMap.get(field.id)!,
          options: field.options.map((opt) => ({
            ...opt,
            id: customFieldOptionIdMap.get(opt.id)!
          }))
        })),
        likelihoodValues: snapshot.likelihoodValues.map((lv) => ({
          ...lv,
          id: likelihoodIdMap.get(lv.id)!
        })),
        impactValues: snapshot.impactValues.map((iv) => ({
          ...iv,
          id: impactIdMap.get(iv.id)!
        })),
        riskLevels: snapshot.riskLevels.map((rl) => ({
          ...rl,
          id: riskLevelIdMap.get(rl.id)!
        })),
        matrixCells: snapshot.matrixCells.map((cell) => ({
          ...cell,
          id: matrixCellIdMap.get(cell.id)!,
          likelihoodValueId: likelihoodIdMap.get(cell.likelihoodValueId)!,
          impactValueId: impactIdMap.get(cell.impactValueId)!,
          riskLevelId: riskLevelIdMap.get(cell.riskLevelId)!
        })),
        responseStrategies: snapshot.responseStrategies.map((rs) => ({
          ...rs,
          id: responseStrategyIdMap.get(rs.id)!
        }))
      };

      // 4. Create a RegisterConfigVersion (PUBLISHED, v1)
      const configVersion = await tx.registerConfigVersion.create({
        data: {
          registerId: register.id,
          versionNumber: 1,
          status: "PUBLISHED",
          snapshotJson: newSnapshotJson as unknown as Prisma.InputJsonValue,
          createdByUserId: actorId,
          publishedAt: new Date()
        }
      });

      // 5. Link register to the config version
      await tx.register.update({
        where: { id: register.id },
        data: { currentConfigVersionId: configVersion.id }
      });

      await tx.register.update({
        where: { id: register.id },
        data: { linkedTemplateVersionId: templateVersionId }
      });

      // 6. Audit event
      await recordAuditEvent(
        {
          action: auditActions.registerCreatedFromTemplate,
          actor: { id: actorId, name: actorName, email: actorEmail },
          objectType: "REGISTER",
          objectId: register.id,
          objectDisplayName: register.name,
          scopeType: "SYSTEM",
          registerId: register.id,
          summary: `Register "${register.name}" created from template "${templateVersion.template.name}"`,
          metadataJson: {
            templateId: templateVersion.template.id,
            templateVersionId: templateVersion.id,
            templateName: templateVersion.template.name
          }
        },
        tx
      );

      return register;
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function unlinkRegisterFromTemplate(
  registerId: string,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true, name: true, linkedTemplateVersionId: true }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  if (!register.linkedTemplateVersionId) {
    throw new ApiError(422, "UNPROCESSABLE", "Register is not linked to a template");
  }

  return prisma.$transaction(async (tx) => {
    await tx.register.update({
      where: { id: registerId },
      data: { linkedTemplateVersionId: null }
    });

    await recordAuditEvent(
      {
        action: auditActions.registerUnlinkedFromTemplate,
        actor: { id: actorId, name: actorName, email: actorEmail },
        objectType: "REGISTER",
        objectId: registerId,
        objectDisplayName: register.name,
        scopeType: "REGISTER",
        registerId,
        summary: `Register "${register.name}" unlinked from template`
      },
      tx
    );

    return { success: true };
  });
}
