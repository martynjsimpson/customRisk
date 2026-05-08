import { Router } from "express";

import { metricsRegistry } from "../observability/metrics.js";

export function createMetricsRouter() {
  const router = Router();

  router.get("/metrics", (_request, response) => {
    response.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    response.status(200).send(metricsRegistry.render());
  });

  return router;
}
