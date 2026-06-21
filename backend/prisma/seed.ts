import { randomBytes, randomUUID } from "node:crypto";

import { Prisma, PrismaClient, type RiskState } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

import { hashPassword, validatePasswordPolicy } from "../src/auth/password.js";

const seedDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(seedDir, "../../.env") });
loadEnv();

const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pgPool) });

const likelihoodDefaults = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const impactDefaults = ["Insignificant", "Minor", "Moderate", "Major", "Severe"];
const riskLevelDefaults = ["Low", "Medium", "High", "Critical"] as const;
const riskLevelDefaultColors = {
  Low: "#2f9e44",
  Medium: "#f59f00",
  High: "#f76707",
  Critical: "#e03131"
} satisfies Record<(typeof riskLevelDefaults)[number], string>;
const responseStrategyDefaults = ["Accept", "Mitigate", "Transfer", "Avoid"];
const matrixLevelNames = [
  ["Low", "Low", "Low", "Medium", "Medium"],
  ["Low", "Low", "Medium", "Medium", "High"],
  ["Low", "Medium", "Medium", "High", "High"],
  ["Medium", "Medium", "High", "High", "Critical"],
  ["Medium", "High", "High", "Critical", "Critical"]
] as const;

const demoUsers = [
  { email: "alice@example.com", name: "Alice Register Admin", isSystemAdmin: false },
  { email: "bob@example.com", name: "Bob Risk Owner", isSystemAdmin: false },
  { email: "carol@example.com", name: "Carol Viewer", isSystemAdmin: false }
] as const;

const demoRegisters = [
  {
    name: "Information Security Risk Register",
    description: "Demo register for information security and resilience acceptance testing.",
    riskIdPrefix: "ISEC",
    defaultReviewFrequencyMonths: 12,
    allowViewerExport: true,
    responseActionMode: "SIMPLE" as const,
    scoringFormula: ""
  },
  {
    name: "Operational Risk Register",
    description: "Demo register covering supplier, process, staffing, and continuity risks.",
    riskIdPrefix: null,
    defaultReviewFrequencyMonths: 6,
    allowViewerExport: false,
    responseActionMode: "CHILD_RECORDS" as const,
    scoringFormula: ""
  },
  {
    name: "Project Risk Register",
    description: "Demo register for project delivery risks with custom scoring and child-record response actions.",
    riskIdPrefix: "PRJ",
    defaultReviewFrequencyMonths: 3,
    allowViewerExport: false,
    responseActionMode: "CHILD_RECORDS" as const,
    scoringFormula: "{likelihood} * {impact} * 2"
  }
] as const;

