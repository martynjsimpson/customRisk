import { prisma } from "../db/prisma.js";
import { auditActions } from "../audit/auditActions.js";
import { ApiError } from "../errors/apiError.js";
import { recordAuditEvent } from "./audit.service.js";
import type { RegisterConfigSnapshot } from "../types/configSnapshot.js";

async function buildSnapshotFromLiveTables(registerId: string): Promise<RegisterConfigSnapshot> {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: {
      name: true,
      description: true,
      riskIdPrefix: true,
      riskIdZeroPaddingEnabled: true,
      riskIdZeroPaddingWidth: true,
      defaultNewRiskState: true,
      reviewsEnabled: true,
      defaultReviewFrequencyMonths: true,
      reviewAttestationText: true,
      reviewCommentMode: true,
      allowViewerExport: true,
      customFieldValidationEnabled: true,
      reviewStatusPosition: true,
      scoringFormula: true,
      responseActionMode: true
    }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
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
        orderBy: [
          { likelihoodValue: { displayOrder: "asc" } },
          { impactValue: { displayOrder: "asc" } }
        ]
      }),
      prisma.responseStrategy.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      })
    ]);

  return {
    register: {
      name: register.name,
      description: register.description,
      riskIdPrefix: register.riskIdPrefix,
      riskIdZeroPaddingEnabled: register.riskIdZeroPaddingEnabled,
      riskIdZeroPaddingWidth: register.riskIdZeroPaddingWidth,
      defaultNewRiskState: register.defaultNewRiskState,
      reviewsEnabled: register.reviewsEnabled,
      defaultReviewFrequencyMonths: register.defaultReviewFrequencyMonths,
      reviewAttestationText: register.reviewAttestationText,
      reviewCommentMode: register.reviewCommentMode,
      allowViewerExport: register.allowViewerExport,
      customFieldValidationEnabled: register.customFieldValidationEnabled,
      reviewStatusPosition: register.reviewStatusPosition,
      scoringFormula: register.scoringFormula,
      responseActionMode: register.responseActionMode
    },
    customFields: customFields.map((field) => ({
      id: field.id,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      helpText: field.helpText,
      isRequired: field.isRequired,
      validationMode: field.validationMode,
      displayOrder: field.displayOrder,
      isActive: field.isActive,
      options: field.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        displayOrder: opt.displayOrder,
        isActive: opt.isActive
      }))
    })),
    likelihoodValues: likelihoodValues.map((lv) => ({
      id: lv.id,
      name: lv.name,
      numericValue: lv.numericValue.toString(),
      displayOrder: lv.displayOrder,
      isActive: lv.isActive
    })),
    impactValues: impactValues.map((iv) => ({
      id: iv.id,
      name: iv.name,
      numericValue: iv.numericValue.toString(),
      displayOrder: iv.displayOrder,
      isActive: iv.isActive
    })),
    riskLevels: riskLevels.map((rl) => ({
      id: rl.id,
      name: rl.name,
      description: rl.description,
      color: rl.color,
      displayOrder: rl.displayOrder,
      isActive: rl.isActive
    })),
    matrixCells: matrixCells.map((cell) => ({
      id: cell.id,
      likelihoodValueId: cell.likelihoodValueId,
      impactValueId: cell.impactValueId,
      riskLevelId: cell.riskLevelId
    })),
    responseStrategies: responseStrategies.map((rs) => ({
      id: rs.id,
      name: rs.name,
      displayOrder: rs.displayOrder,
      isActive: rs.isActive
    }))
  };
}

export async function exportRegisterConfig(
  registerId: string,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: {
      id: true,
      name: true,
      currentConfigVersionId: true,
      currentConfigVersion: {
        select: {
          snapshotJson: true
        }
      }
    }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  let config: RegisterConfigSnapshot;

  if (register.currentConfigVersion) {
    config = register.currentConfigVersion.snapshotJson as unknown as RegisterConfigSnapshot;
  } else {
    config = await buildSnapshotFromLiveTables(registerId);
  }

  const exportedAt = new Date().toISOString();

  await recordAuditEvent({
    action: auditActions.registerConfigExported,
    objectType: "CONFIG_VERSION",
    objectId: registerId,
    objectDisplayName: register.name,
    summary: `Register configuration exported for "${register.name}"`,
    scopeType: "REGISTER",
    actor: { id: actorId, name: actorName, email: actorEmail },
    registerId,
    registerDisplayName: register.name
  });

  return {
    meta: {
      exportedAt,
      schemaVersion: "1.0",
      registerId: register.id,
      registerName: register.name
    },
    config
  };
}
