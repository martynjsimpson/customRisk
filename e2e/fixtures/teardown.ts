/**
 * E2E fixture teardown script — destructive.
 *
 * Removes all E2E-created records from the database, identified by:
 * - Users with emails ending in @test.local
 * - Registers with names prefixed with e2e-
 * - Response actions with descriptions prefixed with e2e-
 *
 * Run via: npm run e2e:teardown
 *
 * WARNING: This script deletes data. Run it only after a test session
 * completes. Do not run against a production database.
 *
 * See: docs/spikes/SPIKE-003.md §4.4 for the fixture strategy.
 * See: docs/decisions/ADR-0011-e2e-test-layer.md §2.4
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting E2E fixture teardown...");

  // -------------------------------------------------------------------------
  // Deletion order respects foreign key constraints:
  // child records must be removed before parent records.
  //
  // Register cascades handle: permissions, risks, risk reviews, custom field
  // definitions and values, audit events, etc.
  //
  // ResponseAction links (RiskResponseAction) are deleted by cascade when
  // either the risk or the response action is deleted.
  // -------------------------------------------------------------------------

  // 1. Find e2e users (needed for response action owner filter)
  const e2eUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@test.local" } },
    select: { id: true, email: true },
  });
  const e2eUserIds = e2eUsers.map((u) => u.id);
  console.log(`Found ${e2eUsers.length} E2E user(s) to remove.`);

  // 2. Remove standalone response actions owned by e2e users
  //    (RiskResponseAction join rows are cascade-deleted when the ResponseAction is deleted)
  if (e2eUserIds.length > 0) {
    const deletedActions = await prisma.responseAction.deleteMany({
      where: { ownerUserId: { in: e2eUserIds } },
    });
    console.log(`Deleted ${deletedActions.count} response action(s).`);
  }

  // 3. Remove e2e registers (cascades to: permissions, risks, risk reviews,
  //    custom field definitions, custom field values, matrix values, audit events, etc.)
  const deletedRegisters = await prisma.register.deleteMany({
    where: { name: { startsWith: "e2e-" } },
  });
  console.log(`Deleted ${deletedRegisters.count} register(s) (and all cascaded records).`);

  // 4. Remove e2e users last (after register cascade has removed all foreign refs)
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { endsWith: "@test.local" } },
  });
  console.log(`Deleted ${deletedUsers.count} user(s).`);

  console.log("\nE2E fixture teardown complete.");
}

main()
  .catch((err) => {
    console.error("E2E teardown failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