const demoRisks = [
  {
    registerName: "Information Security Risk Register",
    title: "Privileged access review is overdue",
    description: "Privileged account attestations have not been completed within the expected review cycle.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Almost Certain",
    impactName: "Major",
    responseStrategyName: "Avoid",
    responseAction: "Complete attestation and remove unnecessary privileged access.",
    createdDaysAgo: 160,
    nextReviewDaysFromNow: -5
  },
  {
    registerName: "Information Security Risk Register",
    title: "Endpoint encryption exceptions need monitoring",
    description: "A small number of endpoints have approved encryption exceptions that require monthly follow-up.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Unlikely",
    impactName: "Major",
    responseStrategyName: "Transfer",
    responseAction: "Track exception approvals and confirm compensating monitoring is active.",
    createdDaysAgo: 60,
    nextReviewDaysFromNow: 20
  },
  {
    registerName: "Information Security Risk Register",
    title: "Security awareness refresh content in draft",
    description: "The annual awareness refresh is drafted but needs review before rollout.",
    state: "DRAFT",
    ownerEmail: "bob@example.com",
    likelihoodName: "Possible",
    impactName: "Minor",
    responseStrategyName: "Mitigate",
    responseAction: "Review draft content with department leads.",
    createdDaysAgo: 8,
    nextReviewDaysFromNow: 80
  },
  {
    registerName: "Information Security Risk Register",
    title: "Legacy VPN retired after migration",
    description: "The legacy VPN service has been retired after successful migration to the replacement access pattern.",
    state: "CLOSED",
    ownerEmail: "bob@example.com",
    likelihoodName: "Rare",
    impactName: "Moderate",
    responseStrategyName: "Accept",
    responseAction: "Closed after retirement evidence was attached to the operational record.",
    createdDaysAgo: 380,
    nextReviewDaysFromNow: null
  },
  {
    registerName: "Information Security Risk Register",
    title: "Third-party penetration test findings awaiting closure",
    description: "Several medium findings remain open after the most recent third-party penetration test.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Likely",
    impactName: "Moderate",
    responseStrategyName: "Mitigate",
    responseAction: "Track remediation owners and retest dates for each remaining finding.",
    createdDaysAgo: 95,
    nextReviewDaysFromNow: 35
  },
  {
    registerName: "Information Security Risk Register",
    title: "Cloud storage policy exception nearing review",
    description: "An approved cloud storage exception is approaching its scheduled review date.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Possible",
    impactName: "Moderate",
    responseStrategyName: "Mitigate",
    responseAction: "Confirm the exception still has a valid business owner and compensating controls.",
    createdDaysAgo: 210,
    nextReviewDaysFromNow: 7
  },
  {
    registerName: "Information Security Risk Register",
    title: "Incident response rota has single-person dependency",
    description: "Out-of-hours incident triage depends on one primary responder for several critical systems.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Likely",
    impactName: "Major",
    responseStrategyName: "Mitigate",
    responseAction: "Add secondary responders and run a rota handover drill.",
    createdDaysAgo: 130,
    nextReviewDaysFromNow: -21
  },
  {
    registerName: "Information Security Risk Register",
    title: "Data retention rules need product confirmation",
    description: "Retention rules for one product workflow are unclear and need confirmation before automation changes proceed.",
    state: "DRAFT",
    ownerEmail: "bob@example.com",
    likelihoodName: "Unlikely",
    impactName: "Minor",
    responseStrategyName: "Accept",
    responseAction: "Confirm current retention obligations with the product owner.",
    createdDaysAgo: 18,
    nextReviewDaysFromNow: 90
  },
  {
    registerName: "Operational Risk Register",
    title: "Critical supplier outage affects customer operations",
    description: "A priority supplier could suffer an extended outage that interrupts customer-facing services.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Likely",
    impactName: "Severe",
    responseStrategyName: "Mitigate",
    responseAction: "Confirm recovery-time commitments and schedule a supplier continuity exercise.",
    createdDaysAgo: 220,
    nextReviewDaysFromNow: -14
  },
  {
    registerName: "Operational Risk Register",
    title: "New market launch controls still being defined",
    description: "Launch activity is progressing before all ownership, policy, and assurance controls are fully agreed.",
    state: "DRAFT",
    ownerEmail: "bob@example.com",
    likelihoodName: "Possible",
    impactName: "Moderate",
    responseStrategyName: "Mitigate",
    responseAction: "Complete launch readiness checklist before moving the risk to open.",
    createdDaysAgo: 12,
    nextReviewDaysFromNow: 45
  },
  {
    registerName: "Operational Risk Register",
    title: "Legacy process retired after control redesign",
    description: "A previously manual process has been replaced by automated control checks and no longer needs active tracking.",
    state: "CLOSED",
    ownerEmail: "bob@example.com",
    likelihoodName: "Rare",
    impactName: "Minor",
    responseStrategyName: "Accept",
    responseAction: "Closed after control redesign was verified by the register admin.",
    createdDaysAgo: 420,
    nextReviewDaysFromNow: null
  },
  {
    registerName: "Operational Risk Register",
    title: "Warehouse staffing gap during peak period",
    description: "Temporary staffing coverage may be insufficient during the next peak fulfilment period.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Likely",
    impactName: "Moderate",
    responseStrategyName: "Mitigate",
    responseAction: "Confirm agency coverage and cross-train two additional supervisors.",
    createdDaysAgo: 75,
    nextReviewDaysFromNow: 12
  },
  {
    registerName: "Operational Risk Register",
    title: "Manual invoice checks delay month-end close",
    description: "Manual exception checks can delay the month-end finance close when volumes spike.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Possible",
    impactName: "Minor",
    responseStrategyName: "Accept",
    responseAction: "Track exception volume and document the tolerated processing window.",
    createdDaysAgo: 140,
    nextReviewDaysFromNow: 70
  },
  {
    registerName: "Operational Risk Register",
    title: "Business continuity exercise actions remain open",
    description: "Actions from the last continuity exercise have not all been completed.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Possible",
    impactName: "Major",
    responseStrategyName: "Mitigate",
    responseAction: "Review action owners weekly until the exercise backlog is closed.",
    createdDaysAgo: 110,
    nextReviewDaysFromNow: -2
  },
  {
    registerName: "Operational Risk Register",
    title: "Customer support knowledge base refresh planned",
    description: "Several high-volume support articles need refresh before the next product release.",
    state: "DRAFT",
    ownerEmail: "bob@example.com",
    likelihoodName: "Unlikely",
    impactName: "Moderate",
    responseStrategyName: "Mitigate",
    responseAction: "Prioritise the top ten articles by contact volume.",
    createdDaysAgo: 5,
    nextReviewDaysFromNow: 60
  },
  {
    registerName: "Operational Risk Register",
    title: "Insurance renewal dependency transferred",
    description: "Residual exposure for a facilities incident is now covered by the renewed insurance policy.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Unlikely",
    impactName: "Severe",
    responseStrategyName: "Transfer",
    responseAction: "Confirm policy limits remain aligned to the current facilities exposure.",
    createdDaysAgo: 250,
    nextReviewDaysFromNow: 25
  },
  {
    registerName: "Project Risk Register",
    title: "Key delivery milestone at risk from scope changes",
    description: "Late scope additions from stakeholders are threatening the agreed delivery date.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Likely",
    impactName: "Major",
    responseStrategyName: "Mitigate",
    responseAction: "Implement change control freeze and escalate outstanding scope requests.",
    createdDaysAgo: 30,
    nextReviewDaysFromNow: 7
  },
  {
    registerName: "Project Risk Register",
    title: "Third-party integration not confirmed for go-live",
    description: "A required third-party integration has not been signed off and may not be ready at go-live.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Possible",
    impactName: "Severe",
    responseStrategyName: "Mitigate",
    responseAction: "Escalate to vendor account manager and agree a contingency fallback plan.",
    createdDaysAgo: 45,
    nextReviewDaysFromNow: 3
  },
  {
    registerName: "Project Risk Register",
    title: "Resource gap in testing phase",
    description: "Planned test resources have been reallocated to another programme leaving a coverage gap.",
    state: "OPEN",
    ownerEmail: "bob@example.com",
    likelihoodName: "Almost Certain",
    impactName: "Moderate",
    responseStrategyName: "Accept",
    responseAction: "Document the reduced coverage, obtain sign-off from the project sponsor.",
    createdDaysAgo: 10,
    nextReviewDaysFromNow: 14
  }
] as const satisfies ReadonlyArray<{
  registerName: string;
  title: string;
  description: string;
  state: RiskState;
  ownerEmail: string;
  likelihoodName: string;
  impactName: string;
  responseStrategyName: string;
  responseAction: string;
  createdDaysAgo: number;
  nextReviewDaysFromNow: number | null;
}>;

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function todayPlusDays(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function formatRiskId(register: {
  riskIdPrefix: string | null;
  riskIdZeroPaddingEnabled: boolean;
  riskIdZeroPaddingWidth: number;
}, sequence: number) {
  const numericPart = register.riskIdZeroPaddingEnabled
    ? String(sequence).padStart(register.riskIdZeroPaddingWidth, "0")
    : String(sequence);

  return register.riskIdPrefix ? `${register.riskIdPrefix}-${numericPart}` : numericPart;
}

async function upsertDemoUsers(passwordHash: string) {
  const users = await Promise.all(
    demoUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        create: {
          ...user,
          passwordHash,
          isActive: true
        },
        update: {
          // Password is intentionally omitted — changes made in the app are preserved.
          name: user.name,
          isSystemAdmin: user.isSystemAdmin,
          isActive: true
        },
        select: { id: true, email: true, name: true, isSystemAdmin: true, isActive: true }
      })
    )
  );

  return new Map(users.map((user) => [user.email, user]));
}

