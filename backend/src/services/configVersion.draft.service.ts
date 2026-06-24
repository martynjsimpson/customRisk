import { ConfigVersionStatus } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type {
  RegisterConfigSnapshot
} from "../types/configSnapshot.js";
import type { UpdateDraftBody } from "../validators/configVersion.schemas.js";
import { recordAuditEvent } from "./audit.service.js";
import { findRegisterWithVersions } from "./configVersion.shared.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

export function normalizeCustomFieldValidationMode<T extends { isRequired: boolean; validationMode?: "ALLOW" | "WARN" | "BLOCK" }>(
  field: T
): T & { validationMode: "ALLOW" | "WARN" | "BLOCK" } {
  return {
    ...field,
    validationMode: field.validationMode ?? (field.isRequired ? "BLOCK" : "ALLOW")
  };
}

export function normalizeSnapshot(snapshot: RegisterConfigSnapshot): RegisterConfigSnapshot {
  return {
    ...snapshot,
    register: {
      ...snapshot.register,
      customFieldValidationEnabled: snapshot.register.customFieldValidationEnabled ?? true,
      reviewStatusPosition: snapshot.register.reviewStatusPosition ?? null,
      scoringFormula: snapshot.register.scoringFormula ?? "",
      responseActionMode: snapshot.register.responseActionMode ?? "SIMPLE"
    },
    customFields: snapshot.customFields.map((field) => normalizeCustomFieldValidationMode(field))
  };
}

