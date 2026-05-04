import { Router } from "express";

import { createAuthRouter } from "./auth.routes.js";
import { createHealthRouter } from "./health.routes.js";
import { createUsersRouter } from "./users.routes.js";

export function createApiRouter() {
  const router = Router();

  router.use(createHealthRouter());
  router.use("/auth", createAuthRouter());
  router.use("/users", createUsersRouter());

  return router;
}