async function ensureAuditEvent(input: {
  action: string;
  actor: { id: string; name: string; email: string };
  objectType: "REGISTER" | "REGISTER_PERMISSION" | "RISK";
  objectId: string;
  objectDisplayName: string;
  scopeType: "SYSTEM" | "REGISTER" | "RISK";
  registerId?: string;
  riskId?: string;
  displayRiskId?: string;
  summary: string;
}) {
  const existing = await prisma.auditEvent.findFirst({
    where: {
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId
    },
    select: { id: true }
  });

  if (existing) {
    return existing;
  }

  return prisma.auditEvent.create({
    data: {
      actorUserId: input.actor.id,
      actorDisplayName: input.actor.name,
      actorEmail: input.actor.email,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      objectDisplayName: input.objectDisplayName,
      scopeType: input.scopeType,
      registerId: input.registerId,
      riskId: input.riskId,
      displayRiskId: input.displayRiskId,
      summary: input.summary
    },
    select: { id: true }
  });
}

async function ensureRegisterConfiguration(registerId: string) {
  const likelihoodValues = await Promise.all(
    likelihoodDefaults.map((name, index) =>
      prisma.likelihoodValue.upsert({
        where: { registerId_name: { registerId, name } },
        create: {
          registerId,
          name,
          numericValue: index + 1,
          displayOrder: index + 1
        },
        update: {
          numericValue: index + 1,
          displayOrder: index + 1,
          isActive: true
        }
      })
    )
  );

  const impactValues = await Promise.all(
    impactDefaults.map((name, index) =>
      prisma.impactValue.upsert({
        where: { registerId_name: { registerId, name } },
        create: {
          registerId,
          name,
          numericValue: index + 1,
          displayOrder: index + 1
        },
        update: {
          numericValue: index + 1,
          displayOrder: index + 1,
          isActive: true
        }
      })
    )
  );

  const riskLevels = await Promise.all(
    riskLevelDefaults.map((name, index) =>
      prisma.riskLevel.upsert({
        where: { registerId_name: { registerId, name } },
        create: {
          registerId,
          name,
          color: riskLevelDefaultColors[name],
          displayOrder: index + 1
        },
        update: {
          color: riskLevelDefaultColors[name],
          displayOrder: index + 1,
          isActive: true
        }
      })
    )
  );

  const responseStrategies = await Promise.all(
    responseStrategyDefaults.map((name, index) =>
      prisma.responseStrategy.upsert({
        where: { registerId_name: { registerId, name } },
        create: {
          registerId,
          name,
          displayOrder: index + 1
        },
        update: {
          displayOrder: index + 1,
          isActive: true
        }
      })
    )
  );

  const riskLevelByName = new Map(riskLevels.map((level) => [level.name, level]));
  await Promise.all(
    impactValues.flatMap((impact, impactIndex) =>
      likelihoodValues.map((likelihood, likelihoodIndex) => {
        const levelName = matrixLevelNames[impactIndex]?.[likelihoodIndex] ?? "Low";
        return prisma.riskMatrixCell.upsert({
          where: {
            registerId_likelihoodValueId_impactValueId: {
              registerId,
              likelihoodValueId: likelihood.id,
              impactValueId: impact.id
            }
          },
          create: {
            registerId,
            likelihoodValueId: likelihood.id,
            impactValueId: impact.id,
            riskLevelId: riskLevelByName.get(levelName)!.id
          },
          update: {
            riskLevelId: riskLevelByName.get(levelName)!.id
          }
        });
      })
    )
  );

  return {
    likelihoodByName: new Map(likelihoodValues.map((value) => [value.name, value])),
    impactByName: new Map(impactValues.map((value) => [value.name, value])),
    riskLevelByName,
    responseStrategyByName: new Map(responseStrategies.map((value) => [value.name, value]))
  };
}

