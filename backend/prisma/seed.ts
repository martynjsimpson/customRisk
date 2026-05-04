import { Prisma, PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { hashPassword, validatePasswordPolicy } from "../src/auth/password.js";

const seedDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(seedDir, "../../.env") });
loadEnv();

const prisma = new PrismaClient();

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
      name,
      passwordHash,
      isSystemAdmin: true,
      isActive: true,
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockedUntil: null
    },
    select: {
      id: true,
      email: true,
      isSystemAdmin: true,
      isActive: true
    }
  });

  console.log(`System Admin ready: ${admin.email}`);
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
