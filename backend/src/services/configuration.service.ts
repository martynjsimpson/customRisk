import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";

export async function getRiskFormConfig(registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true, defaultNewRiskState: true, reviewsEnabled: true }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  const [users, customFields, likelihoodValues, impactValues, riskLevels, responseStrategies] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    }),
    prisma.customFieldDefinition.findMany({
      where: { registerId, isActive: true },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" }
        }
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.likelihoodValue.findMany({
      where: { registerId, isActive: true },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.impactValue.findMany({
      where: { registerId, isActive: true },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.riskLevel.findMany({
      where: { registerId, isActive: true },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.responseStrategy.findMany({
      where: { registerId, isActive: true },
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