async function upsertDemoRegisters(admin: { id: string; name: string; email: string }, users: Map<string, { id: string }>) {
  const registers = new Map<string, Awaited<ReturnType<typeof prisma.register.upsert>>>();

  for (const demoRegister of demoRegisters) {
    const register = await prisma.register.upsert({
      where: { name: demoRegister.name },
      create: {
        name: demoRegister.name,
        description: demoRegister.description,
        riskIdPrefix: demoRegister.riskIdPrefix,
        riskIdZeroPaddingEnabled: true,
        riskIdZeroPaddingWidth: 4,
        defaultReviewFrequencyMonths: demoRegister.defaultReviewFrequencyMonths,
        allowViewerExport: demoRegister.allowViewerExport,
        responseActionMode: demoRegister.responseActionMode,
        scoringFormula: demoRegister.scoringFormula,
        createdByUserId: admin.id,
        updatedByUserId: admin.id
      },
      update: {
        description: demoRegister.description,
        riskIdPrefix: demoRegister.riskIdPrefix,
        riskIdZeroPaddingEnabled: true,
        riskIdZeroPaddingWidth: 4,
        defaultReviewFrequencyMonths: demoRegister.defaultReviewFrequencyMonths,
        allowViewerExport: demoRegister.allowViewerExport,
        responseActionMode: demoRegister.responseActionMode,
        scoringFormula: demoRegister.scoringFormula,
        updatedByUserId: admin.id
      }
    });

    registers.set(register.name, register);
    await ensureRegisterConfiguration(register.id);
    await ensureAuditEvent({
      action: "REGISTER_CREATED",
      actor: admin,
      objectType: "REGISTER",
      objectId: register.id,
      objectDisplayName: register.name,
      scopeType: "SYSTEM",
      registerId: register.id,
      summary: "Register created"
    });

    const adminUserId = users.get("alice@example.com")?.id;
    const viewerUserId = users.get("carol@example.com")?.id;
    const permissions = [
      adminUserId ? { userId: adminUserId, role: "REGISTER_ADMIN" as const, action: "REGISTER_ADMIN_ADDED" } : null,
      viewerUserId ? { userId: viewerUserId, role: "REGISTER_VIEWER" as const, action: "REGISTER_VIEWER_ADDED" } : null
    ].filter((permission): permission is NonNullable<typeof permission> => Boolean(permission));

    for (const permission of permissions) {
      await prisma.registerPermission.upsert({
        where: {
          registerId_userId_role: {
            registerId: register.id,
            userId: permission.userId,
            role: permission.role
          }
        },
        create: {
          registerId: register.id,
          userId: permission.userId,
          role: permission.role,
          createdByUserId: admin.id
        },
        update: {}
      });

      await ensureAuditEvent({
        action: permission.action,
        actor: admin,
        objectType: "REGISTER_PERMISSION",
        objectId: `${register.id}:${permission.userId}:${permission.role}`,
        objectDisplayName: register.name,
        scopeType: "REGISTER",
        registerId: register.id,
        summary: permission.role === "REGISTER_ADMIN" ? "Register Admin added" : "Register Viewer added"
      });
    }
  }

  return registers;
}

async function nextRiskIdentity(registerId: string) {
  const register = await prisma.register.findUniqueOrThrow({
    where: { id: registerId },
    select: {
      riskIdPrefix: true,
      riskIdZeroPaddingEnabled: true,
      riskIdZeroPaddingWidth: true,
      nextRiskSequence: true
    }
  });
  const riskSequence = register.nextRiskSequence;
  const displayRiskId = formatRiskId(register, riskSequence);

  await prisma.register.update({
    where: { id: registerId },
    data: { nextRiskSequence: { increment: 1 } },
    select: { id: true }
  });

  return { riskSequence, displayRiskId };
}

