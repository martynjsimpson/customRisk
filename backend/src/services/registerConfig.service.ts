import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { EffectiveRegisterRole } from "../permissions/effectiveRole.js";
import { getEffectiveRegisterRole } from "../permissions/registerAccess.js";
import type { AuthenticatedActor } from "../types/express.js";
import type { RegisterConfigSnapshot } from "../types/configSnapshot.js";

const registerConfigSelect = {
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
  customFieldValidationEnabled: true,
  reviewStatusPosition: true,
  responseActionMode: true,
  createdAt: true,
  updatedAt: true
};


export function isFieldVisibleToRole(
  visibleToRoles: string[],
  role: EffectiveRegisterRole
): boolean {
  // No restrictions: visible to everyone
  if (visibleToRoles.length === 0) return true;
  // System Admin and Register Admin always see all fields
  if (role === "SYSTEM_ADMIN" || role === "REGISTER_ADMIN") return true;
  return visibleToRoles.includes(role);
}

export function isFieldVisibleToResponseActionOwner(
  visibleToRiskResponseOwners: boolean
): boolean {
  return visibleToRiskResponseOwners;
}

async function assertRegisterExists(registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: registerConfigSelect
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  return register;
}


async function getReferencedConfigurationIds(registerId: string) {
  const [risks, customFieldValues] = await Promise.all([
    prisma.risk.findMany({
      where: { registerId },
      select: {
        ownerUserId: true,
        likelihoodValueId: true,
        impactValueId: true,
        riskLevelId: true,
        responseStrategyId: true
      }
    }),
    prisma.riskCustomFieldValue.findMany({
      where: { registerId },
      select: {
        customFieldDefinitionId: true,
        dropdownOptionId: true,
        personUserId: true
      }
    })
  ]);

  return {
    userIds: [
      ...new Set([
        ...risks.map((risk) => risk.ownerUserId).filter((id): id is string => Boolean(id)),
        ...customFieldValues.map((value) => value.personUserId).filter((id): id is string => Boolean(id))
      ])
    ],
    customFieldDefinitionIds: [
      ...new Set(customFieldValues.map((value) => value.customFieldDefinitionId))
    ],
    dropdownOptionIds: [
      ...new Set(customFieldValues.map((value) => value.dropdownOptionId).filter((id): id is string => Boolean(id)))
    ],
    likelihoodValueIds: [...new Set(risks.map((risk) => risk.likelihoodValueId))],
    impactValueIds: [...new Set(risks.map((risk) => risk.impactValueId))],
    riskLevelIds: [...new Set(risks.map((risk) => risk.riskLevelId))],
    responseStrategyIds: [...new Set(risks.map((risk) => risk.responseStrategyId))]
  };
}

function normalizeSnapshot(snapshot: RegisterConfigSnapshot): RegisterConfigSnapshot {
  return {
    ...snapshot,
    register: {
      ...snapshot.register,
      customFieldValidationEnabled: snapshot.register.customFieldValidationEnabled ?? true,
      reviewStatusPosition: snapshot.register.reviewStatusPosition ?? null
    },
    customFields: snapshot.customFields.map((field) => ({
      ...field,
      validationMode: field.validationMode ?? (field.isRequired ? "BLOCK" : "ALLOW")
    }))
  };
}


export async function getRegisterConfig(registerId: string) {
  const register = await assertRegisterExists(registerId);
  const registerWithDraft = await prisma.register.findUnique({
    where: { id: registerId },
    select: { draftConfigVersionId: true }
  });

  if (registerWithDraft?.draftConfigVersionId) {
    const draft = await prisma.registerConfigVersion.findUnique({
      where: { id: registerWithDraft.draftConfigVersionId },
      select: { snapshotJson: true }
    });

    if (draft) {
      const snapshot = normalizeSnapshot(draft.snapshotJson as unknown as RegisterConfigSnapshot);
      const likelihoodById = new Map(snapshot.likelihoodValues.map((value) => [value.id, value]));
      const impactById = new Map(snapshot.impactValues.map((value) => [value.id, value]));
      const riskLevelById = new Map(snapshot.riskLevels.map((value) => [value.id, value]));

      return {
        register: {
          ...register,
          ...snapshot.register
        },
        customFields: snapshot.customFields.map((field) => ({
          ...field,
          registerId,
          options: field.options.map((option) => ({
            ...option,
            customFieldDefinitionId: field.id
          }))
        })),
        likelihoodValues: snapshot.likelihoodValues,
        impactValues: snapshot.impactValues,
        riskLevels: snapshot.riskLevels,
        matrixCells: snapshot.matrixCells.map((cell) => ({
          ...cell,
          likelihoodValue: likelihoodById.get(cell.likelihoodValueId) ?? null,
          impactValue: impactById.get(cell.impactValueId) ?? null,
          riskLevel: riskLevelById.get(cell.riskLevelId) ?? null
        })),
        responseStrategies: snapshot.responseStrategies
      };
    }
  }

  const [customFields, likelihoodValues, impactValues, riskLevels, matrixCells, responseStrategies] =
    await Promise.all([
      prisma.customFieldDefinition.findMany({
        where: { registerId },
        include: {
          options: {
            orderBy: { displayOrder: "asc" }
          }
        },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.likelihoodValue.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.impactValue.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.riskLevel.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.riskMatrixCell.findMany({
        where: { registerId },
        include: {
          likelihoodValue: true,
          impactValue: true,
          riskLevel: true
        },
        orderBy: [{ likelihoodValue: { displayOrder: "asc" } }, { impactValue: { displayOrder: "asc" } }]
      }),
      prisma.responseStrategy.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      })
    ]);

  return {
    register,
    customFields,
    likelihoodValues,
    impactValues,
    riskLevels,
    matrixCells,
    responseStrategies
  };
}

export async function getRiskFormConfig(registerId: string, actor?: AuthenticatedActor) {
  const register = await assertRegisterExists(registerId);
  const referencedIds = await getReferencedConfigurationIds(registerId);
  const actorRole = actor ? await getEffectiveRegisterRole(actor, registerId) : "REGISTER_ADMIN";

  const [users, customFields, likelihoodValues, impactValues, riskLevels, responseStrategies] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ isActive: true }, { id: { in: referencedIds.userIds } }]
      },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    }),
    prisma.customFieldDefinition.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.customFieldDefinitionIds } }]
      },
      include: {
        options: {
          where: {
            OR: [{ isActive: true }, { id: { in: referencedIds.dropdownOptionIds } }]
          },
          orderBy: { displayOrder: "asc" }
        }
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.likelihoodValue.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.likelihoodValueIds } }]
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.impactValue.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.impactValueIds } }]
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.riskLevel.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.riskLevelIds } }]
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.responseStrategy.findMany({
      where: {
        registerId,
        OR: [{ isActive: true }, { id: { in: referencedIds.responseStrategyIds } }]
      },
      orderBy: { displayOrder: "asc" }
    })
  ]);

  const visibleCustomFields = customFields.filter((f) => isFieldVisibleToRole(f.visibleToRoles, actorRole));

  return {
    states: ["DRAFT", "OPEN", "CLOSED"],
    register: {
      ...register,
      customFieldValidationEnabled: register.customFieldValidationEnabled
    },
    users,
    customFields: visibleCustomFields,
    likelihoodValues,
    impactValues,
    riskLevels,
    responseStrategies
  };
}
