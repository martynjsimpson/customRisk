import type { Prisma } from "@prisma/client";

import { ApiError } from "../errors/apiError.js";
import { formatRiskId } from "../utils/riskId.js";

export async function reserveNextRiskId(client: Prisma.TransactionClient, registerId: string) {
  await client.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "register" WHERE id = ${registerId}::uuid FOR UPDATE
  `;

  const register = await client.register.findUnique({
    where: { id: registerId },
    select: {
      id: true,
      riskIdPrefix: true,
      riskIdZeroPaddingEnabled: true,
      riskIdZeroPaddingWidth: true,
      nextRiskSequence: true,
      defaultNewRiskState: true,
      reviewsEnabled: true,
      defaultReviewFrequencyMonths: true
    }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  const riskSequence = register.nextRiskSequence;
  const displayRiskId = formatRiskId(riskSequence, register);

  await client.register.update({
    where: { id: registerId },
    data: { nextRiskSequence: { increment: 1 } },
    select: { id: true }
  });

  return {
    register,
    riskSequence,
    displayRiskId
  };
}

export async function createRiskRecord(
  client: Prisma.TransactionClient,
  data: Prisma.RiskCreateInput
) {
  return client.risk.create({
    data,
    include: {
      owner: { select: { id: true, name: true, email: true, isActive: true } },
      likelihoodValue: true,
      impactValue: true,
      riskLevel: true,
      responseStrategy: true,
      customFieldValues: true
    }
  });
}
