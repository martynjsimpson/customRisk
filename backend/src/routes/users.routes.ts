import { Router } from "express";

import {
  activateUserController,
  changeMyPasswordController,
  createUserController,
  deactivateUserController,
  getMyPreferencesController,
  getUserController,
  listUsersController,
  unlockUserController,
  updateMyPreferencesController,
  updateMyProfileController,
  updateUserController
} from "../controllers/users.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { requireSystemAdmin } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  changePasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateMyProfileSchema,
  updatePreferencesSchema,
  updateUserSchema,
  userIdParamsSchema
} from "../validators/users.schemas.js";

export function createUsersRouter() {
  const router = Router();

  // Self-service /me routes — any authenticated user
  router.patch(
    "/me",
    authenticate,
    validateRequest({ body: updateMyProfileSchema }),
    asyncRoute(updateMyProfileController)
  );
  router.post(
    "/me/change-password",
    authenticate,
    validateRequest({ body: changePasswordSchema }),
    asyncRoute(changeMyPasswordController)
  );
  router.get(
    "/me/preferences",
    authenticate,
    requireFeature("userPreferences"),
    asyncRoute(getMyPreferencesController)
  );
  router.patch(
    "/me/preferences",
    authenticate,
    requireFeature("userPreferences"),
    validateRequest({ body: updatePreferencesSchema }),
    asyncRoute(updateMyPreferencesController)
  );

  // Admin-only routes
  router.use(authenticate, requireSystemAdmin);
  router.get("/", validateRequest({ query: listUsersQuerySchema }), asyncRoute(listUsersController));
  router.post("/", validateRequest({ body: createUserSchema }), asyncRoute(createUserController));
  router.post(
    "/:userId/activate",
    validateRequest({ params: userIdParamsSchema }),
    asyncRoute(activateUserController)
  );
  router.post(
    "/:userId/deactivate",
    validateRequest({ params: userIdParamsSchema }),
    asyncRoute(deactivateUserController)
  );
  router.post(
    "/:userId/unlock",
    validateRequest({ params: userIdParamsSchema }),
    asyncRoute(unlockUserController)
  );
  router.get("/:userId", validateRequest({ params: userIdParamsSchema }), asyncRoute(getUserController));
  router.patch(
    "/:userId",
    validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
    asyncRoute(updateUserController)
  );

  return router;
}
