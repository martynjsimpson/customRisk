import { Router } from "express";

import {
  loginController,
  logoutController,
  meController,
  refreshController
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { loginRateLimit, refreshRateLimit } from "../middleware/rateLimit.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { loginSchema } from "../validators/auth.schemas.js";

export function createAuthRouter() {
  const router = Router();

  router.get("/me", authenticate, asyncRoute(meController));
  router.post("/login", loginRateLimit, validateRequest({ body: loginSchema }), asyncRoute(loginController));
  router.post("/refresh", refreshRateLimit, asyncRoute(refreshController));
  router.post("/logout", authenticate, asyncRoute(logoutController));

  return router;
}
