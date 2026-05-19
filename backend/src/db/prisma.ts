import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

const pgPool =
  globalForPrisma.pgPool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL! });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pgPool),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pgPool;
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
  await pgPool.end();
}
