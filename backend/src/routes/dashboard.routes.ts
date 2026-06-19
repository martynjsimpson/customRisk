import { Router } from "express";

import {
  exportMyRisksController,
  getAdminSummaryController,
  getMyRisksController,
  getMyWorkController
} from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { myRisksQuerySchema } from "../validators/dashboard.schemas.js";

export function createDashboardRouter() {
  const router = Router();

  router.use(authenticate);
  router.get("/my-work", asyncRoute(getMyWorkController));
  router.get("/my-risks", validateRequest({ query: myRisksQuerySchema }), asyncRoute(getMyRisksController));
  router.get("/my-risks/export", validateRequest({ query: myRisksQuerySchema }), asyncRoute(exportMyRisksController));
  router.get("/admin-summary", asyncRoute(getAdminSummaryController));

  return router;
}
