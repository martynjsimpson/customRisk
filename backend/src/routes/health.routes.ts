import { Router } from "express";

import { prisma } from "../db/prisma.js";
import { buildHealthPayload, renderMetricsText } from "../observability/metrics.js";
import { sendData } from "../utils/apiResponse.js";

async function getDatabaseStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok" as const;
  } catch {
    return "unreachable" as const;
  }
}

export function createHealthRouter() {
  const router = Router();

  router.get("/health", async (_request, response) => {
    const databaseStatus = await getDatabaseStatus();
    const healthy = databaseStatus === "ok";
    sendData(response, buildHealthPayload(databaseStatus), healthy ? 200 : 503);
  });

  router.get("/health/metrics", async (_request, response) => {
    const databaseStatus = await getDatabaseStatus();
    const healthy = databaseStatus === "ok";

    response
      .status(healthy ? 200 : 503)
      .type("text/plain; version=0.0.4; charset=utf-8")
      .send(renderMetricsText({ app: "ok", database: databaseStatus }));
  });

  return router;
}