async function upsertDemoRisks(admin: { id: string; name: string; email: string }, users: Map<string, { id: string; email: string; name: string }>) {
  for (const demoRisk of demoRisks) {
    const register = await prisma.register.findUniqueOrThrow({
      where: { name: demoRisk.registerName },
      select: {
        id: true,
        reviewsEnabled: true,
        defaultReviewFrequencyMonths: true,
        defaultNewRiskState: true
      }
    });
    const configuration = await ensureRegisterConfiguration(register.id);
    const owner = users.get(demoRisk.ownerEmail);
    const likelihood = configuration.likelihoodByName.get(demoRisk.likelihoodName);
    const impact = configuration.impactByName.get(demoRisk.impactName);
    const responseStrategy = configuration.responseStrategyByName.get(demoRisk.responseStrategyName);

    if (!owner || !likelihood || !impact || !responseStrategy) {
      throw new Error(`Demo risk "${demoRisk.title}" references missing seed data`);
    }

    const ownerPersonRef = await prisma.personReference.upsert({
      where: { email: owner.email.toLowerCase() },
      create: { email: owner.email.toLowerCase(), userId: owner.id, displayName: owner.name, resolvedAt: new Date() },
      update: { userId: owner.id, displayName: owner.name, resolvedAt: new Date() },
      select: { id: true }
    });

    const matrixCell = await prisma.riskMatrixCell.findUniqueOrThrow({
      where: {
        registerId_likelihoodValueId_impactValueId: {
          registerId: register.id,
          likelihoodValueId: likelihood.id,
          impactValueId: impact.id
        }
      },
      select: { riskLevelId: true }
    });

    const createdDate = todayPlusDays(-demoRisk.createdDaysAgo);
    const existing = await prisma.risk.findFirst({
      where: { registerId: register.id, title: demoRisk.title },
      select: { id: true, displayRiskId: true, riskSequence: true }
    });
    const identity = existing ?? (await nextRiskIdentity(register.id));

    const risk = await prisma.risk.upsert({
      where: {
        registerId_displayRiskId: {
          registerId: register.id,
          displayRiskId: identity.displayRiskId
        }
      },
      create: {
        registerId: register.id,
        displayRiskId: identity.displayRiskId,
        riskSequence: identity.riskSequence,
        title: demoRisk.title,
        description: demoRisk.description,
        state: demoRisk.state,
        ownerUserId: owner.id,
        ownerPersonId: ownerPersonRef.id,
        createdDate,
        likelihoodValueId: likelihood.id,
        impactValueId: impact.id,
        riskScore: new Prisma.Decimal(likelihood.numericValue).mul(impact.numericValue),
        riskLevelId: matrixCell.riskLevelId,
        responseStrategyId: responseStrategy.id,
        responseAction: demoRisk.responseAction,
        nextReviewDate:
          demoRisk.nextReviewDaysFromNow === null ? null : todayPlusDays(demoRisk.nextReviewDaysFromNow),
        systemCreatedByUserId: admin.id,
        systemUpdatedByUserId: admin.id
      },
      update: {
        title: demoRisk.title,
        description: demoRisk.description,
        state: demoRisk.state,
        ownerUserId: owner.id,
        ownerPersonId: ownerPersonRef.id,
        createdDate,
        likelihoodValueId: likelihood.id,
        impactValueId: impact.id,
        riskScore: new Prisma.Decimal(likelihood.numericValue).mul(impact.numericValue),
        riskLevelId: matrixCell.riskLevelId,
        responseStrategyId: responseStrategy.id,
        responseAction: demoRisk.responseAction,
        nextReviewDate:
          demoRisk.nextReviewDaysFromNow === null ? null : todayPlusDays(demoRisk.nextReviewDaysFromNow),
        systemUpdatedByUserId: admin.id
      },
      select: { id: true, displayRiskId: true }
    });

    await ensureAuditEvent({
      action: "RISK_CREATED",
      actor: admin,
      objectType: "RISK",
      objectId: risk.id,
      objectDisplayName: risk.displayRiskId,
      scopeType: "RISK",
      registerId: register.id,
      riskId: risk.id,
      displayRiskId: risk.displayRiskId,
      summary: "Risk created"
    });
  }
}

