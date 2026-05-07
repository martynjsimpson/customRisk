/**
 * Phase 2 backfill: create PersonReference rows for all existing user-backed
 * risk owner and person picker assignments, then populate the new FK columns.
 *
 * Safe to re-run (idempotent — uses upsert by email).
 */

import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(scriptDir, "../../.env") });
loadEnv();

const prisma = new PrismaClient();

async function main() {
  console.log("Phase 2 backfill: PersonReference");

  // ── 1. Collect all distinct users referenced as risk owners ────────────────
  const riskOwnerUsers = await prisma.user.findMany({
    where: {
      risksOwned: { some: {} }
    },
    select: { id: true, email: true, name: true }
  });

  console.log(`Found ${riskOwnerUsers.length} distinct risk owner user(s)`);

  // Upsert a PersonReference for each and map userId → personReferenceId
  const userIdToPersonRefId = new Map<string, string>();

  for (const u of riskOwnerUsers) {
    const ref = await prisma.personReference.upsert({
      where: { email: u.email.toLowerCase() },
      create: {
        email: u.email.toLowerCase(),
        userId: u.id,
        displayName: u.name,
        resolvedAt: new Date()
      },
      update: {
        userId: u.id,
        displayName: u.name,
        resolvedAt: new Date()
      },
      select: { id: true }
    });
    userIdToPersonRefId.set(u.id, ref.id);
  }

  // Update risks that still have a null ownerPersonId
  let riskOwnerUpdated = 0;
  for (const [userId, personRefId] of userIdToPersonRefId) {
    const { count } = await prisma.risk.updateMany({
      where: { ownerUserId: userId, ownerPersonId: null },
      data: { ownerPersonId: personRefId }
    });
    riskOwnerUpdated += count;
  }
  console.log(`Updated ownerPersonId on ${riskOwnerUpdated} risk(s)`);

  // ── 2. Collect all distinct users referenced as person picker values ────────
  const pickerUsers = await prisma.user.findMany({
    where: {
      riskCustomPersonValues: { some: {} }
    },
    select: { id: true, email: true, name: true }
  });

  console.log(`Found ${pickerUsers.length} distinct person picker user(s)`);

  for (const u of pickerUsers) {
    if (!userIdToPersonRefId.has(u.id)) {
      const ref = await prisma.personReference.upsert({
        where: { email: u.email.toLowerCase() },
        create: {
          email: u.email.toLowerCase(),
          userId: u.id,
          displayName: u.name,
          resolvedAt: new Date()
        },
        update: {
          userId: u.id,
          displayName: u.name,
          resolvedAt: new Date()
        },
        select: { id: true }
      });
      userIdToPersonRefId.set(u.id, ref.id);
    }
  }

  // Update custom field values where personId is still null
  let pickerUpdated = 0;
  for (const u of pickerUsers) {
    const personRefId = userIdToPersonRefId.get(u.id)!;
    const { count } = await prisma.riskCustomFieldValue.updateMany({
      where: { personUserId: u.id, personId: null },
      data: { personId: personRefId }
    });
    pickerUpdated += count;
  }
  console.log(`Updated personId on ${pickerUpdated} custom field value(s)`);

  console.log("Backfill complete.");
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
