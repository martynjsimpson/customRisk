import { ConfigVersionStatus } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type {
  RegisterConfigSnapshot,
  ConfigSnapshotRegisterSettings
} from "../types/configSnapshot.js";
import { recordAuditEvent } from "./audit.service.js";
import { recalculateRiskLevels } from "./matrix.service.js";
import { migrateSimpleResponseActionsToChildRecords, migrateChildRecordsToSimple } from "./responseActions.service.js";
import { evaluateAndStoreCalculatedFields } from "./risks.calculatedFields.service.js";
import { recalculateRiskScores } from "./scoring.service.js";
import { validateScoringFormula } from "./formulaEvaluator.service.js";
import { findRegisterWithVersions } from "./configVersion.shared.js";

export async function analyseImpact(
  registerId: string,
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

  const snapshot = draft.snapshotJson as unknown as RegisterConfigSnapshot;

  type ImpactEntry = {
    type: "BLOCKER" | "WARNING";
    code: string;
    message: string;
    meta?: Record<string, unknown>;
  };

  const blockers: string[] = [];
  const warnings: string[] = [];
  const impactEntries: ImpactEntry[] = [];

  // --- Structural validation (blockers) ---
  const activeLikelihoods = snapshot.likelihoodValues.filter((v) => v.isActive);
  const activeImpacts = snapshot.impactValues.filter((v) => v.isActive);
  const activeRiskLevels = snapshot.riskLevels.filter((v) => v.isActive);
  const activeResponseStrategies = snapshot.responseStrategies.filter((v) => v.isActive);

  if (activeLikelihoods.length === 0) {
    blockers.push("Draft must have at least one active likelihood value");
  }
  if (activeImpacts.length === 0) {
    blockers.push("Draft must have at least one active impact value");
  }
  if (activeRiskLevels.length === 0) {
    blockers.push("Draft must have at least one active risk level");
  }
  if (activeResponseStrategies.length === 0) {
    blockers.push("Draft must have at least one active response strategy");
  }

  // Matrix cell referential integrity
  const snapshotLikelihoodIds = new Set(snapshot.likelihoodValues.map((v) => v.id));
  const snapshotImpactIds = new Set(snapshot.impactValues.map((v) => v.id));
  const snapshotRiskLevelIds = new Set(snapshot.riskLevels.map((v) => v.id));

  for (const cell of snapshot.matrixCells) {
    if (!snapshotLikelihoodIds.has(cell.likelihoodValueId)) {
      blockers.push(
        `Matrix cell references likelihood ID ${cell.likelihoodValueId} which is not in the draft`
      );
    }
    if (!snapshotImpactIds.has(cell.impactValueId)) {
      blockers.push(
        `Matrix cell references impact ID ${cell.impactValueId} which is not in the draft`
      );
    }
    if (!snapshotRiskLevelIds.has(cell.riskLevelId)) {
      blockers.push(
        `Matrix cell references risk level ID ${cell.riskLevelId} which is not in the draft`
      );
    }
  }

  // --- Scoring formula validation ---
  const scoringFormula = (snapshot.register as { scoringFormula?: string }).scoringFormula ?? "";
  if (scoringFormula !== "") {
    const numericFieldIds = snapshot.customFields
      .filter((f) => f.fieldType === "NUMBER" || f.fieldType === "CALCULATED")
      .map((f) => f.id);
    const formulaValidation = validateScoringFormula(scoringFormula, numericFieldIds);
    if (!formulaValidation.valid) {
      blockers.push(`Scoring formula is invalid: ${formulaValidation.error}`);
    }
  }

  // --- Risk-level impact analysis ---
  // Fetch live data to determine what will change
  const [
    liveLikelihoods,
    liveImpacts,
    liveResponseStrategies,
    liveCustomFields,
    risks,
    customFieldValues,
    liveRegister
  ] = await Promise.all([
    prisma.likelihoodValue.findMany({ where: { registerId }, select: { id: true, name: true, isActive: true } }),
    prisma.impactValue.findMany({ where: { registerId }, select: { id: true, name: true, isActive: true } }),
    prisma.responseStrategy.findMany({ where: { registerId }, select: { id: true, name: true, isActive: true } }),
    prisma.customFieldDefinition.findMany({ where: { registerId }, select: { id: true, fieldName: true, fieldType: true, isActive: true } }),
    prisma.risk.findMany({
      where: { registerId },
      select: {
        id: true,
        likelihoodValueId: true,
        impactValueId: true,
        responseStrategyId: true
      }
    }),
    prisma.riskCustomFieldValue.findMany({
      where: { registerId },
      select: {
        riskId: true,
        customFieldDefinitionId: true
      }
    }),
    prisma.register.findUnique({ where: { id: registerId }, select: { responseActionMode: true } })
  ]);

  // Build sets of IDs being deactivated (were active, now inactive or absent in draft)
  const draftLikelihoodMap = new Map(snapshot.likelihoodValues.map((v) => [v.id, v]));
  const draftImpactMap = new Map(snapshot.impactValues.map((v) => [v.id, v]));
  const draftResponseStrategyMap = new Map(snapshot.responseStrategies.map((v) => [v.id, v]));
  const draftCustomFieldMap = new Map(snapshot.customFields.map((v) => [v.id, v]));

  const deactivatingLikelihoodIds = new Set<string>();
  const deactivatingImpactIds = new Set<string>();
  const deactivatingResponseStrategyIds = new Set<string>();
  const deactivatingCustomFieldIds = new Set<string>();

  for (const lv of liveLikelihoods) {
    if (lv.isActive) {
      const draftVersion = draftLikelihoodMap.get(lv.id);
      if (!draftVersion || !draftVersion.isActive) {
        deactivatingLikelihoodIds.add(lv.id);
        warnings.push(`Likelihood '${lv.name}' is active but will be deactivated by the draft`);
      }
    }
  }

  for (const iv of liveImpacts) {
    if (iv.isActive) {
      const draftVersion = draftImpactMap.get(iv.id);
      if (!draftVersion || !draftVersion.isActive) {
        deactivatingImpactIds.add(iv.id);
        warnings.push(`Impact '${iv.name}' is active but will be deactivated by the draft`);
      }
    }
  }

  for (const rs of liveResponseStrategies) {
    if (rs.isActive) {
      const draftVersion = draftResponseStrategyMap.get(rs.id);
      if (!draftVersion || !draftVersion.isActive) {
        deactivatingResponseStrategyIds.add(rs.id);
        warnings.push(`Response strategy '${rs.name}' is active but will be deactivated by the draft`);
      }
    }
  }

  for (const cf of liveCustomFields) {
    if (cf.isActive) {
      const draftVersion = draftCustomFieldMap.get(cf.id);
      if (!draftVersion || !draftVersion.isActive) {
        deactivatingCustomFieldIds.add(cf.id);
        warnings.push(`Custom field '${cf.fieldName}' is active but will be deactivated by the draft`);
      }
    }
    // Field type change warning
    const draftField = draftCustomFieldMap.get(cf.id);
    if (draftField && draftField.fieldType !== cf.fieldType) {
      warnings.push(
        `Custom field '${cf.fieldName}' type will change from '${cf.fieldType}' to '${draftField.fieldType}'`
      );
    }
  }

  // Count affected risks
  const affectedRiskIds = new Set<string>();

  let deactivatedLikelihoodCount = 0;
  let deactivatedImpactCount = 0;
  let deactivatedResponseStrategyCount = 0;
  let deactivatedCustomFieldCount = 0;

  for (const risk of risks) {
    if (risk.likelihoodValueId && deactivatingLikelihoodIds.has(risk.likelihoodValueId)) {
      deactivatedLikelihoodCount++;
      affectedRiskIds.add(risk.id);
    }
    if (risk.impactValueId && deactivatingImpactIds.has(risk.impactValueId)) {
      deactivatedImpactCount++;
      affectedRiskIds.add(risk.id);
    }
    if (risk.responseStrategyId && deactivatingResponseStrategyIds.has(risk.responseStrategyId)) {
      deactivatedResponseStrategyCount++;
      affectedRiskIds.add(risk.id);
    }
  }

  for (const cfv of customFieldValues) {
    if (deactivatingCustomFieldIds.has(cfv.customFieldDefinitionId)) {
      deactivatedCustomFieldCount++;
      affectedRiskIds.add(cfv.riskId);
    }
  }

  // --- responseActionMode change analysis ---
  // snapshotMode is intentionally left as undefined when the field is absent — legacy snapshots
  // created before responseActionMode was captured must be treated as a no-op, not as a
  // deliberate request to revert to SIMPLE.
  const snapshotMode = (snapshot.register as { responseActionMode?: string }).responseActionMode;
  const currentMode = liveRegister?.responseActionMode ?? "SIMPLE";

  if (snapshotMode !== undefined) {
  if (snapshotMode === "CHILD_RECORDS" && currentMode === "SIMPLE") {
    const msg = "Publishing will migrate existing simple response action values to child action records.";
    warnings.push(msg);
    impactEntries.push({
      type: "WARNING",
      code: "MODE_WILL_MIGRATE_TO_CHILD_RECORDS",
      message: msg
    });
    // Risks with a non-empty simple responseAction field will have a child record created
    const risksWithSimpleAction = await prisma.risk.findMany({
      where: {
        registerId,
        state: { not: "CLOSED" },
        responseAction: { not: null }
      },
      select: { id: true }
    });
    for (const r of risksWithSimpleAction) {
      affectedRiskIds.add(r.id);
    }
  } else if (snapshotMode === "SIMPLE" && currentMode === "CHILD_RECORDS") {
    // Feasibility check: any risk with >= 2 non-deleted actions blocks the revert
    const actionCounts = await prisma.$queryRaw<{ risk_id: string; cnt: bigint }[]>`
      SELECT rra.risk_id, COUNT(ra.id) AS cnt
      FROM risk_response_action rra
      JOIN response_action ra ON ra.id = rra.response_action_id
      JOIN risk r ON r.id = rra.risk_id
      WHERE rra.register_id = ${registerId}
        AND ra.is_deleted   = false
        AND r.state        <> 'CLOSED'
      GROUP BY rra.risk_id
      HAVING COUNT(ra.id) >= 2
    `;

    if (actionCounts.length > 0) {
      const offendingRiskIds = actionCounts.map((r) => r.risk_id);
      const offendingRisks = await prisma.risk.findMany({
        where: { id: { in: offendingRiskIds } },
        select: { id: true, displayRiskId: true, title: true }
      });

      const blockerMsg =
        "Cannot revert Response Action mode to Simple: the following risks have 2 or more active action records. Reduce each to a single action (or delete all actions) before publishing.";
      blockers.push(blockerMsg);
      impactEntries.push({
        type: "BLOCKER",
        code: "REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS",
        message: blockerMsg,
        meta: {
          offendingRisks: offendingRisks.map((r) => ({
            riskId: r.id,
            displayRiskId: r.displayRiskId,
            title: r.title
          }))
        }
      });
      for (const riskId of offendingRiskIds) {
        affectedRiskIds.add(riskId);
      }
    } else {
      const revertMsg =
        "Publishing will revert Response Action mode to Simple. Each risk's most recent action text will be written back to the simple response field, and all child action records will be soft-deleted.";
      warnings.push(revertMsg);
      impactEntries.push({
        type: "WARNING",
        code: "REVERT_MODE_WILL_MIGRATE",
        message: revertMsg
      });
      // Risks with >= 1 active action will have their action migrated back to the simple field
      const migratingCounts = await prisma.$queryRaw<{ risk_id: string }[]>`
        SELECT rra.risk_id
        FROM risk_response_action rra
        JOIN response_action ra ON ra.id = rra.response_action_id
        JOIN risk r ON r.id = rra.risk_id
        WHERE rra.register_id = ${registerId}
          AND ra.is_deleted   = false
          AND r.state        <> 'CLOSED'
        GROUP BY rra.risk_id
        HAVING COUNT(ra.id) >= 1
      `;
      for (const row of migratingCounts) {
        affectedRiskIds.add(row.risk_id);
      }
    }
  }
  } // end snapshotMode !== undefined

  const result = {
    affectedRisks: {
      deactivatedLikelihood: deactivatedLikelihoodCount,
      deactivatedImpact: deactivatedImpactCount,
      deactivatedResponseStrategy: deactivatedResponseStrategyCount,
      deactivatedCustomField: deactivatedCustomFieldCount,
      total: affectedRiskIds.size
    },
    warnings,
    blockers,
    impactEntries,
    canPublish: blockers.length === 0
  };

  await recordAuditEvent({
    action: auditActions.configImpactAnalysed,
    actor: { id: actorId, name: actorName, email: actorEmail },
    objectType: "CONFIG_VERSION",
    objectId: draft.id,
    objectDisplayName: `Draft v${draft.versionNumber}`,
    scopeType: "REGISTER",
    registerId,
    summary: `Impact analysis run for draft configuration v${draft.versionNumber}`,
    metadataJson: {
      blockerCount: blockers.length,
      warningCount: warnings.length,
      canPublish: result.canPublish
    }
  });

  return result;
}