async function upsertDemoTemplates(admin: { id: string; name: string; email: string }) {
  const now = new Date();

  type SnapshotLV = { id: string; name: string; numericValue: string; displayOrder: number; isActive: boolean };
  type SnapshotCell = { id: string; likelihoodValueId: string; impactValueId: string; riskLevelId: string };

  function buildSnapshot(opts: {
    name: string;
    description: string;
    likelihoods: Array<{ name: string; numeric: number }>;
    impacts: Array<{ name: string; numeric: number }>;
    riskLevels: Array<{ name: string; color: string }>;
    matrix: string[][];
    responseStrategies: string[];
  }) {
    const likelihoods: SnapshotLV[] = opts.likelihoods.map((lv, i) => ({
      id: randomUUID(), name: lv.name, numericValue: String(lv.numeric), displayOrder: i + 1, isActive: true
    }));
    const impacts: SnapshotLV[] = opts.impacts.map((iv, i) => ({
      id: randomUUID(), name: iv.name, numericValue: String(iv.numeric), displayOrder: i + 1, isActive: true
    }));
    const levels = opts.riskLevels.map((rl, i) => ({
      id: randomUUID(), name: rl.name, description: null, color: rl.color, displayOrder: i + 1, isActive: true
    }));
    const levelByName = new Map(levels.map((rl) => [rl.name, rl]));

    const cells: SnapshotCell[] = impacts.flatMap((impact, impactIndex) =>
      likelihoods.map((likelihood, likelihoodIndex) => ({
        id: randomUUID(),
        likelihoodValueId: likelihood.id,
        impactValueId: impact.id,
        riskLevelId: levelByName.get(opts.matrix[impactIndex]?.[likelihoodIndex] ?? opts.riskLevels[0]!.name)!.id
      }))
    );

    return {
      register: {
        name: opts.name,
        description: opts.description,
        riskIdPrefix: null,
        riskIdZeroPaddingEnabled: false,
        riskIdZeroPaddingWidth: 4,
        defaultNewRiskState: "OPEN",
        reviewsEnabled: true,
        defaultReviewFrequencyMonths: 12,
        reviewAttestationText: null,
        allowViewerExport: false
      },
      customFields: [],
      likelihoodValues: likelihoods,
      impactValues: impacts,
      riskLevels: levels,
      matrixCells: cells,
      responseStrategies: opts.responseStrategies.map((name, i) => ({
        id: randomUUID(), name, displayOrder: i + 1, isActive: true
      }))
    };
  }

  const templates = [
    {
      name: "Standard Risk Register",
      description: "A 5×5 risk register template with the standard likelihood, impact, and risk level defaults. A good starting point for most general-purpose risk tracking programmes.",
      snapshot: buildSnapshot({
        name: "Standard Risk Register",
        description: "A 5×5 risk register template with the standard likelihood, impact, and risk level defaults.",
        likelihoods: [
          { name: "Rare", numeric: 1 },
          { name: "Unlikely", numeric: 2 },
          { name: "Possible", numeric: 3 },
          { name: "Likely", numeric: 4 },
          { name: "Almost Certain", numeric: 5 }
        ],
        impacts: [
          { name: "Insignificant", numeric: 1 },
          { name: "Minor", numeric: 2 },
          { name: "Moderate", numeric: 3 },
          { name: "Major", numeric: 4 },
          { name: "Severe", numeric: 5 }
        ],
        riskLevels: [
          { name: "Low", color: "#2f9e44" },
          { name: "Medium", color: "#f59f00" },
          { name: "High", color: "#f76707" },
          { name: "Critical", color: "#e03131" }
        ],
        matrix: [
          ["Low", "Low", "Low", "Medium", "Medium"],
          ["Low", "Low", "Medium", "Medium", "High"],
          ["Low", "Medium", "Medium", "High", "High"],
          ["Medium", "Medium", "High", "High", "Critical"],
          ["Medium", "High", "High", "Critical", "Critical"]
        ],
        responseStrategies: ["Accept", "Mitigate", "Transfer", "Avoid"]
      })
    },
    {
      name: "Streamlined Risk Register",
      description: "A simplified 3×3 risk register template for teams that prefer fewer scoring dimensions. Three likelihood levels, three impact levels, and a three-tier risk rating.",
      snapshot: buildSnapshot({
        name: "Streamlined Risk Register",
        description: "A simplified 3×3 risk register template for teams that prefer fewer scoring dimensions.",
        likelihoods: [
          { name: "Low", numeric: 1 },
          { name: "Medium", numeric: 2 },
          { name: "High", numeric: 3 }
        ],
        impacts: [
          { name: "Low", numeric: 1 },
          { name: "Medium", numeric: 2 },
          { name: "High", numeric: 3 }
        ],
        riskLevels: [
          { name: "Low", color: "#2f9e44" },
          { name: "Medium", color: "#f59f00" },
          { name: "High", color: "#f76707" }
        ],
        matrix: [
          ["Low", "Low", "Medium"],
          ["Low", "Medium", "High"],
          ["Medium", "High", "High"]
        ],
        responseStrategies: ["Accept", "Mitigate", "Transfer", "Avoid"]
      })
    }
  ];

  for (const template of templates) {
    const existing = await prisma.registerTemplate.findFirst({
      where: { name: template.name },
      select: { id: true }
    });

    if (existing) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.registerTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          isActive: true,
          createdByUserId: admin.id
        }
      });

      await tx.registerTemplateVersion.create({
        data: {
          templateId: created.id,
          versionNumber: 1,
          status: "PUBLISHED",
          snapshotJson: template.snapshot as object,
          createdByUserId: admin.id,
          publishedAt: now
        }
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: admin.id,
          actorDisplayName: admin.name,
          actorEmail: admin.email,
          action: "TEMPLATE_CREATED",
          objectType: "REGISTER_TEMPLATE",
          objectId: created.id,
          objectDisplayName: template.name,
          scopeType: "SYSTEM",
          summary: `Template created: "${template.name}"`
        }
      });
    });
  }
}

async function upsertIsecCustomFields(admin: { id: string }) {
  const register = await prisma.register.findUniqueOrThrow({
    where: { name: "Information Security Risk Register" },
    select: { id: true }
  });

  // Numeric field: "Risk Exposure Score" — needed as CALCULATED dependency
  const numberField = await prisma.customFieldDefinition.upsert({
    where: { registerId_fieldName: { registerId: register.id, fieldName: "Risk Exposure Score" } },
    create: {
      registerId: register.id,
      fieldName: "Risk Exposure Score",
      fieldType: "NUMBER",
      helpText: "Enter a numeric exposure estimate (0–100) for this risk.",
      isRequired: false,
      validationMode: "WARN",
      displayOrder: 1,
      visibleToRoles: ["REGISTER_ADMIN", "REGISTER_EDITOR"],
      visibleToRiskResponseOwners: false,
      createdByUserId: admin.id,
      updatedByUserId: admin.id
    },
    update: {
      helpText: "Enter a numeric exposure estimate (0–100) for this risk.",
      validationMode: "WARN",
      visibleToRoles: ["REGISTER_ADMIN", "REGISTER_EDITOR"],
      visibleToRiskResponseOwners: false,
      updatedByUserId: admin.id
    },
    select: { id: true }
  });

  // DROPDOWN field: "Control Effectiveness"
  const dropdownField = await prisma.customFieldDefinition.upsert({
    where: { registerId_fieldName: { registerId: register.id, fieldName: "Control Effectiveness" } },
    create: {
      registerId: register.id,
      fieldName: "Control Effectiveness",
      fieldType: "DROPDOWN",
      helpText: "Rate the effectiveness of controls in place for this risk.",
      isRequired: false,
      validationMode: "ALLOW",
      displayOrder: 2,
      visibleToRoles: [],
      visibleToRiskResponseOwners: true,
      createdByUserId: admin.id,
      updatedByUserId: admin.id
    },
    update: {
      helpText: "Rate the effectiveness of controls in place for this risk.",
      updatedByUserId: admin.id
    },
    select: { id: true }
  });

  const dropdownOptions = ["Strong", "Adequate", "Weak", "None"] as const;
  const optionRecords: Array<{ label: string; id: string }> = [];
  for (let i = 0; i < dropdownOptions.length; i++) {
    const label = dropdownOptions[i]!;
    const opt = await prisma.customFieldOption.upsert({
      where: { customFieldDefinitionId_label: { customFieldDefinitionId: dropdownField.id, label } },
      create: { customFieldDefinitionId: dropdownField.id, label, displayOrder: i + 1 },
      update: { displayOrder: i + 1 },
      select: { id: true, label: true }
    });
    optionRecords.push(opt);
  }

  // CALCULATED field: "Weighted Exposure" = numberField * 1.5
  await prisma.customFieldDefinition.upsert({
    where: { registerId_fieldName: { registerId: register.id, fieldName: "Weighted Exposure" } },
    create: {
      registerId: register.id,
      fieldName: "Weighted Exposure",
      fieldType: "CALCULATED",
      helpText: "Automatically calculated as Risk Exposure Score × 1.5.",
      isRequired: false,
      validationMode: "ALLOW",
      displayOrder: 3,
      formula: `{field:${numberField.id}} * 1.5`,
      formulaDependencies: [numberField.id],
      visibleToRoles: [],
      visibleToRiskResponseOwners: true,
      createdByUserId: admin.id,
      updatedByUserId: admin.id
    },
    update: {
      formula: `{field:${numberField.id}} * 1.5`,
      formulaDependencies: [numberField.id],
      updatedByUserId: admin.id
    },
    select: { id: true }
  });

  return { registerId: register.id, numberFieldId: numberField.id, dropdownField: dropdownField.id, optionRecords };
}

