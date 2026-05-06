import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";

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
  createdAt: true,
  updatedAt: true
};


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
        ...risks.map((risk) => risk.ownerUserId),
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


export async function getRegisterConfig(registerId: string) {
  const register = await assertRegisterExists(registerId);

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

export async function getRiskFormConfig(registerId: string) {
  const register = await assertRegisterExists(registerId);
  const referencedIds = await getReferencedConfigurationIds(registerId);

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

  return {
    states: ["DRAFT", "OPEN", "CLOSED"],
    register,
    users,
    customFields,
    likelihoodValues,
    impactValues,
    riskLevels,
    responseStrategies
  };
}
