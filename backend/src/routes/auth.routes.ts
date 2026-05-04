import { Router, type RequestHandler } from "express";

import {
  loginController,
  logoutController,
  meController,
  refreshController
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { loginRateLimit, refreshRateLimit } from "../middleware/rateLimit.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { loginSchema } from "../validators/auth.schemas.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createAuthRouter() {
  const router = Router();

  router.get("/me", authenticate, asyncRoute(meController));
  router.post("/login", loginRateLimit, validateRequest({ body: loginSchema }), asyncRoute(loginController));
  router.post("/refresh", refreshRateLimit, asyncRoute(refreshController));
  router.post("/logout", authenticate, asyncRoute(logoutController));

  return router;
}