async function upsertIsecCustomFieldValues(
  admin: { id: string },
  fieldData: Awaited<ReturnType<typeof upsertIsecCustomFields>>
) {
  const { registerId, numberFieldId, dropdownField, optionRecords } = fieldData;

  // Seed values on the first two OPEN ISEC risks
  const risks = await prisma.risk.findMany({
    where: { registerId, state: "OPEN" },
    select: { id: true },
    orderBy: { riskSequence: "asc" },
    take: 2
  });

  const adequateOption = optionRecords.find((o) => o.label === "Adequate");
  const weakOption = optionRecords.find((o) => o.label === "Weak");

  for (let i = 0; i < risks.length; i++) {
    const risk = risks[i];
    if (!risk) continue;
    const exposureScore = i === 0 ? 80 : 40;
    const option = i === 0 ? adequateOption : weakOption;

    await prisma.riskCustomFieldValue.upsert({
      where: { riskId_customFieldDefinitionId: { riskId: risk.id, customFieldDefinitionId: numberFieldId } },
      create: {
        riskId: risk.id,
        registerId,
        customFieldDefinitionId: numberFieldId,
        numberValue: new Prisma.Decimal(exposureScore)
      },
      update: { numberValue: new Prisma.Decimal(exposureScore) }
    });

    if (option) {
      await prisma.riskCustomFieldValue.upsert({
        where: { riskId_customFieldDefinitionId: { riskId: risk.id, customFieldDefinitionId: dropdownField } },
        create: {
          riskId: risk.id,
          registerId,
          customFieldDefinitionId: dropdownField,
          dropdownOptionId: option.id
        },
        update: { dropdownOptionId: option.id }
      });
    }
  }
}

async function upsertDemoReviews(admin: { id: string; name: string; email: string }) {
  const register = await prisma.register.findUniqueOrThrow({
    where: { name: "Information Security Risk Register" },
    select: { id: true, defaultReviewFrequencyMonths: true, reviewAttestationText: true }
  });

  // Pick the first two OPEN risks in the ISEC register to review
  const risks = await prisma.risk.findMany({
    where: { registerId: register.id, state: "OPEN" },
    select: { id: true, displayRiskId: true },
    orderBy: { riskSequence: "asc" },
    take: 2
  });

  const reviewDatesAgo = [90, 30]; // days ago

  for (let i = 0; i < risks.length; i++) {
    const risk = risks[i];
    if (!risk) continue;
    const daysAgo = reviewDatesAgo[i] ?? 30;
    const reviewedAt = todayPlusDays(-daysAgo);
    const calculatedNextReviewDate = todayPlusDays(-daysAgo + register.defaultReviewFrequencyMonths * 30);

    const existing = await prisma.riskReview.findFirst({
      where: { riskId: risk.id, reviewedByUserId: admin.id },
      select: { id: true }
    });

    if (existing) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.riskReview.create({
        data: {
          riskId: risk.id,
          registerId: register.id,
          reviewedByUserId: admin.id,
          reviewedAt,
          comment: i === 0
            ? "Reviewed and confirmed details remain accurate. No changes required at this time."
            : "Reviewed. Controls noted and next review date confirmed.",
          attestationText: register.reviewAttestationText,
          calculatedNextReviewDate
        }
      });

      await tx.risk.update({
        where: { id: risk.id },
        data: {
          lastReviewedAt: reviewedAt,
          nextReviewDate: calculatedNextReviewDate,
          systemUpdatedByUserId: admin.id
        }
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: admin.id,
          actorDisplayName: admin.name,
          actorEmail: admin.email,
          action: "RISK_REVIEWED",
          objectType: "RISK",
          objectId: risk.id,
          objectDisplayName: risk.displayRiskId,
          scopeType: "RISK",
          registerId: register.id,
          riskId: risk.id,
          displayRiskId: risk.displayRiskId,
          summary: "Risk reviewed"
        }
      });
    });
  }
}

