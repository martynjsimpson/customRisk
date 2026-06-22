/**
 * E2E fixture seed script — idempotent.
 *
 * Creates all named users, registers, risks, response actions, and
 * configuration flags required by the E2E permission test suite.
 *
 * Run via: npm run e2e:seed
 *
 * Safe to run multiple times — all upserts are keyed on stable handles
 * (email for users, name for registers/risks/actions) so repeated runs
 * do not duplicate records.
 *
 * See: docs/spikes/SPIKE-003.md §4 for the full fixture design rationale.
 * See: docs/decisions/ADR-0011-e2e-test-layer.md §2.4 for the fixture strategy.
 */

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pgPool) });

const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;
if (!E2E_PASSWORD) {
  throw new Error("E2E_TEST_PASSWORD environment variable must be set before running the seed script.");
}

/**
 * Named fixture users (SPIKE-003 §4.2).
 *
 * sys-admin         — System Admin; covers all admin paths
 * reg-admin-a       — Register Admin on Register A
 * reg-viewer-a      — Register Viewer on Register A
 * risk-owner-a      — Risk Owner on Risk X in Register A (no explicit register role)
 * response-owner-a  — Risk Response Owner on Action A linked to Risk X (no explicit register role)
 * no-access         — Authenticated, no register role; covers unauthenticated-equivalent paths
 */
