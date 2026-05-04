import { Router } from "express";

import { createHealthRouter } from "./health.routes.js";

export function createApiRouter() {
  const router = Router();

  router.use(createHealthRouter());

  return router;
}