async function upsertOperationalChildRecordActions(admin: { id: string; name: string; email: string }, users: Map<string, { id: string; email: string; name: string }>) {
  const register = await prisma.register.findUniqueOrThrow({
    where: { name: "Operational Risk Register" },
    select: { id: true }
  });

  const risks = await prisma.risk.findMany({
    where: { registerId: register.id, state: "OPEN" },
    select: { id: true, displayRiskId: true },
    orderBy: { riskSequence: "asc" },
    take: 3
  });

  const bob = users.get("bob@example.com");

  const actionsSpec = [
    {
      response: "Contact supplier and obtain written confirmation of recovery-time commitments.",
      status: "IN_PROGRESS" as const,
      ownerUserId: bob?.id ?? null
    },
    {
      response: "Schedule annual continuity exercise with supplier within next 60 days.",
      status: "PLANNED" as const,
      ownerUserId: null
    },
    {
      response: "Confirm backup supplier onboarding is complete and documented.",
      status: "IMPLEMENTED" as const,
      ownerUserId: bob?.id ?? null
    }
  ];

  for (let i = 0; i < risks.length; i++) {
    const risk = risks[i];
    const spec = actionsSpec[i];
    if (!risk || !spec) continue;

    const existing = await prisma.riskResponseAction.findFirst({
      where: { riskId: risk.id },
      select: { id: true }
    });

    if (existing) {
      continue;
    }

    const ownerPersonRef = spec.ownerUserId && bob
      ? await prisma.personReference.upsert({
          where: { email: bob.email.toLowerCase() },
          create: { email: bob.email.toLowerCase(), userId: bob.id, displayName: bob.name, resolvedAt: new Date() },
          update: { userId: bob.id, displayName: bob.name, resolvedAt: new Date() },
          select: { id: true }
        })
      : null;

    const action = await prisma.responseAction.create({
      data: {
        response: spec.response,
        status: spec.status,
        ownerUserId: spec.ownerUserId ?? undefined,
        ownerPersonId: ownerPersonRef?.id ?? undefined,
        createdByUserId: admin.id,
        updatedByUserId: admin.id
      },
      select: { id: true }
    });

    await prisma.riskResponseAction.create({
      data: {
        riskId: risk.id,
        registerId: register.id,
        responseActionId: action.id,
        displayOrder: 1,
        createdByUserId: admin.id
      }
    });
  }
}

async function main() {
  const email = optional("SEED_ADMIN_EMAIL", "admin@customrisk.local").trim().toLowerCase();
  const name = optional("SEED_ADMIN_NAME", "System Admin").trim();
  const password = required("SEED_ADMIN_PASSWORD");
  const passwordErrors = validatePasswordPolicy(password, email, name);

  if (passwordErrors.length > 0) {
    throw new Error(`SEED_ADMIN_PASSWORD does not meet policy: ${passwordErrors.join("; ")}`);
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      passwordHash,
      isSystemAdmin: true,
      isActive: true
    },
    update: {
      // Name and password are intentionally omitted — changes made in the app are preserved.
      // Only ensure the account remains active, admin, and unlocked.
      isSystemAdmin: true,
      isActive: true,
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockedUntil: null
    },
    select: {
      id: true,
      email: true,
      name: true,
      isSystemAdmin: true,
      isActive: true
    }
  });

  console.log(`System Admin ready: ${admin.email}`);

  if (process.env.SEED_DEMO_DATA === "true") {
    const demoPassword = process.env.SEED_DEMO_USER_PASSWORD ?? randomBytes(24).toString("base64url");
    const demoPasswordErrors = process.env.SEED_DEMO_USER_PASSWORD
      ? validatePasswordPolicy(demoPassword, "demo@customrisk.local", "Demo User")
      : [];

    if (demoPasswordErrors.length > 0) {
      throw new Error(`SEED_DEMO_USER_PASSWORD does not meet policy: ${demoPasswordErrors.join("; ")}`);
    }

    const demoPasswordHash = await hashPassword(demoPassword);
    const users = await upsertDemoUsers(demoPasswordHash);
    await upsertDemoRegisters(admin, users);
    await upsertDemoRisks(admin, users);
    await upsertDemoTemplates(admin);
    const isecFieldData = await upsertIsecCustomFields(admin);
    await upsertIsecCustomFieldValues(admin, isecFieldData);
    await upsertDemoReviews(admin);
    await upsertOperationalChildRecordActions(admin, users);

    console.log(
      "Demo data ready: 3 registers (incl. child-record and custom-formula registers), " +
      "3 demo users, 19 representative risks, 2 register templates, " +
      "3 custom fields on ISEC register (DROPDOWN, NUMBER with WARN, CALCULATED), " +
      "custom field values seeded on 2 ISEC risks, " +
      "2 completed reviews on ISEC risks, " +
      "3 child-record response actions on Operational risks (mix of statuses, incl. Risk Response Owner)"
    );
    if (!process.env.SEED_DEMO_USER_PASSWORD) {
      console.log("Demo users were created with random passwords; set SEED_DEMO_USER_PASSWORD to make them login-capable.");
    }
  }
}

main()
  .catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      console.error(
        "Database tables are missing. Run `npm run db:setup` from the repository root, or run migrations before seeding."
      );
      process.exitCode = 1;
      return;
    }

    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
