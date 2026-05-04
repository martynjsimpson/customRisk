import { Router } from "express";

import { createAuthRouter } from "./auth.routes.js";
import { createHealthRouter } from "./health.routes.js";

export function createApiRouter() {
  const router = Router();

  router.use(createHealthRouter());
  router.use("/auth", createAuthRouter());

  return router;
}
