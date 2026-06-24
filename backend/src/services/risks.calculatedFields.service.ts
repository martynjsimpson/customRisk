import { Prisma } from "@prisma/client";

import { decimalOrNull } from "../utils/formatters.js";
import { evaluateFormula, FormulaEvaluationError, type FormulaContext } from "./formulaEvaluator.service.js";

export async function evaluateAndStoreCalculatedFields(
  riskId: string,
  registerId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const calculatedFields = await tx.customFieldDefinition.findMany({
    where: { registerId, isActive: true, fieldType: "CALCULATED", formula: { not: null } },
    select: { id: true, formula: true }
  });
  if (calculatedFields.length === 0) return;

  const [riskRow, scalarValues] = await Promise.all([
    tx.risk.findUnique({
      where: { id: riskId },
      select: {
        riskScore: true,
        likelihoodValue: { select: { numericValue: true } },
        impactValue: { select: { numericValue: true } }
      }
    }),
    tx.riskCustomFieldValue.findMany({
      where: { riskId, registerId },
      select: { customFieldDefinitionId: true, numberValue: true }
    })
  ]);

  const fieldValues: Record<string, number | null> = {};
  for (const sv of scalarValues) {
    fieldValues[sv.customFieldDefinitionId] = sv.numberValue ? decimalOrNull(sv.numberValue) : null;
  }

  const ctx: FormulaContext = {
    fieldValues,
    score: decimalOrNull(riskRow?.riskScore ?? null),
    likelihood: decimalOrNull(riskRow?.likelihoodValue?.numericValue ?? null),
    impact: decimalOrNull(riskRow?.impactValue?.numericValue ?? null)
  };

  for (const field of calculatedFields) {
    if (!field.formula) continue;
    let computed: string;
    try {
      const result = evaluateFormula(field.formula, ctx);
      computed = isFinite(result) ? String(result) : "0";
    } catch (err) {
      if (err instanceof FormulaEvaluationError) {
        computed = "";
      } else {
        throw err;
      }
    }

    await tx.riskCustomFieldValue.upsert({
      where: { riskId_customFieldDefinitionId: { riskId, customFieldDefinitionId: field.id } },
      create: { riskId, registerId, customFieldDefinitionId: field.id, textValue: computed },
      update: { textValue: computed }
    });
  }
}
