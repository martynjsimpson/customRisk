import { Router } from "express";

import {
  getAdminSummaryController,
  getMyRisksController,
  getMyWorkController
} from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { asyncRoute } from "../utils/asyncRoute.js";

export function createDashboardRouter() {
  const router = Router();

  router.use(authenticate);
  router.get("/my-work", asyncRoute(getMyWorkController));
  router.get("/my-risks", asyncRoute(getMyRisksController));
  router.get("/admin-summary", asyncRoute(getAdminSummaryController));

  return router;
}
