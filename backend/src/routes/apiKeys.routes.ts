import { Router } from "express";

import {
  createApiKeyController,
  listApiKeysController,
  revokeApiKeyController
} from "../controllers/apiKeys.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { apiKeyIdParamsSchema, createApiKeySchema } from "../validators/apiKeys.schemas.js";

export function createApiKeysRouter() {
  const router = Router();

  router.use(authenticate);
  router.use(requireSystemAdmin);

  router.get("/", asyncRoute(listApiKeysController));
  router.post(
    "/",
    validateRequest({ body: createApiKeySchema }),
    asyncRoute(createApiKeyController)
  );
  router.delete(
    "/:id",
    validateRequest({ params: apiKeyIdParamsSchema }),
    asyncRoute(revokeApiKeyController)
  );

  return router;
}