async function buildSnapshotFromRelationalTables(registerId: string): Promise<RegisterConfigSnapshot> {
  const [register, customFields, likelihoodValues, impactValues, riskLevels, matrixCells, responseStrategies] =
    await Promise.all([
      prisma.register.findUnique({
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
          allowViewerExport: true,
          customFieldValidationEnabled: true,
          reviewStatusPosition: true,
          scoringFormula: true,
          responseActionMode: true
        }
      }),
      prisma.customFieldDefinition.findMany({
        where: { registerId },
        include: { options: { orderBy: { displayOrder: "asc" } } },
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
        where: { registerId }
      }),
      prisma.responseStrategy.findMany({
        where: { registerId },
        orderBy: { displayOrder: "asc" }
      })
    ]);

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

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
      allowViewerExport: register.allowViewerExport,
      customFieldValidationEnabled: register.customFieldValidationEnabled,
      reviewStatusPosition: register.reviewStatusPosition,
      scoringFormula: register.scoringFormula,
      responseActionMode: register.responseActionMode
    },
    customFields: customFields.map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      helpText: f.helpText,
      isRequired: f.isRequired,
      validationMode: f.validationMode,
      displayOrder: f.displayOrder,
      isActive: f.isActive,
      formula: f.formula ?? null,
      options: f.options.map((o) => ({
        id: o.id,
        label: o.label,
        displayOrder: o.displayOrder,
        isActive: o.isActive
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
    matrixCells: matrixCells.map((mc) => ({
      id: mc.id,
      likelihoodValueId: mc.likelihoodValueId,
      impactValueId: mc.impactValueId,
      riskLevelId: mc.riskLevelId
    })),
    responseStrategies: responseStrategies.map((rs) => ({
      id: rs.id,
      name: rs.name,
      displayOrder: rs.displayOrder,
      isActive: rs.isActive
    }))
  };
}

async function getNextVersionNumber(registerId: string): Promise<number> {
  const latest = await prisma.registerConfigVersion.aggregate({
    where: { registerId },
    _max: { versionNumber: true }
  });
  return (latest._max.versionNumber ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

export async function getConfigVersionStatus(registerId: string) {
  const register = await findRegisterWithVersions(registerId);

  const [currentVersion, draftVersion] = await Promise.all([
    register.currentConfigVersionId
      ? prisma.registerConfigVersion.findUnique({
          where: { id: register.currentConfigVersionId }
        })
      : null,
    register.draftConfigVersionId
      ? prisma.registerConfigVersion.findUnique({
          where: { id: register.draftConfigVersionId }
        })
      : null
  ]);

  return {
    currentVersion: currentVersion ?? null,
    draftVersion: draftVersion ?? null,
    hasDraft: register.draftConfigVersionId !== null
  };
}

export async function createDraft(
  registerId: string,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const register = await findRegisterWithVersions(registerId);

  if (register.draftConfigVersionId !== null) {
    throw new ApiError(409, "CONFLICT", "A draft configuration already exists for this register");
  }

  // Build snapshot — either clone existing published version or build from relational tables
  let snapshotJson: RegisterConfigSnapshot;
  if (register.currentConfigVersionId) {
    const current = await prisma.registerConfigVersion.findUnique({
      where: { id: register.currentConfigVersionId }
    });
    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Current config version not found");
    }
    snapshotJson = current.snapshotJson as unknown as RegisterConfigSnapshot;
  } else {
    snapshotJson = await buildSnapshotFromRelationalTables(registerId);
  }

  const versionNumber = await getNextVersionNumber(registerId);

  return prisma.$transaction(async (tx) => {
    const draft = await tx.registerConfigVersion.create({
      data: {
        registerId,
        versionNumber,
        status: ConfigVersionStatus.DRAFT,
        snapshotJson: snapshotJson as object,
        createdByUserId: actorId
      }
    });

    await tx.register.update({
      where: { id: registerId },
      data: { draftConfigVersionId: draft.id }
    });

    await recordAuditEvent(
      {
        action: auditActions.configDraftCreated,
        actor: { id: actorId, name: actorName, email: actorEmail },
        objectType: "CONFIG_VERSION",
        objectId: draft.id,
        objectDisplayName: `Draft v${versionNumber}`,
        scopeType: "REGISTER",
        registerId,
        summary: `Draft configuration v${versionNumber} created`
      },
      tx
    );

    return draft;
  });
}

export async function updateDraft(
  registerId: string,
  patch: UpdateDraftBody,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const register = await findRegisterWithVersions(registerId);

  if (!register.draftConfigVersionId) {
    throw new ApiError(404, "NOT_FOUND", "No draft configuration exists for this register");
  }

  const draft = await prisma.registerConfigVersion.findUnique({
    where: { id: register.draftConfigVersionId }
  });

  if (!draft) {
    throw new ApiError(404, "NOT_FOUND", "Draft configuration version not found");
  }

  const existing = normalizeSnapshot(draft.snapshotJson as unknown as RegisterConfigSnapshot);

  const merged: RegisterConfigSnapshot = {
    register: patch.register
      ? { ...existing.register, ...patch.register }
      : existing.register,
    customFields: patch.customFields !== undefined
      ? patch.customFields.map((f) => normalizeCustomFieldValidationMode({ ...f, helpText: f.helpText ?? null }))
      : existing.customFields,
    likelihoodValues:
      patch.likelihoodValues !== undefined ? patch.likelihoodValues : existing.likelihoodValues,
    impactValues: patch.impactValues !== undefined ? patch.impactValues : existing.impactValues,
    riskLevels: patch.riskLevels !== undefined
      ? patch.riskLevels.map((rl) => ({ ...rl, description: rl.description ?? null, color: rl.color ?? null }))
      : existing.riskLevels,
    matrixCells: patch.matrixCells !== undefined ? patch.matrixCells : existing.matrixCells,
    responseStrategies:
      patch.responseStrategies !== undefined
        ? patch.responseStrategies
        : existing.responseStrategies
  };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.registerConfigVersion.update({
      where: { id: draft.id },
      data: { snapshotJson: merged as object }
    });

    await recordAuditEvent(
      {
        action: auditActions.configDraftUpdated,
        actor: { id: actorId, name: actorName, email: actorEmail },
        objectType: "CONFIG_VERSION",
        objectId: draft.id,
        objectDisplayName: `Draft v${draft.versionNumber}`,
        scopeType: "REGISTER",
        registerId,
        summary: `Draft configuration v${draft.versionNumber} updated`,
        metadataJson: { patchedSections: Object.keys(patch) }
      },
      tx
    );

    return updated;
  });
}

export async function discardDraft(
  registerId: string,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  logger.debug({ registerId, userId: actorId }, "Discarding draft config");
  const register = await findRegisterWithVersions(registerId);

  if (!register.draftConfigVersionId) {
    throw new ApiError(404, "NOT_FOUND", "No draft configuration exists for this register");
  }

  const draftId = register.draftConfigVersionId;

  const draft = await prisma.registerConfigVersion.findUnique({
    where: { id: draftId }
  });

  if (!draft) {
    throw new ApiError(404, "NOT_FOUND", "Draft configuration version not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.register.update({
      where: { id: registerId },
      data: { draftConfigVersionId: null }
    });

    await tx.registerConfigVersion.delete({
      where: { id: draftId }
    });

    await recordAuditEvent(
      {
        action: auditActions.configDraftDiscarded,
        actor: { id: actorId, name: actorName, email: actorEmail },
        objectType: "CONFIG_VERSION",
        objectId: draftId,
        objectDisplayName: `Draft v${draft.versionNumber}`,
        scopeType: "REGISTER",
        registerId,
        summary: `Draft configuration v${draft.versionNumber} discarded`
      },
      tx
    );
  });
}

export async function listConfigVersions(registerId: string) {
  await findRegisterWithVersions(registerId);

  return prisma.registerConfigVersion.findMany({
    where: { registerId },
    orderBy: { versionNumber: "desc" }
  });
}
