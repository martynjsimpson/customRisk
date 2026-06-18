import { Router } from "express";

import {
  adminRevokeApiKeyController,
  createApiKeyController,
  listApiKeysController,
  listMyApiKeysController,
  revokeMyApiKeyController
} from "../controllers/apiKeys.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { apiKeyIdParamsSchema, createApiKeySchema } from "../validators/apiKeys.schemas.js";

/**
 * Admin router — read-only list + revoke. System Admin only.
 * Mounted at: /api/v1/admin/api-keys
 */
export function createAdminApiKeysRouter() {
  const router = Router();

  router.use(authenticate);
  router.use(requireSystemAdmin);

  router.get("/", asyncRoute(listApiKeysController));
  router.delete(
    "/:id",
    validateRequest({ params: apiKeyIdParamsSchema }),
    asyncRoute(adminRevokeApiKeyController)
  );

  return router;
}

/**
 * User self-service router — create + list + revoke own keys.
 * Mounted at: /api/v1/users/me/api-keys
 * Authentication is applied by the parent users router.
 */
export function createMyApiKeysRouter() {
  const router = Router();

  router.get("/", asyncRoute(listMyApiKeysController));
  router.post(
    "/",
    validateRequest({ body: createApiKeySchema }),
    asyncRoute(createApiKeyController)
  );
  router.delete(
    "/:id",
    validateRequest({ params: apiKeyIdParamsSchema }),
    asyncRoute(revokeMyApiKeyController)
  );

  return router;
}
