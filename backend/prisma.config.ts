import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasources: {
    db: {
      url: process.env.DATABASE_URL as string,
    },
  },
});
