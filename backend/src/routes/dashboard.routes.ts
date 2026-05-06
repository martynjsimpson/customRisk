import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";

import {
  getAdminSummaryController,
  getMyRisksController,
  getMyWorkController
} from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/authenticate.js";

type AsyncHandler = (request: Request<any, any, any, any>, response: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createDashboardRouter() {
  const router = Router();

  router.use(authenticate);
  router.get("/my-work", asyncRoute(getMyWorkController));
  router.get("/my-risks", asyncRoute(getMyRisksController));
  router.get("/admin-summary", asyncRoute(getAdminSummaryController));

  return router;
}
