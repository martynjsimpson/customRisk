#!/usr/bin/env npx ts-node --esm
// Backfill script for PM5-01: sets validation_mode on custom_field_definition rows.
// - is_required=true  → BLOCK  (matches previous behaviour: save was blocked)
// - is_required=false → ALLOW  (matches previous behaviour: no validation check)
//
// Idempotent: safe to re-run.
// Run this after applying the 20260608000002_phase5_validation_mode migration.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [blockCount, allowCount] = await Promise.all([
    prisma.customFieldDefinition.updateMany({
      where: { isRequired: true },
      data: { validationMode: "BLOCK" }
    }),
    prisma.customFieldDefinition.updateMany({
      where: { isRequired: false },
      data: { validationMode: "ALLOW" }
    })
  ]);

  console.log(`Set BLOCK on ${blockCount.count} required fields`);
  console.log(`Set ALLOW on ${allowCount.count} non-required fields`);
  console.log("Backfill complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
