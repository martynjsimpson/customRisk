import { Router } from "express";

import { prisma } from "../db/prisma.js";
import { sendData } from "../utils/apiResponse.js";

export function createHealthRouter() {
  const router = Router();

  router.get("/health", async (_request, response) => {
    let databaseStatus: "ok" | "unreachable" = "ok";

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = "unreachable";
    }

    const healthy = databaseStatus === "ok";
    sendData(
      response,
      { status: healthy ? "ok" : "degraded", database: databaseStatus },
      healthy ? 200 : 503
    );
  });

  return router;
}
