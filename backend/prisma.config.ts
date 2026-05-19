import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Prisma 7 no longer auto-loads .env files when prisma.config.ts is present.
  // Read them explicitly so local dev (.env at repo root) and CI (backend/.env
  // written by the workflow step) both work without relying on package imports.
  for (const rel of [".env", path.join("..", ".env")]) {
    try {
      const content = readFileSync(path.join(process.cwd(), rel), "utf8");
      const match = content.match(/^DATABASE_URL=(.+)$/m);
      if (match) return match[1].trim();
    } catch {
      // file absent — try next location
    }
  }

  throw new Error(
    "DATABASE_URL is not set. Provide it as an environment variable or in a .env file."
  );
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});
