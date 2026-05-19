import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Use import.meta.dirname (always the directory of this file = backend/) rather
  // than process.cwd(), which may differ inside Prisma's config evaluator.
  const here = import.meta.dirname;
  for (const candidate of [
    path.join(here, ".env"),       // backend/.env  — written by the CI workflow step
    path.join(here, "..", ".env"), // <root>/.env   — used in local development
  ]) {
    try {
      const content = readFileSync(candidate, "utf8");
      const match = content.match(/^DATABASE_URL=(.+)$/m);
      if (match) return match[1].trim();
    } catch {
      // file not found — try next candidate
    }
  }

  throw new Error("DATABASE_URL is not set.");
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: getDatabaseUrl(),
  },
});