const USERS = [
  { email: "sys-admin@test.local",      name: "E2E System Admin",      isSystemAdmin: true  },
  { email: "reg-admin-a@test.local",    name: "E2E Register Admin A",  isSystemAdmin: false },
  { email: "reg-viewer-a@test.local",   name: "E2E Register Viewer A", isSystemAdmin: false },
  { email: "risk-owner-a@test.local",   name: "E2E Risk Owner A",      isSystemAdmin: false },
  { email: "response-owner-a@test.local", name: "E2E Response Owner A", isSystemAdmin: false },
  { email: "no-access@test.local",      name: "E2E No Access",         isSystemAdmin: false },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(E2E_PASSWORD!, 10);

  // -------------------------------------------------------------------------
  // 1. Upsert users
  // -------------------------------------------------------------------------

  console.log("Seeding E2E users...");
  const createdUsers: Record<string, { id: string }> = {};

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        isSystemAdmin: u.isSystemAdmin,
        isActive: true,
        passwordHash,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        isSystemAdmin: u.isSystemAdmin,
        isActive: true,
      },
    });
    createdUsers[u.email] = user;
    console.log(`  ${u.email} — ${user.id}`);
  }

  const sysAdmin = createdUsers["sys-admin@test.local"];

  // -------------------------------------------------------------------------
  // 2. Upsert Register A
  //
  // allowViewerExport: false (default) — used to test the viewer-export flag gate
  // reviewsEnabled: true — required for review permission tests
  // responseActionMode: CHILD_RECORDS — required for child record mode tests
  // Custom fields F1 (visible to response owners) and F2 (hidden from response owners)
  // -------------------------------------------------------------------------

  console.log("Seeding Register A...");
  const registerA = await prisma.register.upsert({
    where: { name: "e2e-register-a" },
    update: {
      reviewsEnabled: true,
      allowViewerExport: false,
      responseActionMode: "CHILD_RECORDS",
      isActive: true,
      updatedByUserId: sysAdmin.id,
    },
    create: {
      name: "e2e-register-a",
      description: "E2E fixture register A — cross-register isolation and permission tests",
      reviewsEnabled: true,
      allowViewerExport: false,
      responseActionMode: "CHILD_RECORDS",
      isActive: true,
      createdByUserId: sysAdmin.id,
      updatedByUserId: sysAdmin.id,
    },
  });
  console.log(`  Register A — ${registerA.id}`);

  // -------------------------------------------------------------------------
  // 3. Upsert Register B
  //
  // Minimal configuration; used only for cross-register isolation tests.
  // (Sections 1.9, 3.23, 10.8 etc. — verifying that users with access to
  // Register A cannot see or act on data in Register B)
  // -------------------------------------------------------------------------

  console.log("Seeding Register B...");
  const registerB = await prisma.register.upsert({
    where: { name: "e2e-register-b" },
    update: {
      reviewsEnabled: false,
      isActive: true,
      updatedByUserId: sysAdmin.id,
    },
    create: {
      name: "e2e-register-b",
      description: "E2E fixture register B — cross-register isolation tests only",
      reviewsEnabled: false,
      isActive: true,
      createdByUserId: sysAdmin.id,
      updatedByUserId: sysAdmin.id,
    },
  });
  console.log(`  Register B — ${registerB.id}`);

  // -------------------------------------------------------------------------
  // 4. Register permissions
  //
  // reg-admin-a    → REGISTER_ADMIN on Register A
  // reg-viewer-a   → REGISTER_VIEWER on Register A
  //
  // risk-owner-a and response-owner-a have NO explicit register role — their
  // access derives exclusively from ownership of Risk X / Action A.
  // no-access has no register role on either register.
  // -------------------------------------------------------------------------

  console.log("Seeding register permissions...");

  const regAdminA = createdUsers["reg-admin-a@test.local"];
  const regViewerA = createdUsers["reg-viewer-a@test.local"];

  await prisma.registerPermission.upsert({
    where: {
      registerId_userId_role: {
        registerId: registerA.id,
        userId: regAdminA.id,
        role: "REGISTER_ADMIN",
      },
    },
    update: {},
    create: {
      registerId: registerA.id,
      userId: regAdminA.id,
      role: "REGISTER_ADMIN",
      createdByUserId: sysAdmin.id,
    },
  });

  await prisma.registerPermission.upsert({
    where: {
      registerId_userId_role: {
        registerId: registerA.id,
        userId: regViewerA.id,
        role: "REGISTER_VIEWER",
      },
    },
    update: {},
    create: {
      registerId: registerA.id,
      userId: regViewerA.id,
      role: "REGISTER_VIEWER",
      createdByUserId: sysAdmin.id,
    },
  });

  console.log("  reg-admin-a → REGISTER_ADMIN on Register A");
  console.log("  reg-viewer-a → REGISTER_VIEWER on Register A");

  // -------------------------------------------------------------------------
  // 5. Custom fields on Register A
  //
  // F1 — visible to risk response owners (visibleToRiskResponseOwners: true)
  // F2 — hidden from risk response owners (visibleToRiskResponseOwners: false)
  // -------------------------------------------------------------------------

  console.log("Seeding custom fields on Register A...");

  const fieldF1 = await prisma.customFieldDefinition.upsert({
    where: { registerId_fieldName: { registerId: registerA.id, fieldName: "E2E Field F1" } },
    update: {
      visibleToRiskResponseOwners: true,
      isActive: true,
    },
    create: {
      registerId: registerA.id,
      fieldName: "E2E Field F1",
      fieldType: "TEXT",
      displayOrder: 100,
      isActive: true,
      visibleToRiskResponseOwners: true,
      createdByUserId: sysAdmin.id,
      updatedByUserId: sysAdmin.id,
    },
  });

  const fieldF2 = await prisma.customFieldDefinition.upsert({
    where: { registerId_fieldName: { registerId: registerA.id, fieldName: "E2E Field F2" } },
    update: {
      visibleToRiskResponseOwners: false,
      isActive: true,
    },
    create: {
      registerId: registerA.id,
      fieldName: "E2E Field F2",
      fieldType: "TEXT",
      displayOrder: 110,
      isActive: true,
      visibleToRiskResponseOwners: false,
      createdByUserId: sysAdmin.id,
      updatedByUserId: sysAdmin.id,
    },
  });

  console.log(`  F1 (visible to response owners) — ${fieldF1.id}`);
  console.log(`  F2 (hidden from response owners) — ${fieldF2.id}`);

  // -------------------------------------------------------------------------
  // 6. Seed risks
  //
  // Risk X — owned by risk-owner-a; linked to Action A.
  //   risk-owner-a can view/edit Risk X (owns it)
  //   response-owner-a can view Risk X (via Action A)
  //
  // Risk Y — owned by sys-admin; used to verify risk-owner-a cannot edit a
  //   risk they do not own (SPIKE-003 §4.3, Section 2.17)
  //
  // Risks require a likelihood, impact, and risk level. We seed minimal
  // matrix values if none exist for Register A.
  // -------------------------------------------------------------------------

  console.log("Seeding scoring matrix for Register A...");

  const likelihood = await prisma.likelihoodValue.upsert({
    where: { registerId_name: { registerId: registerA.id, name: "Medium" } },
    update: {},
    create: {
      registerId: registerA.id,
      name: "Medium",
      value: 3,
      displayOrder: 2,
      createdByUserId: sysAdmin.id,
      updatedByUserId: sysAdmin.id,
    },
  });

  const impact = await prisma.impactValue.upsert({
    where: { registerId_name: { registerId: registerA.id, name: "Medium" } },
    update: {},
    create: {
      registerId: registerA.id,
      name: "Medium",
      value: 3,
      displayOrder: 2,
      createdByUserId: sysAdmin.id,
      updatedByUserId: sysAdmin.id,
    },
  });

  const riskLevel = await prisma.riskLevel.upsert({
    where: { registerId_name: { registerId: registerA.id, name: "Medium" } },
    update: {},
    create: {
      registerId: registerA.id,
      name: "Medium",
      minScore: 0,
      maxScore: 100,
      color: "#f59e0b",
      displayOrder: 2,
      createdByUserId: sysAdmin.id,
      updatedByUserId: sysAdmin.id,
    },
  });

  const riskOwnerA = createdUsers["risk-owner-a@test.local"];

  console.log("Seeding Risk X...");

  // Risk X must have a stable displayRiskId. We use the register's next
  // sequence counter to ensure uniqueness on first creation.
  let riskX = await prisma.risk.findFirst({
    where: { registerId: registerA.id, title: "e2e-risk-x" },
  });

  if (!riskX) {
    const seqResult = await prisma.register.update({
      where: { id: registerA.id },
      data: { nextRiskSequence: { increment: 1 } },
      select: { nextRiskSequence: true },
    });
    const seq = seqResult.nextRiskSequence - 1;

    riskX = await prisma.risk.create({
      data: {
        registerId: registerA.id,
        title: "e2e-risk-x",
        description: "E2E fixture risk X — owned by risk-owner-a; linked to Action A",
        state: "OPEN",
        displayRiskId: `E2E-${String(seq).padStart(3, "0")}`,
        riskSequence: seq,
        ownerUserId: riskOwnerA.id,
        createdDate: new Date(),
        likelihoodValueId: likelihood.id,
        impactValueId: impact.id,
        riskScore: 9,
        riskLevelId: riskLevel.id,
        createdByUserId: sysAdmin.id,
        updatedByUserId: sysAdmin.id,
      },
    });
  } else {
    riskX = await prisma.risk.update({
      where: { id: riskX.id },
      data: {
        ownerUserId: riskOwnerA.id,
        state: "OPEN",
        updatedByUserId: sysAdmin.id,
      },
    });
  }

  console.log(`  Risk X — ${riskX.id}`);

  console.log("Seeding Risk Y...");

  let riskY = await prisma.risk.findFirst({
    where: { registerId: registerA.id, title: "e2e-risk-y" },
  });

  if (!riskY) {
    const seqResult = await prisma.register.update({
      where: { id: registerA.id },
      data: { nextRiskSequence: { increment: 1 } },
      select: { nextRiskSequence: true },
    });
    const seq = seqResult.nextRiskSequence - 1;

    riskY = await prisma.risk.create({
      data: {
        registerId: registerA.id,
        title: "e2e-risk-y",
        description: "E2E fixture risk Y — owned by sys-admin; used to verify non-owner cannot edit",
        state: "OPEN",
        displayRiskId: `E2E-${String(seq).padStart(3, "0")}`,
        riskSequence: seq,
        ownerUserId: sysAdmin.id,
        createdDate: new Date(),
        likelihoodValueId: likelihood.id,
        impactValueId: impact.id,
        riskScore: 9,
        riskLevelId: riskLevel.id,
        createdByUserId: sysAdmin.id,
        updatedByUserId: sysAdmin.id,
      },
    });
  } else {
    riskY = await prisma.risk.update({
      where: { id: riskY.id },
      data: {
        ownerUserId: sysAdmin.id,
        state: "OPEN",
        updatedByUserId: sysAdmin.id,
      },
    });
  }

  console.log(`  Risk Y — ${riskY.id}`);

  // -------------------------------------------------------------------------
  // 7. Seed response actions
  //
  // Action A — owned by response-owner-a; linked to Risk X.
  //   response-owner-a can view Risk X via this link (SPIKE-003 §4.3)
  //   response-owner-a cannot view Register B (no link exists there)
  //
  // Action B — owned by sys-admin; used to verify response-owner-a cannot
  //   edit an action they do not own (Section 3.21)
  // -------------------------------------------------------------------------

  const responseOwnerA = createdUsers["response-owner-a@test.local"];

  console.log("Seeding Action A...");

  let actionA = await prisma.responseAction.findFirst({
    where: {
      response: "e2e-action-a",
      ownerUserId: responseOwnerA.id,
    },
  });

  if (!actionA) {
    actionA = await prisma.responseAction.create({
      data: {
        response: "e2e-action-a",
        status: "PLANNED",
        ownerUserId: responseOwnerA.id,
        createdByUserId: sysAdmin.id,
        updatedByUserId: sysAdmin.id,
      },
    });
  } else {
    actionA = await prisma.responseAction.update({
      where: { id: actionA.id },
      data: {
        ownerUserId: responseOwnerA.id,
        isDeleted: false,
        updatedByUserId: sysAdmin.id,
      },
    });
  }

  console.log(`  Action A — ${actionA.id}`);

  // Link Action A to Risk X if not already linked
  await prisma.riskResponseAction.upsert({
    where: { riskId_responseActionId: { riskId: riskX.id, responseActionId: actionA.id } },
    update: {},
    create: {
      riskId: riskX.id,
      registerId: registerA.id,
      responseActionId: actionA.id,
      displayOrder: 1,
      createdByUserId: sysAdmin.id,
    },
  });

  console.log("  Action A linked to Risk X");

  console.log("Seeding Action B...");

  let actionB = await prisma.responseAction.findFirst({
    where: {
      response: "e2e-action-b",
      ownerUserId: sysAdmin.id,
    },
  });

  if (!actionB) {
    actionB = await prisma.responseAction.create({
      data: {
        response: "e2e-action-b",
        status: "PLANNED",
        ownerUserId: sysAdmin.id,
        createdByUserId: sysAdmin.id,
        updatedByUserId: sysAdmin.id,
      },
    });
  } else {
    actionB = await prisma.responseAction.update({
      where: { id: actionB.id },
      data: {
        ownerUserId: sysAdmin.id,
        isDeleted: false,
        updatedByUserId: sysAdmin.id,
      },
    });
  }

  console.log(`  Action B — ${actionB.id}`);

  // Link Action B to Risk X (for register context) but with sys-admin as owner
  await prisma.riskResponseAction.upsert({
    where: { riskId_responseActionId: { riskId: riskX.id, responseActionId: actionB.id } },
    update: {},
    create: {
      riskId: riskX.id,
      registerId: registerA.id,
      responseActionId: actionB.id,
      displayOrder: 2,
      createdByUserId: sysAdmin.id,
    },
  });

  console.log("  Action B linked to Risk X");

  console.log("\nE2E fixture seed complete.");
}

main()
  .catch((err) => {
    console.error("E2E seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
