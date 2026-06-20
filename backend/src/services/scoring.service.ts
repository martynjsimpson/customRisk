import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import { auditActions } from "../audit/auditActions.js";
import { recordAuditEvent } from "./audit.service.js";
import { evaluateFormula, validateScoringFormula } from "./formulaEvaluator.service.js";

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

export async function recalculateRiskScores(
  actor: AuthenticatedActor,
  registerId: string,
  formula: string,
  tx: Prisma.TransactionClient
): Promise<number> {
  const effectiveFormula = formula === "" ? "{likelihood} * {impact}" : formula;

  // Fetch numeric custom field definitions for this register
  const numericFieldDefs = await tx.customFieldDefinition.findMany({
    where: {
      registerId,
      fieldType: { in: ["NUMBER", "CALCULATED"] },
      isActive: true
    },
    select: { id: true }
  });

  const availableFieldKeys = numericFieldDefs.map((f) => f.id);

  const validation = validateScoringFormula(effectiveFormula, availableFieldKeys);
  if (!validation.valid) {
    throw new Error(`Invalid scoring formula at publish time: ${validation.error}`);
  }

  // Fetch all non-CLOSED risks with their likelihood and impact numeric values
  const risks = await tx.risk.findMany({
    where: { registerId, state: { not: "CLOSED" } },
    select: {
      id: true,
      displayRiskId: true,
      riskScore: true,
      likelihoodValue: { select: { numericValue: true } },
      impactValue: { select: { numericValue: true } }
    }
  });

  // Fetch all numeric custom field values for the register in one query
  const fieldValues = await tx.riskCustomFieldValue.findMany({
    where: {
      registerId,
      customFieldDefinitionId: { in: availableFieldKeys }
    },
    select: {
      riskId: true,
      customFieldDefinitionId: true,
      numberValue: true,
      textValue: true,
      customFieldDefinition: { select: { fieldType: true } }
    }
  });

  // Build a map: riskId -> fieldDefinitionId -> number | null
  const riskFieldMap = new Map<string, Map<string, number | null>>();
  for (const fv of fieldValues) {
    let riskMap = riskFieldMap.get(fv.riskId);
    if (!riskMap) {
      riskMap = new Map();
      riskFieldMap.set(fv.riskId, riskMap);
    }
    let resolvedValue: number | null = null;
    if (fv.customFieldDefinition.fieldType === "NUMBER" && fv.numberValue !== null) {
      resolvedValue = Number(fv.numberValue);
    } else if (fv.customFieldDefinition.fieldType === "CALCULATED" && fv.textValue !== null) {
      const parsed = parseFloat(fv.textValue);
      resolvedValue = isNaN(parsed) ? null : parsed;
    }
    riskMap.set(fv.customFieldDefinitionId, resolvedValue);
  }

  let updatedCount = 0;

  for (const risk of risks) {
    const riskFieldValues: Record<string, number | null> = {};
    for (const fieldId of availableFieldKeys) {
      riskFieldValues[fieldId] = riskFieldMap.get(risk.id)?.get(fieldId) ?? null;
    }

    const ctx = {
      likelihood: Number(risk.likelihoodValue.numericValue),
      impact: Number(risk.impactValue.numericValue),
      score: null,
      fieldValues: riskFieldValues
    };

    let newScore: number;
    try {
      newScore = evaluateFormula(effectiveFormula, ctx);
    } catch {
      // If formula evaluation fails for this risk, skip it
      continue;
    }

    const newScoreDecimal = new Prisma.Decimal(newScore);
    const oldScore = risk.riskScore;

    if (!newScoreDecimal.equals(oldScore)) {
      await tx.risk.update({
        where: { id: risk.id },
        data: { riskScore: newScoreDecimal }
      });

      await recordAuditEvent(
        {
          action: auditActions.riskUpdated,
          actor: { id: actor.id, name: actor.name, email: actor.email },
          objectType: "RISK",
          objectId: risk.id,
          objectDisplayName: risk.displayRiskId,
          scopeType: "RISK",
          registerId,
          riskId: risk.id,
          displayRiskId: risk.displayRiskId,
          summary: "Risk score recalculated due to scoring formula change",
          fieldChanges: [
            {
              fieldName: "riskScore",
              fieldLabel: "Risk score",
              previousValue: oldScore.toString(),
              newValue: newScoreDecimal.toString(),
              valueType: "NUMBER"
            }
          ]
        },
        tx
      );

      updatedCount++;
    }
  }

  return updatedCount;
}

export async function resolveRiskScoring(
  input: ResolveRiskScoringInput,
  client: ScoringClient = prisma,
  riskId?: string
) {
  const [likelihood, impact, matrixCell, register] = await Promise.all([
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
    }),
    client.register.findUnique({
      where: { id: input.registerId },
      select: { scoringFormula: true }
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

  const formula = register?.scoringFormula ?? "";
  const effectiveFormula = formula === "" ? "{likelihood} * {impact}" : formula;

  // Build field values map from the risk's existing custom field values when a riskId is provided.
  // On create there are no values yet; missing fields resolve to null (treated as 0 by the evaluator).
  let fieldValues: Record<string, number | null> = {};
  if (riskId) {
    const numericFieldDefs = await client.customFieldDefinition.findMany({
      where: { registerId: input.registerId, fieldType: { in: ["NUMBER", "CALCULATED"] }, isActive: true },
      select: { id: true }
    });
    const availableFieldKeys = numericFieldDefs.map((f) => f.id);
    const storedValues = await client.riskCustomFieldValue.findMany({
      where: { riskId, customFieldDefinitionId: { in: availableFieldKeys } },
      select: {
        customFieldDefinitionId: true,
        numberValue: true,
        textValue: true,
        customFieldDefinition: { select: { fieldType: true } }
      }
    });
    for (const fv of storedValues) {
      let resolvedValue: number | null = null;
      if (fv.customFieldDefinition.fieldType === "NUMBER" && fv.numberValue !== null) {
        resolvedValue = Number(fv.numberValue);
      } else if (fv.customFieldDefinition.fieldType === "CALCULATED" && fv.textValue !== null) {
        const parsed = parseFloat(fv.textValue);
        resolvedValue = isNaN(parsed) ? null : parsed;
      }
      fieldValues[fv.customFieldDefinitionId] = resolvedValue;
    }
  }

  const ctx = {
    likelihood: Number(likelihood!.numericValue),
    impact: Number(impact!.numericValue),
    score: null,
    fieldValues
  };

  let riskScore: Prisma.Decimal;
  try {
    const result = evaluateFormula(effectiveFormula, ctx);
    riskScore = new Prisma.Decimal(isFinite(result) ? result : 0);
  } catch {
    // Fall back to default likelihood * impact if the formula fails
    riskScore = calculateRiskScore(likelihood!.numericValue, impact!.numericValue);
  }

  return {
    riskScore,
    riskLevelId: matrixCell!.riskLevelId
  };
}
