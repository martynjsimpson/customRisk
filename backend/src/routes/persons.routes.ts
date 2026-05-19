import { Router } from "express";
import { z } from "zod";

import {
  listUnresolvedPersonReferencesController,
  searchPersonsController
} from "../controllers/persons.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";

export const personSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export function createPersonsRouter() {
  const router = Router();

  router.get(
    "/search",
    authenticate,
    validateRequest({ query: personSearchQuerySchema }),
    asyncRoute(searchPersonsController)
  );

  router.get(
    "/unresolved",
    authenticate,
    requireSystemAdmin,
    asyncRoute(listUnresolvedPersonReferencesController)
  );

  return router;
}
