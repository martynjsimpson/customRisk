import { prisma } from "../db/prisma.js";
import { auditActions } from "../audit/auditActions.js";
import { ApiError } from "../errors/apiError.js";
import { recordAuditEvent } from "./audit.service.js";
import { importBodySchema } from "../validators/configExportImport.schemas.js";
import type { RegisterConfigSnapshot } from "../types/configSnapshot.js";

export async function importRegisterConfig(
  registerId: string,
  importData: unknown,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: {
      id: true,
      name: true,
      draftConfigVersionId: true,
      configVersions: {
        select: { versionNumber: true },
        orderBy: { versionNumber: "desc" },
        take: 1
      }
    }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  if (register.draftConfigVersionId !== null) {
    throw new ApiError(
      409,
      "CONFLICT",
      "A draft configuration already exists for this register. Discard or publish the existing draft before importing."
    );
  }

  const parseResult = importBodySchema.safeParse(importData);
  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
      if (!(key in fields)) {
        fields[key] = issue.message;
      }
    }
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid import payload", fields);
  }

  const parsed = parseResult.data.config;
  // Normalise optional-undefined fields to null to match RegisterConfigSnapshot
  const snapshot: RegisterConfigSnapshot = {
    register: {
      name: parsed.register.name,
      description: parsed.register.description ?? null,
      riskIdPrefix: parsed.register.riskIdPrefix ?? null,
      riskIdZeroPaddingEnabled: parsed.register.riskIdZeroPaddingEnabled,
      riskIdZeroPaddingWidth: parsed.register.riskIdZeroPaddingWidth,
      defaultNewRiskState: parsed.register.defaultNewRiskState,
      reviewsEnabled: parsed.register.reviewsEnabled,
      defaultReviewFrequencyMonths: parsed.register.defaultReviewFrequencyMonths,
      reviewAttestationText: parsed.register.reviewAttestationText,
      allowViewerExport: parsed.register.allowViewerExport,
      customFieldValidationEnabled: parsed.register.customFieldValidationEnabled,
      reviewStatusPosition: parsed.register.reviewStatusPosition ?? null
    },
    customFields: parsed.customFields.map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      helpText: f.helpText ?? null,
      isRequired: f.isRequired,
      validationMode: f.validationMode,
      displayOrder: f.displayOrder,
      isActive: f.isActive,
      options: f.options.map((o) => ({
        id: o.id,
        label: o.label,
        displayOrder: o.displayOrder,
        isActive: o.isActive
      }))
    })),
    likelihoodValues: parsed.likelihoodValues,
    impactValues: parsed.impactValues,
    riskLevels: parsed.riskLevels.map((rl) => ({
      id: rl.id,
      name: rl.name,
      description: rl.description ?? null,
      color: rl.color ?? null,
      displayOrder: rl.displayOrder,
      isActive: rl.isActive
    })),
    matrixCells: parsed.matrixCells,
    responseStrategies: parsed.responseStrategies
  };

  const latestVersionNumber = register.configVersions[0]?.versionNumber ?? 0;
  const nextVersionNumber = latestVersionNumber + 1;

  const draft = await prisma.$transaction(async (tx) => {
    const newVersion = await tx.registerConfigVersion.create({
      data: {
        registerId,
        versionNumber: nextVersionNumber,
        status: "DRAFT",
        snapshotJson: snapshot as object,
        createdByUserId: actorId
      }
    });

    await tx.register.update({
      where: { id: registerId },
      data: { draftConfigVersionId: newVersion.id }
    });

    return newVersion;
  });

  await recordAuditEvent({
    action: auditActions.registerConfigImported,
    objectType: "CONFIG_VERSION",
    objectId: draft.id,
    objectDisplayName: register.name,
    summary: `Register configuration imported for "${register.name}" — draft v${nextVersionNumber} created`,
    scopeType: "REGISTER",
    actor: { id: actorId, name: actorName, email: actorEmail },
    registerId,
    registerDisplayName: register.name
  });

  return {
    draft: {
      id: draft.id,
      registerId: draft.registerId,
      versionNumber: draft.versionNumber,
      status: draft.status,
      createdAt: draft.createdAt
    },
    message: "Configuration imported successfully. A new draft has been created and is ready for review and publishing."
  };
}
