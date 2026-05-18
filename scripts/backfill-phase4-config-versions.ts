#!/usr/bin/env npx ts-node --esm
// Backfill script for PM4-01: creates an initial PUBLISHED register_config_version (v1)
// for every register that does not already have one, and sets register.current_config_version_id.
//
// Idempotent: safe to re-run. Skips registers that already have a current_config_version_id.
// Run this BEFORE enabling FEATURE_DRAFT_CONFIG.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function buildSnapshot(registerId: string) {
  const [register, customFields, likelihoodValues, impactValues, riskLevels, matrixCells, responseStrategies] =
    await Promise.all([
      prisma.register.findUniqueOrThrow({ where: { id: registerId } }),
      prisma.customFieldDefinition.findMany({
        where: { registerId },
        include: { options: { orderBy: { displayOrder: "asc" } } },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.likelihoodValue.findMany({ where: { registerId }, orderBy: { displayOrder: "asc" } }),
      prisma.impactValue.findMany({ where: { registerId }, orderBy: { displayOrder: "asc" } }),
      prisma.riskLevel.findMany({ where: { registerId }, orderBy: { displayOrder: "asc" } }),
      prisma.riskMatrixCell.findMany({ where: { registerId } }),
      prisma.responseStrategy.findMany({ where: { registerId }, orderBy: { displayOrder: "asc" } })
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
      allowViewerExport: register.allowViewerExport
    },
    customFields: customFields.map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      helpText: f.helpText,
      isRequired: f.isRequired,
      displayOrder: f.displayOrder,
      isActive: f.isActive,
      options: f.options.map((o) => ({
        id: o.id,
        label: o.label,
        displayOrder: o.displayOrder,
        isActive: o.isActive
      }))
    })),
    likelihoodValues: likelihoodValues.map((v) => ({
      id: v.id,
      name: v.name,
      numericValue: v.numericValue.toString(),
      displayOrder: v.displayOrder,
      isActive: v.isActive
    })),
    impactValues: impactValues.map((v) => ({
      id: v.id,
      name: v.name,
      numericValue: v.numericValue.toString(),
      displayOrder: v.displayOrder,
      isActive: v.isActive
    })),
    riskLevels: riskLevels.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      color: l.color,
      displayOrder: l.displayOrder,
      isActive: l.isActive
    })),
    matrixCells: matrixCells.map((c) => ({
      id: c.id,
      likelihoodValueId: c.likelihoodValueId,
      impactValueId: c.impactValueId,
      riskLevelId: c.riskLevelId
    })),
    responseStrategies: responseStrategies.map((s) => ({
      id: s.id,
      name: s.name,
      displayOrder: s.displayOrder,
      isActive: s.isActive
    }))
  };
}

async function main() {
  const registers = await prisma.register.findMany({
    where: { currentConfigVersionId: null },
    select: { id: true, name: true, createdByUserId: true }
  });

  console.log(`Found ${registers.length} register(s) without a config version. Backfilling...`);

  let processed = 0;
  let skipped = 0;

  for (const register of registers) {
    try {
      const snapshot = await buildSnapshot(register.id);

      await prisma.$transaction(async (tx) => {
        const version = await tx.registerConfigVersion.create({
          data: {
            registerId: register.id,
            versionNumber: 1,
            status: "PUBLISHED",
            snapshotJson: snapshot,
            createdByUserId: register.createdByUserId,
            publishedAt: new Date()
          }
        });

        await tx.register.update({
          where: { id: register.id },
          data: { currentConfigVersionId: version.id }
        });
      });

      console.log(`  ✓ ${register.name} (${register.id}) — version 1 created`);
      processed++;
    } catch (err) {
      console.error(`  ✗ ${register.name} (${register.id}) — error:`, err);
      skipped++;
    }
  }

  console.log(`\nDone. Processed: ${processed}, skipped/errored: ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
