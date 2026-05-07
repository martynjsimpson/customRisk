import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { searchPersons } from "../services/personReference.service.js";
import { prisma } from "../db/prisma.js";
import { sendData } from "../utils/apiResponse.js";

type AsyncHandler = (request: Request<any, any, any, any>, response: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

const personSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export function createPersonsRouter() {
  const router = Router();

  router.get(
    "/search",
    authenticate,
    validateRequest({ query: personSearchQuerySchema }),
    asyncRoute(async (req, res) => {
      const { q, limit } = req.query as z.infer<typeof personSearchQuerySchema>;
      const results = await searchPersons(q, limit);
      sendData(res, results);
    })
  );

  // System Admin only: list all unresolved person references for data quality review
  router.get(
    "/unresolved",
    authenticate,
    requireSystemAdmin,
    asyncRoute(async (_req, res) => {
      const unresolved = await prisma.personReference.findMany({
        where: { userId: null },
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          ownerRisks: {
            select: {
              id: true,
              displayRiskId: true,
              title: true,
              registerId: true
            }
          },
          customFieldValues: {
            select: {
              id: true,
              riskId: true,
              customFieldDefinition: { select: { fieldName: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      sendData(res, unresolved);
    })
  );

  return router;
}
