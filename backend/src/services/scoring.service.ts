import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";

type ScoringClient = typeof prisma | Prisma.TransactionClient;

export interface ResolveRiskScoringInput {
  registerId: string;
  likelihoodValueId: string;
  impactValueId: string;
}

export interface CalculateNextReviewDateInput {
  reviewsEnabled: boolean;
  baseDate: Date;
  defaultReviewFrequencyMonths: number;
}

export function calculateRiskScore(
  likelihoodNumericValue: Prisma.Decimal.Value,
  impactNumericValue: Prisma.Decimal.Value
) {
  return new Prisma.Decimal(likelihoodNumericValue).mul(impactNumericValue);
}

export function calculateNextReviewDate(input: CalculateNextReviewDateInput) {
  if (!input.reviewsEnabled) {
    return null;
  }

  const nextReviewDate = new Date(
    Date.UTC(
      input.baseDate.getUTCFullYear(),
      input.baseDate.getUTCMonth(),
      input.baseDate.getUTCDate()
    )
  );
  nextReviewDate.setUTCMonth(
    nextReviewDate.getUTCMonth() + input.defaultReviewFrequencyMonths
  );

  return nextReviewDate;
}

export async function resolveRiskScoring(
  input: ResolveRiskScoringInput,
  client: ScoringClient = prisma
) {
  const [likelihood, impact, matrixCell] = await Promise.all([
    client.likelihoodValue.findFirst({
      where: {
        id: input.likelihoodValueId,
        registerId: input.registerId,
        isActive: true
      },
      select: { id: true, numericValue: true }
    }),
    client.impactValue.findFirst({
      where: {
        id: input.impactValueId,
        registerId: input.registerId,
        isActive: true
      },
      select: { id: true, numericValue: true }
    }),
    client.riskMatrixCell.findUnique({
      where: {
        registerId_likelihoodValueId_impactValueId: {
          registerId: input.registerId,
          likelihoodValueId: input.likelihoodValueId,
          impactValueId: input.impactValueId
        }
      },
      include: {
        riskLevel: {
          select: { id: true, isActive: true }
        }
      }
    })
  ]);

  const fields: Record<string, string> = {};
  if (!likelihood) {
    fields.likelihoodValueId = "Likelihood value must exist and be active for this register";
  }
  if (!impact) {
    fields.impactValueId = "Impact value must exist and be active for this register";
  }
  if (!matrixCell || !matrixCell.riskLevel.isActive) {
    fields.riskLevelId = "Likelihood and impact must have a configured active risk level";
  }

  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Risk scoring configuration is incomplete", fields);
  }

  return {
    riskScore: calculateRiskScore(likelihood!.numericValue, impact!.numericValue),
    riskLevelId: matrixCell!.riskLevelId
  };
}