export async function publishDraft(
  registerId: string,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  logger.debug({ registerId, userId: actorId }, "Publishing draft config");
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

  // Run impact analysis to check for blockers
  const impact = await analyseImpact(registerId, actorId, actorName, actorEmail);
  if (!impact.canPublish) {
    throw new ApiError(
      422,
      "UNPROCESSABLE",
      `Cannot publish: ${impact.blockers.join("; ")}`
    );
  }

  const snapshot = draft.snapshotJson as unknown as RegisterConfigSnapshot;

  return prisma.$transaction(async (tx) => {
    // --- Upsert likelihood values ---
    const dbLikelihoods = await tx.likelihoodValue.findMany({ where: { registerId } });
    const dbLikelihoodIds = new Set(dbLikelihoods.map((lv) => lv.id));
    const snapshotLikelihoodIds = new Set(snapshot.likelihoodValues.map((lv) => lv.id));

    for (const lv of snapshot.likelihoodValues) {
      if (dbLikelihoodIds.has(lv.id)) {
        await tx.likelihoodValue.update({
          where: { id: lv.id },
          data: {
            name: lv.name,
            numericValue: lv.numericValue,
            displayOrder: lv.displayOrder,
            isActive: lv.isActive
          }
        });
      } else {
        await tx.likelihoodValue.create({
          data: {
            id: lv.id,
            registerId,
            name: lv.name,
            numericValue: lv.numericValue,
            displayOrder: lv.displayOrder,
            isActive: lv.isActive
          }
        });
      }
    }
    // Deactivate likelihoods absent from snapshot
    for (const lv of dbLikelihoods) {
      if (!snapshotLikelihoodIds.has(lv.id)) {
        await tx.likelihoodValue.update({
          where: { id: lv.id },
          data: { isActive: false }
        });
      }
    }

    // --- Upsert impact values ---
    const dbImpacts = await tx.impactValue.findMany({ where: { registerId } });
    const dbImpactIds = new Set(dbImpacts.map((iv) => iv.id));
    const snapshotImpactIds = new Set(snapshot.impactValues.map((iv) => iv.id));

    for (const iv of snapshot.impactValues) {
      if (dbImpactIds.has(iv.id)) {
        await tx.impactValue.update({
          where: { id: iv.id },
          data: {
            name: iv.name,
            numericValue: iv.numericValue,
            displayOrder: iv.displayOrder,
            isActive: iv.isActive
          }
        });
      } else {
        await tx.impactValue.create({
          data: {
            id: iv.id,
            registerId,
            name: iv.name,
            numericValue: iv.numericValue,
            displayOrder: iv.displayOrder,
            isActive: iv.isActive
          }
        });
      }
    }
    for (const iv of dbImpacts) {
      if (!snapshotImpactIds.has(iv.id)) {
        await tx.impactValue.update({
          where: { id: iv.id },
          data: { isActive: false }
        });
      }
    }

    // --- Upsert risk levels ---
    const dbRiskLevels = await tx.riskLevel.findMany({ where: { registerId } });
    const dbRiskLevelIds = new Set(dbRiskLevels.map((rl) => rl.id));
    const snapshotRiskLevelIds = new Set(snapshot.riskLevels.map((rl) => rl.id));

    for (const rl of snapshot.riskLevels) {
      if (dbRiskLevelIds.has(rl.id)) {
        await tx.riskLevel.update({
          where: { id: rl.id },
          data: {
            name: rl.name,
            description: rl.description ?? null,
            color: rl.color ?? null,
            displayOrder: rl.displayOrder,
            isActive: rl.isActive
          }
        });
      } else {
        await tx.riskLevel.create({
          data: {
            id: rl.id,
            registerId,
            name: rl.name,
            description: rl.description ?? null,
            color: rl.color ?? null,
            displayOrder: rl.displayOrder,
            isActive: rl.isActive
          }
        });
      }
    }
    for (const rl of dbRiskLevels) {
      if (!snapshotRiskLevelIds.has(rl.id)) {
        await tx.riskLevel.update({
          where: { id: rl.id },
          data: { isActive: false }
        });
      }
    }

    // --- Upsert response strategies ---
    const dbResponseStrategies = await tx.responseStrategy.findMany({ where: { registerId } });
    const dbResponseStrategyIds = new Set(dbResponseStrategies.map((rs) => rs.id));
    const snapshotResponseStrategyIds = new Set(snapshot.responseStrategies.map((rs) => rs.id));

    for (const rs of snapshot.responseStrategies) {
      if (dbResponseStrategyIds.has(rs.id)) {
        await tx.responseStrategy.update({
          where: { id: rs.id },
          data: { name: rs.name, displayOrder: rs.displayOrder, isActive: rs.isActive }
        });
      } else {
        await tx.responseStrategy.create({
          data: {
            id: rs.id,
            registerId,
            name: rs.name,
            displayOrder: rs.displayOrder,
            isActive: rs.isActive
          }
        });
      }
    }
    for (const rs of dbResponseStrategies) {
      if (!snapshotResponseStrategyIds.has(rs.id)) {
        await tx.responseStrategy.update({
          where: { id: rs.id },
          data: { isActive: false }
        });
      }
    }

    // --- Upsert custom fields and their options ---
    const dbCustomFields = await tx.customFieldDefinition.findMany({
      where: { registerId },
      include: { options: true }
    });
    const dbCustomFieldMap = new Map(dbCustomFields.map((f) => [f.id, f]));
    const snapshotCustomFieldIds = new Set(snapshot.customFields.map((f) => f.id));

    for (const cf of snapshot.customFields) {
      if (dbCustomFieldMap.has(cf.id)) {
        await tx.customFieldDefinition.update({
          where: { id: cf.id },
          data: {
            fieldName: cf.fieldName,
            helpText: cf.helpText ?? null,
            isRequired: cf.isRequired,
            validationMode: cf.validationMode,
            displayOrder: cf.displayOrder,
            isActive: cf.isActive,
            formula: cf.formula ?? null,
            updatedByUserId: actorId
          }
        });
      } else {
        await tx.customFieldDefinition.create({
          data: {
            id: cf.id,
            registerId,
            fieldName: cf.fieldName,
            fieldType: cf.fieldType as any,
            helpText: cf.helpText ?? null,
            isRequired: cf.isRequired,
            validationMode: cf.validationMode,
            displayOrder: cf.displayOrder,
            isActive: cf.isActive,
            formula: cf.formula ?? null,
            createdByUserId: actorId,
            updatedByUserId: actorId
          }
        });
      }

      // Upsert options
      const dbField = dbCustomFieldMap.get(cf.id);
      const dbOptions = dbField?.options ?? [];
      const dbOptionIds = new Set(dbOptions.map((o) => o.id));
      const snapshotOptionIds = new Set(cf.options.map((o) => o.id));

      for (const opt of cf.options) {
        if (dbOptionIds.has(opt.id)) {
          await tx.customFieldOption.update({
            where: { id: opt.id },
            data: { label: opt.label, displayOrder: opt.displayOrder, isActive: opt.isActive }
          });
        } else {
          await tx.customFieldOption.create({
            data: {
              id: opt.id,
              customFieldDefinitionId: cf.id,
              label: opt.label,
              displayOrder: opt.displayOrder,
              isActive: opt.isActive
            }
          });
        }
      }
      // Deactivate options absent from snapshot
      for (const dbOpt of dbOptions) {
        if (!snapshotOptionIds.has(dbOpt.id)) {
          await tx.customFieldOption.update({
            where: { id: dbOpt.id },
            data: { isActive: false }
          });
        }
      }
    }
    // Deactivate custom fields absent from snapshot
    for (const dbField of dbCustomFields) {
      if (!snapshotCustomFieldIds.has(dbField.id)) {
        await tx.customFieldDefinition.update({
          where: { id: dbField.id },
          data: { isActive: false, updatedByUserId: actorId }
        });
      }
    }

    // --- Replace matrix cells ---
    await tx.riskMatrixCell.deleteMany({ where: { registerId } });
    if (snapshot.matrixCells.length > 0) {
      await tx.riskMatrixCell.createMany({
        data: snapshot.matrixCells.map((mc) => ({
          id: mc.id,
          registerId,
          likelihoodValueId: mc.likelihoodValueId,
          impactValueId: mc.impactValueId,
          riskLevelId: mc.riskLevelId
        }))
      });
    }

    // --- Recalculate risk levels for all open risks against the new matrix ---
    await recalculateRiskLevels(
      { id: actorId, name: actorName, email: actorEmail, isSystemAdmin: true, isActive: true },
      registerId,
      snapshot.matrixCells.map((mc) => ({
        likelihoodValueId: mc.likelihoodValueId,
        impactValueId: mc.impactValueId,
        riskLevelId: mc.riskLevelId
      })),
      tx
    );

    // --- Recalculate risk scores using the scoring formula ---
    const scoreFormula = (snapshot.register as { scoringFormula?: string }).scoringFormula ?? "";
    const scoresUpdated = await recalculateRiskScores(
      { id: actorId, name: actorName, email: actorEmail, isSystemAdmin: true, isActive: true },
      registerId,
      scoreFormula,
      tx
    );

    // --- Recalculate CALCULATED custom fields for all non-CLOSED risks ---
    // This must run after the custom field definition upserts above so that the
    // transaction sees the updated field definitions (including any newly active
    // CALCULATED fields from the snapshot).
    const activeRisks = await tx.risk.findMany({
      where: { registerId, state: { not: "CLOSED" } },
      select: { id: true }
    });
    for (const risk of activeRisks) {
      await evaluateAndStoreCalculatedFields(risk.id, registerId, tx);
    }

    // --- Apply responseActionMode from snapshot (with migration if needed) ---
    // snapshotMode is intentionally left as undefined when the field is absent — legacy snapshots
    // created before responseActionMode was captured must be treated as a no-op, not as a
    // deliberate request to revert to SIMPLE.
    const snapshotMode = (snapshot.register as { responseActionMode?: string }).responseActionMode;
    // Acquire row lock to prevent concurrent publishes from racing the migration
    await tx.$executeRaw`SELECT id FROM register WHERE id = ${registerId} FOR UPDATE`;
    const lockedRegister = await tx.register.findUnique({
      where: { id: registerId },
      select: { responseActionMode: true }
    });
    const currentMode = lockedRegister?.responseActionMode ?? "SIMPLE";

    if (snapshotMode !== undefined && snapshotMode !== currentMode) {
      if (snapshotMode === "CHILD_RECORDS" && currentMode === "SIMPLE") {
        await migrateSimpleResponseActionsToChildRecords(registerId, actorId, tx);
      } else if (snapshotMode === "SIMPLE" && currentMode === "CHILD_RECORDS") {
        await migrateChildRecordsToSimple(registerId, actorId, tx);
      }
    }

    // --- Update register settings ---
    // Apply register settings from snapshot only when draft originated from a template.
    // Register settings are only applied from the snapshot when the draft originated from a
    // template (sourceTemplateVersionId set), because adopting the template's settings is
    // deliberate. For manually-created drafts, direct edits to the register made while the
    // draft was in progress take precedence and must not be overwritten.
    const regSettings: ConfigSnapshotRegisterSettings = snapshot.register;
    await tx.register.update({
      where: { id: registerId },
      data: {
        ...(draft.sourceTemplateVersionId
          ? {
              description: regSettings.description ?? null,
              riskIdPrefix: regSettings.riskIdPrefix ?? null,
              riskIdZeroPaddingEnabled: regSettings.riskIdZeroPaddingEnabled,
              riskIdZeroPaddingWidth: regSettings.riskIdZeroPaddingWidth,
              defaultNewRiskState: regSettings.defaultNewRiskState as any,
              reviewsEnabled: regSettings.reviewsEnabled,
              defaultReviewFrequencyMonths: regSettings.defaultReviewFrequencyMonths,
              reviewAttestationText: regSettings.reviewAttestationText,
              allowViewerExport: regSettings.allowViewerExport,
              customFieldValidationEnabled: regSettings.customFieldValidationEnabled,
              reviewStatusPosition: regSettings.reviewStatusPosition ?? null,
              linkedTemplateVersionId: draft.sourceTemplateVersionId
            }
          : {}),
        // Always promote scoringFormula from the published snapshot so that
        // resolveRiskScoring reads the correct formula on subsequent risk edits.
        scoringFormula: regSettings.scoringFormula ?? "",
        // Only promote responseActionMode when the snapshot explicitly carries the field.
        // Legacy snapshots (field absent) must not overwrite the live register mode.
        ...(snapshotMode !== undefined ? { responseActionMode: snapshotMode as "SIMPLE" | "CHILD_RECORDS" } : {}),
        // Promote draft to current
        currentConfigVersionId: draft.id,
        draftConfigVersionId: null,
        updatedByUserId: actorId
      }
    });

    // --- Mark draft as PUBLISHED ---
    const published = await tx.registerConfigVersion.update({
      where: { id: draft.id },
      data: {
        status: ConfigVersionStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.configPublished,
        actor: { id: actorId, name: actorName, email: actorEmail },
        objectType: "CONFIG_VERSION",
        objectId: draft.id,
        objectDisplayName: `v${draft.versionNumber}`,
        scopeType: "REGISTER",
        registerId,
        summary: `Configuration v${draft.versionNumber} published`,
        metadataJson: {
          versionNumber: draft.versionNumber,
          affectedRisks: impact.affectedRisks.total,
          warningCount: impact.warnings.length,
          scoresRecalculated: scoresUpdated
        }
      },
      tx
    );

    return published;
  });
}
