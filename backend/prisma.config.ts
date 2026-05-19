import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

function getDatabaseUrl(): string | undefined {
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

  // Return undefined so prisma generate works without a database (e.g. during
  // Docker build). Commands that actually connect (migrate deploy) will fail
  // with a clear Prisma error if DATABASE_URL is genuinely missing at that point.
  return undefined;
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: getDatabaseUrl(),
  },
});
